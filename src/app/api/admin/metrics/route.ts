import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

// Only admin / founder users should call this
export async function GET() {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminSupabaseClient()

  // --- Acquisition ---
  const { count: totalSignups } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true })

  const { count: petCreated } = await supabase
    .from('onboarding_progress').select('id', { count: 'exact', head: true })
    .eq('has_added_pet', true)

  const { count: onboardingComplete } = await supabase
    .from('onboarding_progress').select('id', { count: 'exact', head: true })
    .eq('wizard_completed', true)

  const { count: reportGenerated } = await supabase
    .from('onboarding_progress').select('id', { count: 'exact', head: true })
    .eq('has_generated_report', true)

  // --- TTFV (median in seconds) ---
  const { data: ttfvData } = await supabase
    .from('activation_metrics')
    .select('started_at, first_value_at')
    .not('started_at', 'is', null)
    .not('first_value_at', 'is', null)

  const ttfvValues = (ttfvData ?? []).map(r =>
    (new Date(r.first_value_at).getTime() - new Date(r.started_at).getTime()) / 1000
  ).sort((a, b) => a - b)
  const ttfvMedianSec = ttfvValues.length
    ? ttfvValues[Math.floor(ttfvValues.length / 2)]
    : null

  // --- D7 Retention (simplified: signed up 7+ days ago, had activity in last 7d) ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString()

  const { count: cohortD7 } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true })
    .lt('created_at', sevenDaysAgo)
    .gt('created_at', fourteenDaysAgo)

  const { count: retainedD7 } = await supabase
    .from('event_stream').select('profile_id', { count: 'exact', head: true })
    .gt('ts', sevenDaysAgo)
    // Only count users from that cohort (rough proxy)

  // --- Revenue: free→pro conversion ---
  const { count: proCount } = await supabase
    .from('user_subscriptions').select('id', { count: 'exact', head: true })
    .in('plan', ['pro', 'ai_plus'])

  // --- Nutrition + Vaccine OS events ---
  const { data: events } = await supabase
    .from('event_stream')
    .select('profile_id, event, ts, payload')
    .in('event', [
      'nutrition_profile_created', 'feeding_logged', 'refill_risk_triggered',
      'refill_cta_clicked', 'refill_planner_opened', 'refill_reminder_requested',
      'refill_reminder_snoozed', 'refill_reminder_dismissed', 'refill_reminder_escalated',
      'marketplace_beta_eligible', 'marketplace_beta_clicked', 'marketplace_waitlist_joined',
      'affiliate_partner_clicked',
      // Vaccine OS events
      'vaccine_setup_mode_selected', 'vaccine_schedule_generated',
      'vaccine_quick_marked', 'vaccine_detailed_logged', 'vaccine_task_completed',
      'vaccine_overdue_detected', 'vaccine_plan_reset', 'vaccine_chain_completed',
    ])

  // --- Vaccine OS DB metrics ---
  const { count: vaccineSetupCount } = await supabase
    .from('vaccine_setup_profiles').select('id', { count: 'exact', head: true })

  const { data: vaccineRecordsRaw } = await supabase
    .from('vaccine_records_v2')
    .select('pet_id, status, vaccine_code, dose_number')

  const vaccineSetupCompletedSet = new Set<string>()
  const vaccineFirstLoggedSet = new Set<string>()
  const vaccineQuickMarkSet = new Set<string>()
  const vaccineChainCompletedSet = new Set<string>()

  const nutritionProfiles = new Set<string>()
  const firstFeeders = new Set<string>()
  const refillRiskers = new Set<string>()
  
  const ctaClickers = new Set<string>()
  const plannerOpeners = new Set<string>()
  const reminderRequesters = new Set<string>()
  
  const reminderSnoozers = new Set<string>()
  const reminderDismissers = new Set<string>()
  const reminderEscalators = new Set<string>()

  const betaEligibleSet = new Set<string>()
  const betaClickedSet = new Set<string>()
  const waitlistJoinedSet = new Set<string>()
  const affiliateClickedSet = new Set<string>()

  const feeding7dCounts = new Map<string, number>()
  const sevenDaysAgoTs = new Date(Date.now() - 7 * 86400000).getTime()

  let totalFeedings7d = 0

  const partnerMetrics = new Map<string, { clicks: number, uniqueUsers: Set<string> }>()
  const brandMetrics = new Map<string, { eligible: number, clicks: number, waitlist: number, affiliate: number }>()

  if (events) {
    for (const e of events) {
      const payload = (e.payload as any) || {}
      
      if (e.event === 'nutrition_profile_created') nutritionProfiles.add(e.profile_id)
      if (e.event === 'feeding_logged') {
        firstFeeders.add(e.profile_id)
        if (new Date(e.ts).getTime() >= sevenDaysAgoTs) {
          totalFeedings7d++
          feeding7dCounts.set(e.profile_id, (feeding7dCounts.get(e.profile_id) || 0) + 1)
        }
      }
      if (e.event === 'refill_risk_triggered') refillRiskers.add(e.profile_id)
      if (e.event === 'refill_cta_clicked') ctaClickers.add(e.profile_id)
      if (e.event === 'refill_planner_opened') plannerOpeners.add(e.profile_id)
      if (e.event === 'refill_reminder_requested') reminderRequesters.add(e.profile_id)
      if (e.event === 'refill_reminder_snoozed') reminderSnoozers.add(e.profile_id)
      if (e.event === 'refill_reminder_dismissed') reminderDismissers.add(e.profile_id)
      if (e.event === 'refill_reminder_escalated') reminderEscalators.add(e.profile_id)
      
      if (e.event === 'vaccine_setup_mode_selected') vaccineSetupCompletedSet.add(e.profile_id)
      if (e.event === 'vaccine_task_completed' || e.event === 'vaccine_quick_marked' || e.event === 'vaccine_detailed_logged') {
        vaccineFirstLoggedSet.add(e.profile_id)
      }
      if (e.event === 'vaccine_quick_marked') vaccineQuickMarkSet.add(e.profile_id)
      if (e.event === 'vaccine_chain_completed') vaccineChainCompletedSet.add(e.profile_id)

      if (e.event === 'marketplace_beta_eligible') {
        betaEligibleSet.add(e.profile_id)
        if (payload.foodBrand) {
          const brand = payload.foodBrand
          const m = brandMetrics.get(brand) || { eligible: 0, clicks: 0, waitlist: 0, affiliate: 0 }
          m.eligible++
          brandMetrics.set(brand, m)
        }
      }
      if (e.event === 'marketplace_beta_clicked') {
        betaClickedSet.add(e.profile_id)
        if (payload.foodBrand) {
          const brand = payload.foodBrand
          const m = brandMetrics.get(brand) || { eligible: 0, clicks: 0, waitlist: 0, affiliate: 0 }
          m.clicks++
          brandMetrics.set(brand, m)
        }
      }
      if (e.event === 'marketplace_waitlist_joined') waitlistJoinedSet.add(e.profile_id)
      
      if (e.event === 'affiliate_partner_clicked') {
        affiliateClickedSet.add(e.profile_id)
        const partnerId = payload.partnerId || 'unknown'
        const pm = partnerMetrics.get(partnerId) || { clicks: 0, uniqueUsers: new Set() }
        pm.clicks++
        pm.uniqueUsers.add(e.profile_id)
        partnerMetrics.set(partnerId, pm)

        if (payload.foodBrand) {
          const brand = payload.foodBrand
          const bm = brandMetrics.get(brand) || { eligible: 0, clicks: 0, waitlist: 0, affiliate: 0 }
          bm.affiliate++
          brandMetrics.set(brand, bm)
        }
      }
    }
  }

  let repeatFeeders7d = 0
  for (const count of feeding7dCounts.values()) {
    if (count >= 3) repeatFeeders7d++
  }

  const { data: waitlistData } = await supabase.from('marketplace_waitlist').select('profile_id, urgency_level, preferred_food_brand')
  
  let hot = 0
  let warm = 0
  const waitlistUsers = new Set<string>()

  if (waitlistData) {
    for (const row of waitlistData) {
      waitlistUsers.add(row.profile_id)
      if (row.urgency_level === 'critical') hot++
      else if (row.urgency_level === 'warning') warm++
      else warm++

      if (row.preferred_food_brand) {
        const brand = row.preferred_food_brand
        const m = brandMetrics.get(brand) || { eligible: 0, clicks: 0, waitlist: 0, affiliate: 0 }
        m.waitlist++
        brandMetrics.set(brand, m)
      }
    }
  }

  let curious = 0
  let cold = 0
  for (const uid of betaEligibleSet) {
    if (betaClickedSet.has(uid) && !waitlistUsers.has(uid)) curious++
    if (!betaClickedSet.has(uid)) cold++
  }

  const safe = (n: number | null, d: number | null) =>
    d && d > 0 ? Math.round((n ?? 0) / d * 100) : 0

  const avgFeedingPerUser7d = feeding7dCounts.size > 0 
    ? Math.round((totalFeedings7d / feeding7dCounts.size) * 10) / 10 
    : 0

  // --- Vaccine OS KPI computation ---
  const petsWithVaccineRecords = new Set<string>()
  const petsWithOverdue = new Set<string>()
  const petsWithCompletedChain = new Set<string>() // pet has at least 3 completed vaccines
  const petCompletedCounts = new Map<string, number>()

  for (const r of vaccineRecordsRaw ?? []) {
    petsWithVaccineRecords.add(r.pet_id)
    if (r.status === 'overdue') petsWithOverdue.add(r.pet_id)
    if (r.status === 'completed') {
      petCompletedCounts.set(r.pet_id, (petCompletedCounts.get(r.pet_id) || 0) + 1)
    }
  }
  for (const [petId, count] of petCompletedCounts.entries()) {
    if (count >= 3) petsWithCompletedChain.add(petId)
  }

  const overdueRatePct = petsWithVaccineRecords.size > 0
    ? Math.round((petsWithOverdue.size / petsWithVaccineRecords.size) * 100) : 0
  const chainCompletionPct = petsWithVaccineRecords.size > 0
    ? Math.round((petsWithCompletedChain.size / petsWithVaccineRecords.size) * 100) : 0
  const quickMarkRatePct = vaccineFirstLoggedSet.size > 0
    ? Math.round((vaccineQuickMarkSet.size / vaccineFirstLoggedSet.size) * 100) : 0

  return NextResponse.json({
    acquisition: {
      signups: totalSignups ?? 0,
      petCreatedPct: safe(petCreated, totalSignups),
      onboardingPct: safe(onboardingComplete, totalSignups),
      reportPct: safe(reportGenerated, totalSignups),
    },
    activation: {
      ttfvMedianSec: ttfvMedianSec ?? null,
      onboardingCompletePct: safe(onboardingComplete, totalSignups),
    },
    retention: {
      d7: safe(retainedD7, cohortD7),
    },
    revenue: {
      freeToProPct: safe(proCount, totalSignups),
    },
    nutrition: {
      nutritionProfilePct: safe(nutritionProfiles.size, totalSignups),
      firstFeedingPct: safe(firstFeeders.size, nutritionProfiles.size),
      repeatFeedingPct: safe(repeatFeeders7d, nutritionProfiles.size),
      refillRiskPct: safe(refillRiskers.size, nutritionProfiles.size),
      avgFeedingPerUser7d,
    },
    commerce: {
      refillCtaClickPct: safe(ctaClickers.size, refillRiskers.size),
      plannerOpenPct: safe(plannerOpeners.size, ctaClickers.size),
      reminderRequestPct: safe(reminderRequesters.size, plannerOpeners.size),
    },
    reminders: {
      reminderRequestedPct: safe(reminderRequesters.size, plannerOpeners.size),
      reminderSnoozedPct: safe(reminderSnoozers.size, reminderRequesters.size),
      reminderDismissedPct: safe(reminderDismissers.size, reminderRequesters.size),
      reminderEscalatedPct: safe(reminderEscalators.size, reminderSnoozers.size),
    },
    marketplace: {
      marketplaceEligible: betaEligibleSet.size,
      marketplaceClicks: betaClickedSet.size,
      waitlistJoins: waitlistJoinedSet.size,
      affiliateClicks: affiliateClickedSet.size,
      segments: {
        hot,
        warm,
        curious,
        cold
      },
      partners: Array.from(partnerMetrics.entries()).map(([id, m]) => ({
        id,
        clicks: m.clicks,
        uniqueUsers: m.uniqueUsers.size,
        ctr: betaClickedSet.size > 0 ? Math.round((m.clicks / betaClickedSet.size) * 100) : 0
      })),
      brands: Array.from(brandMetrics.entries()).map(([name, m]) => ({
        name,
        eligible: m.eligible,
        clicks: m.clicks,
        waitlist: m.waitlist,
        affiliate: m.affiliate,
        conversion: m.clicks > 0 ? Math.round((m.waitlist / m.clicks) * 100) : 0
      }))
    },
    vaccine: {
      setupCompletedPct: safe(vaccineSetupCount, totalSignups),
      firstVaccinePct: safe(vaccineFirstLoggedSet.size, vaccineSetupCount),
      overdueRatePct,
      chainCompletionPct,
      quickMarkRatePct,
      totalPetsWithRecords: petsWithVaccineRecords.size,
      totalPetsOverdue: petsWithOverdue.size,
    }
  })
}
