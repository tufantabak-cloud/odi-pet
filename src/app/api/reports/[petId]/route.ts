import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import crypto from 'crypto'

const PLAN_GATES: Record<string, string[]> = {
  free:    ['summary'],
  pro:     ['summary', 'medical_timeline'],
  ai_plus: ['summary', 'medical_timeline', 'travel_pack'],
}

type RouteContext = {
  params: Promise<{ petId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { petId } = await context.params
  const { report_type = 'summary', date_range = 'last_12_months' } = await req.json()

  const supabase = await createServerSupabaseClient()

  // Plan gate
  const { data: sub } = await supabase.from('user_subscriptions').select('plan').eq('profile_id', user.id).single()
  const plan = sub?.plan ?? 'free'
  if (!PLAN_GATES[plan]?.includes(report_type)) {
    return NextResponse.json({ error: `Bu rapor tipi ${plan === 'free' ? 'Pro' : 'AI+'} plan gerektirir`, requiresUpgrade: true }, { status: 403 })
  }

  // Monthly limit for free
  if (plan === 'free') {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const { count } = await supabase.from('pet_reports')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .gte('created_at', monthStart.toISOString())
    if ((count ?? 0) >= 1) {
      return NextResponse.json({ error: 'Aylık 1 rapor limitine ulaştınız. Pro\'ya geçin.', requiresUpgrade: true }, { status: 429 })
    }
  }

  // Date range calc
  const rangeMap: Record<string, number> = { last_3_months: 90, last_6_months: 180, last_12_months: 365, all_time: 3650 }
  const days = rangeMap[date_range] ?? 365
  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Aggregate all data in parallel
  const [
    { data: pet },
    { data: vaccines },
    { data: diseases },
    { data: medications },
    { data: allergies },
    { data: growthRecords },
    { data: appointments },
    { data: insight },
    { data: schedules },
  ] = await Promise.all([
    supabase.from('pets').select('*, profiles!pets_owner_id_fkey(first_name, last_name, email)').eq('id', petId).single(),
    supabase.from('vaccine_records').select('*, vaccines(name, description)').eq('pet_id', petId).gte('applied_date', since).order('applied_date'),
    supabase.from('disease_records').select('*').eq('pet_id', petId).gte('diagnosis_date', since).order('diagnosis_date'),
    supabase.from('medication_records').select('*').eq('pet_id', petId).gte('start_date', since).order('start_date'),
    supabase.from('allergy_records').select('*').eq('pet_id', petId),
    supabase.from('growth_records').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }).limit(12),
    supabase.from('appointments').select('*, clinics(name, address, phone)').eq('pet_id', petId).gte('scheduled_at', since).order('scheduled_at'),
    supabase.from('predictive_insights').select('*').eq('pet_id', petId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('health_schedules').select('*').eq('pet_id', petId).neq('status', 'done').order('due_date').limit(5),
  ])

  // Build unified timeline
  const timeline = [
    ...(vaccines ?? []).map((r: any) => ({ date: r.applied_date, type: 'vaccine', icon: '💉', title: r.vaccines?.name ?? 'Aşı', detail: r.vet_name ?? '', status: 'completed' })),
    ...(diseases ?? []).map((r: any) => ({ date: r.diagnosis_date, type: 'disease', icon: '🩺', title: r.disease_name, detail: r.status ?? '', status: r.status })),
    ...(medications ?? []).map((r: any) => ({ date: r.start_date, type: 'medication', icon: '💊', title: r.medication_name, detail: r.dosage ?? '', status: r.end_date ? 'completed' : 'active' })),
    ...(appointments ?? []).map((r: any) => ({ date: r.scheduled_at?.split('T')[0], type: 'appointment', icon: '🏥', title: (r as any).clinics?.name ?? 'Randevu', detail: r.status, status: r.status })),
  ].sort((a, b) => a.date?.localeCompare(b.date ?? '') ?? 0)

  // Preventive compliance score (insurance-ready)
  const totalScheduled = (vaccines?.length ?? 0) + (appointments?.length ?? 0)
  const preventiveScore = totalScheduled === 0 ? 100 : Math.round(
    ((vaccines?.length ?? 0) / Math.max(totalScheduled, 1)) * 100
  )

  // Verification hash (tamper evidence)
  const hashInput = `${petId}:${user.id}:${report_type}:${Date.now()}`
  const verificationHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16).toUpperCase()

  // Save report record + get share token
  const { data: reportRecord } = await supabase.from('pet_reports').insert({
    pet_id: petId,
    profile_id: user.id,
    report_type,
    date_range,
    verification_hash: verificationHash,
  }).select().single()

  const reportData = {
    reportId: reportRecord?.id,
    shareToken: reportRecord?.share_token,
    verificationHash,
    generatedAt: new Date().toISOString(),
    reportType: report_type,
    dateRange: date_range,
    plan,
    // Pet dossier
    pet,
    owner: (pet as any)?.profiles,
    // Health data
    vaccines: vaccines ?? [],
    diseases: diseases ?? [],
    medications: medications ?? [],
    allergies: allergies ?? [],
    growthRecords: growthRecords ?? [],
    appointments: appointments ?? [],
    upcomingTasks: schedules ?? [],
    // Computed
    timeline,
    careScore: insight?.risk_score != null ? Math.max(0, 100 - (insight.risk_score ?? 0)) : null,
    riskLevel: insight?.risk_level ?? 'SAFE',
    riskMessage: insight?.message,
    preventiveComplianceScore: preventiveScore,
    // Insurance-ready fields
    chronicConditionCount: (diseases ?? []).filter((d: any) => d.is_chronic).length,
    incidentCount: diseases?.length ?? 0,
    annualVaccineCount: vaccines?.length ?? 0,
  }

  return NextResponse.json(reportData)
}

// GET: list reports for pet
export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { petId } = await context.params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('pet_reports')
    .select('*').eq('pet_id', petId).eq('profile_id', user.id)
    .order('created_at', { ascending: false }).limit(10)

  return NextResponse.json({ reports: data ?? [] })
}
