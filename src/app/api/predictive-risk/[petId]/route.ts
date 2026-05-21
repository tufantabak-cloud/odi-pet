import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { checkSubscription } from '@/lib/subscription/check'

const generateReason = (metrics: {
  overdueCount: number, postponeCount: number, inactiveDays: number,
  lowScoreDays: number, waterLowDays: number, nutritionMissedDays: number,
  // Household signals
  unassignedCritical: number, acceptanceRate: number,
  declineRate: number, reassignmentCount: number, overloadedMember: boolean
}) => {
  const rules = [
    {
      check: () => metrics.unassignedCritical >= 1,
      output: () => ({
        reasonCode: 'UNASSIGNED_CRITICAL',
        message: `${metrics.unassignedCritical} kritik görev sahipsiz. Hemen atayın.`,
        action: 'open_calendar', priority: 110
      })
    },
    {
      check: () => metrics.overdueCount >= 1,
      output: () => ({
        reasonCode: 'OVERDUE_TASK',
        message: `${metrics.overdueCount} görev gecikti. Hemen tamamla.`,
        action: 'open_health', priority: 100
      })
    },
    {
      check: () => metrics.declineRate >= 0.5 && metrics.declineRate < 1,
      output: () => ({
        reasonCode: 'HIGH_DECLINE_RATE',
        message: 'Görevler düzenli reddediliyor. Bakım sahipliği zayıf.',
        action: 'open_calendar', priority: 98
      })
    },
    {
      check: () => metrics.overloadedMember,
      output: () => ({
        reasonCode: 'OVERLOADED_MEMBER',
        message: 'Bakım yükü tek kişide toplanmış. Tek hata noktası riski.',
        action: 'open_calendar', priority: 95
      })
    },
    {
      check: () => metrics.waterLowDays >= 3,
      output: () => ({
        reasonCode: 'WATER_LOW',
        message: '3 gündür su tüketimi düşük. Dehidrasyon riski.',
        action: 'open_nutrition', priority: 93
      })
    },
    {
      check: () => metrics.nutritionMissedDays >= 3,
      output: () => ({
        reasonCode: 'NUTRITION_MISSED',
        message: '3 gündür mama girişi yok. Beslenme riskli.',
        action: 'open_nutrition', priority: 92
      })
    },
    {
      check: () => metrics.acceptanceRate < 0.4 && metrics.acceptanceRate > 0,
      output: () => ({
        reasonCode: 'LOW_ACCEPTANCE_RATE',
        message: 'Atanan görevlerin çoğu kabul edilmiyor. Bakım sistemi kırılıyor.',
        action: 'open_calendar', priority: 90
      })
    },
    {
      check: () => metrics.reassignmentCount >= 2,
      output: () => ({
        reasonCode: 'FREQUENT_REASSIGNMENT',
        message: 'Görevler sürekli el değiştiriyor. Sorumluluk belirsizliği var.',
        action: 'open_calendar', priority: 88
      })
    },
    {
      check: () => metrics.postponeCount >= 2,
      output: () => ({
        reasonCode: 'POSTPONE_PATTERN',
        message: 'Görevler sürekli erteleniyor. Rutin bozuluyor.',
        action: 'review_tasks', priority: 85
      })
    },
    {
      check: () => metrics.inactiveDays >= 2,
      output: () => ({
        reasonCode: 'INACTIVITY',
        message: `${metrics.inactiveDays} gündür işlem yok. Bakım aksıyor olabilir.`,
        action: 'open_dashboard', priority: 80
      })
    },
    {
      check: () => metrics.lowScoreDays >= 2,
      output: () => ({
        reasonCode: 'LOW_SCORE_TREND',
        message: 'Bakım puanı son günlerde düşük. İyileştirme gerekli.',
        action: 'improve_care', priority: 70
      })
    }
  ]

  for (const rule of rules) {
    if (rule.check()) return rule.output()
  }

  return {
    reasonCode: 'ALL_GOOD',
    message: 'Her şey yolunda. Rutin devam ediyor.',
    action: 'none', priority: 10
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { petId } = await params
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'


  const { data: subData } = await supabase.from('user_subscriptions').select('plan').eq('profile_id', user.id).single()
  const isPremium = subData?.plan === 'pro' || subData?.plan === 'ai_plus'
  const isAIPlus = subData?.plan === 'ai_plus'

  // Helper to fetch vet status
  const fetchVetStatus = async (riskId: string) => {
    const { data: review } = await supabase.from('vet_reviews').select('status, created_at, claimed_at').eq('risk_id', riskId).single()
    if (!review) return { vetReviewStatus: 'none', vetName: null, reviewCreatedAt: null, reviewClaimedAt: null }
    if (review.status === 'pending' || review.status === 'in_review') {
      return { vetReviewStatus: review.status, vetName: null, reviewCreatedAt: review.created_at, reviewClaimedAt: review.claimed_at }
    }
    
    const { data: verif } = await supabase.from('vet_verifications').select('vets(name)').eq('risk_id', riskId).single()
    const vetObj = verif?.vets as any
    const vetName = Array.isArray(vetObj) ? vetObj[0]?.name : vetObj?.name
    return { vetReviewStatus: 'approved', vetName: vetName || 'Veteriner', reviewCreatedAt: review.created_at, reviewClaimedAt: review.claimed_at }
  }

  // 1. CACHE KONTROLÜ (Son 10 dakika)
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  if (!force) {
    const { data: cachedInsight } = await supabase
      .from('predictive_insights')
      .select('*')
      .eq('pet_id', petId)
      .gte('created_at', tenMinsAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cachedInsight) {
      const vetData = await fetchVetStatus(cachedInsight.id)
      return NextResponse.json({ ...cachedInsight, isPremium, isAIPlus, ...vetData })
    }
  }

  // 2. VERİ ÇEK (Schedules & Scores & Nutrition & Assignment)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [schedulesRes, scoresRes, nutritionRes, assignmentRes] = await Promise.all([
    supabase.from('health_schedules').select('due_date, status, postpone_count, assignment_status, escalation_level, priority, assigned_to').eq('pet_id', petId).neq('status', 'done'),
    supabase.from('daily_scores').select('score, date, created_at').eq('pet_id', petId).order('date', { ascending: false }).limit(7),
    supabase.from('nutrition_logs').select('*').eq('pet_id', petId).gte('date', sevenDaysAgo),
    supabase.from('health_schedules').select('assignment_status, assigned_to').eq('pet_id', petId).not('assignment_status', 'eq', 'unassigned').gte('assigned_at', sevenDaysAgo)
  ])

  const schedules = schedulesRes.data || []
  const scores = scoresRes.data || []
  const nutritionLogs = nutritionRes.data || []
  const assignments = assignmentRes.data || []

  // 3. METRİKLERİ ÇIKAR
  const todayStr = new Date().toISOString().split('T')[0]
  
  let overdueCount = 0, postponeCount = 0
  for (const s of schedules) {
    if (s.due_date < todayStr) overdueCount++
    if (s.postpone_count) postponeCount += s.postpone_count
  }

  let lowScoreDays = 0
  for (const s of scores) { if (s.score < 50) lowScoreDays++ }

  let inactiveDays = 0
  if (scores.length > 0) {
    inactiveDays = Math.floor((Date.now() - new Date(scores[0].created_at).getTime()) / 86400000)
  } else { inactiveDays = 3 }

  let nutritionMissedDays = 7 - nutritionLogs.filter((l: any) => l.food_logged).length
  let waterLowDays = 7 - nutritionLogs.filter((l: any) => l.water_logged).length
  if (nutritionMissedDays < 0) nutritionMissedDays = 0
  if (waterLowDays < 0) waterLowDays = 0

  // ── Household Assignment Signals ──
  const totalAssigned = assignments.length
  const accepted  = assignments.filter((a: any) => ['accepted','completed'].includes(a.assignment_status)).length
  const declined  = assignments.filter((a: any) => a.assignment_status === 'declined').length
  const reassigned = assignments.filter((a: any) => a.assignment_status === 'reassigned').length
  const acceptanceRate = totalAssigned > 0 ? accepted / totalAssigned : 1
  const declineRate    = totalAssigned > 0 ? declined / totalAssigned : 0

  // Overloaded member: one member has >70% of all assignments
  const memberLoad: Record<string, number> = {}
  for (const a of assignments) {
    if (a.assigned_to) memberLoad[a.assigned_to] = (memberLoad[a.assigned_to] ?? 0) + 1
  }
  const maxLoad = Math.max(...Object.values(memberLoad), 0)
  const overloadedMember = totalAssigned >= 5 && maxLoad / totalAssigned > 0.7

  // Unassigned critical tasks (priority=critical, overdue, no assignee)
  const unassignedCritical = schedules.filter((s: any) =>
    s.priority === 'critical' &&
    s.due_date < todayStr &&
    (!s.assigned_to || s.assignment_status === 'unassigned')
  ).length

  // ── Household Reliability Score (0–100) ──
  const householdScore = Math.max(0, Math.min(100, Math.round(
    100
    - (overdueCount * 10)
    - ((1 - acceptanceRate) * 25)
    - (declineRate * 20)
    - (overloadedMember ? 15 : 0)
    - (unassignedCritical * 25)
    - (reassigned * 5)
  )))
  const householdLevel = householdScore >= 70 ? 'healthy' : householdScore >= 40 ? 'warning' : 'critical'

  // 4. RİSK HESAPLA (Pet + Household signals)
  const riskScore = Math.min(150,
    (overdueCount * 25) +
    (postponeCount * 8) +
    (lowScoreDays * 5) +
    (inactiveDays * 15) +
    (nutritionMissedDays * 10) +
    (waterLowDays * 8) +
    (unassignedCritical * 25) +
    (overloadedMember ? 10 : 0) +
    (Math.round((1 - acceptanceRate) * 15)) +
    (Math.round(declineRate * 10)) +
    (reassigned * 12)
  )

  // 5. LEVEL BELİRLE
  let riskLevel = 'SAFE'
  if (riskScore >= 60) riskLevel = 'CRITICAL'
  else if (riskScore >= 40) riskLevel = 'WARNING'

  // 6. REASON ÜRET (household signals dahil)
  const reasonObj = generateReason({
    overdueCount, postponeCount, inactiveDays, lowScoreDays, waterLowDays, nutritionMissedDays,
    unassignedCritical, acceptanceRate, declineRate, reassignmentCount: reassigned, overloadedMember
  })

  const insightData = {
    pet_id: petId,
    risk_score: riskScore,
    risk_level: riskLevel,
    reason_code: reasonObj.reasonCode,
    message: reasonObj.message,
    action: reasonObj.action,
    priority: reasonObj.priority,
    confidence: totalAssigned > 0 ? 0.92 : 0.85, // higher confidence with assignment data
    // Household metrics stored as JSON metadata via log
    household_score: householdScore,
    household_level: householdLevel,
  }

  // 7. KAYDET (KV / DB)
  const { data: newInsight, error } = await supabase
    .from('predictive_insights')
    .insert(insightData)
    .select('*')
    .single()

  // 8. Hata durumunda kayıt

  if (error) {
    console.error('[PredictiveEngine] Kayıt hatası:', error)
    return NextResponse.json({
      ...insightData, isPremium, isAIPlus, vetReviewStatus: 'none', vetName: null,
      householdScore, householdLevel
    })
  }

  return NextResponse.json({
    ...newInsight, isPremium, isAIPlus, vetReviewStatus: 'none', vetName: null,
    householdScore, householdLevel,
    // Smart reassignment suggestion (AI+ only)
    smartReassignment: isAIPlus && unassignedCritical > 0 ? {
      available: true,
      hint: 'Yük dağılımına göre en uygun üye Odi tarafından önerilecek.'
    } : null
  })
}
