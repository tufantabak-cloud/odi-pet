import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { computeInsuranceEligibility } from '@/lib/insurance/eligibility-engine'

export async function GET(req: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { petId } = await params
  const force = req.nextUrl.searchParams.get('force') === 'true'

  // Plan gate — free gets teaser only
  const { data: sub } = await supabase.from('user_subscriptions').select('plan').eq('profile_id', user.id).single()
  const plan = sub?.plan ?? 'free'
  if (plan === 'free') {
    return NextResponse.json({ locked: true, plan, message: 'Insurance Readiness Pro plan ile açılır' })
  }

  // 30-day cache
  if (!force) {
    const { data: cached } = await supabase.from('insurance_profiles')
      .select('*').eq('pet_id', petId).single()
    if (cached && new Date(cached.next_review_at) > new Date()) {
      return NextResponse.json({ ...cached, plan, cached: true })
    }
  }

  // ── Aggregate data ──────────────────────────────────────
  const since6m = new Date(Date.now() - 180 * 86400000).toISOString()
  const since30d = new Date(Date.now() - 30  * 86400000).toISOString()
  const since12m = new Date(Date.now() - 365 * 86400000).toISOString()

  const [
    { data: pet },
    { data: vaccines },
    { data: diseases },
    { data: diseases6m },
    { data: diseases30d },
    { data: scores },
    { data: insight },
  ] = await Promise.all([
    supabase.from('pets').select('name, species, breed, birth_date, microchip_no').eq('id', petId).single(),
    supabase.from('vaccine_records').select('applied_date, vaccines(name)').eq('pet_id', petId).gte('applied_date', since12m),
    supabase.from('disease_records').select('is_chronic, severity').eq('pet_id', petId),
    supabase.from('disease_records').select('id, severity').eq('pet_id', petId).gte('diagnosis_date', since6m),
    supabase.from('disease_records').select('severity').eq('pet_id', petId).gte('diagnosis_date', since30d),
    supabase.from('daily_scores').select('score').eq('pet_id', petId).order('date', { ascending: false }).limit(30),
    supabase.from('predictive_insights').select('risk_score').eq('pet_id', petId).order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!pet) return NextResponse.json({ error: 'Pet bulunamadı' }, { status: 404 })

  // ── Derive input signals ────────────────────────────────
  const hasRabiesVaccine = (vaccines ?? []).some((v: any) =>
    v.vaccines?.name?.toLowerCase().match(/kuduz|rabies/)
  )
  const ageKnown = !!pet.birth_date
  const profileComplete = !!(pet.name && pet.species && pet.breed && pet.birth_date)
  const chronicConditionCount = (diseases ?? []).filter((d: any) => d.is_chronic).length
  const incidentCount = diseases?.length ?? 0
  const incidentCountLast6Months = diseases6m?.length ?? 0
  const recentCriticalIncident = (diseases30d ?? []).some((d: any) => d.severity === 'critical')
  const missingVaccineHistory = (vaccines?.length ?? 0) === 0

  // Care consistency: avg of last 30 daily scores
  const avgScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / scores.length)
    : 50

  // Preventive compliance: vaccinations vs expected
  const totalEvents = (vaccines?.length ?? 0) + incidentCount
  const preventiveComplianceScore = totalEvents === 0 ? 60 : Math.round(((vaccines?.length ?? 0) / Math.max(totalEvents, 1)) * 100)

  // Household reliability from latest predictive insight
  const householdReliabilityScore = insight?.risk_score != null
    ? Math.max(0, 100 - insight.risk_score)
    : 70

  // ── Run engine ──────────────────────────────────────────
  const result = computeInsuranceEligibility({
    preventiveComplianceScore,
    incidentCount,
    chronicConditionCount,
    careConsistencyScore: avgScore,
    householdReliabilityScore,
    hasRabiesVaccine,
    ageKnown,
    profileComplete,
    recentCriticalIncident,
    incidentCountLast6Months,
    missingVaccineHistory,
    petName: pet.name,
    species: pet.species,
  })

  // ── Persist / upsert ────────────────────────────────────
  const { data: saved } = await supabase.from('insurance_profiles').upsert({
    pet_id: petId,
    profile_id: user.id,
    insurance_score: result.insuranceScore,
    segment: result.segment,
    reasons: result.reasons,
    hard_flags: result.hardFlags,
    preventive_compliance_score: preventiveComplianceScore,
    incident_count: incidentCount,
    chronic_condition_count: chronicConditionCount,
    care_consistency_score: avgScore,
    household_reliability_score: householdReliabilityScore,
    computed_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  }, { onConflict: 'pet_id' }).select().single()

  return NextResponse.json({
    ...result,
    plan,
    cached: false,
    computedAt: saved?.computed_at ?? new Date().toISOString(),
    nextReviewAt: saved?.next_review_at,
    // Insurance-ready underwriting export
    underwritingData: plan === 'ai_plus' ? {
      preventiveComplianceScore,
      incidentCount,
      chronicConditionCount,
      careConsistencyScore: avgScore,
      householdReliabilityScore,
      hasRabiesVaccine,
      profileComplete,
    } : undefined,
  })
}
