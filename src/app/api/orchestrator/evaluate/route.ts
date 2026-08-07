import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkFeatureAccess } from '@/lib/features/entitlement/engine'

// ─── Config ──────────────────────────────────────────────
// OPOS Progressive Profiling: Global ad-fatigue limit
const GLOBAL_MAX_PROMPTS_PER_DAY = 3

// ─── Request Schema ──────────────────────────────────────
const evaluateRequestSchema = z.object({
  contextTags: z.array(z.string()).default([]),
  triggerEvent: z.string().default('on_load'),
  petId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse payload
    const body = await request.json()
    const { contextTags, triggerEvent, petId } = evaluateRequestSchema.parse(body)

    // 3. Global Ad-Fatigue Check (Bypassed for emergency events)
    const isEmergency = triggerEvent === 'click_emergency_button'

    if (!isEmergency) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count: todayShownCount, error: fatigueError } = await supabase
        .from('orchestrator_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .in('event_type', ['shown', 'completed'])
        .gte('created_at', todayStart.toISOString())

      if (fatigueError) {
        console.error('[Orchestrator] Ad-fatigue query failed:', fatigueError)
      }

      if ((todayShownCount ?? 0) >= GLOBAL_MAX_PROMPTS_PER_DAY) {
        // User has reached daily prompt limit — respect their experience
        return NextResponse.json({ success: true, prompt: null, reason: 'ad_fatigue_limit' })
      }
    }

    // 4. Fetch active campaigns with prompts
    const now = new Date().toISOString()
    const { data: campaigns, error: campaignsError } = await supabase
      .from('orchestrator_campaigns')
      .select(`
        id,
        name,
        base_priority,
        target_segment_rules,
        trigger_events,
        cooldown_rules,
        orchestrator_prompts (
          id,
          component_name,
          display_type,
          ui_config
        )
      `)
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)

    if (campaignsError) throw campaignsError

    // 5. Fetch profile to verify if address/phone is actually saved in DB (SSOT check) & premium status
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('city, phone, emergency_contact_phone')
      .eq('id', user.id)
      .single()

    const hasSavedAddress = Boolean(userProfile?.city && (userProfile?.phone || userProfile?.emergency_contact_phone))

    // 6. Fetch user's recent analytics for cooldown checks
    // Calculate dynamic lookback window based on max cooldown of active campaigns
    const maxCooldownHours = Math.max(168, ...(campaigns || []).map(c => {
      const rules = c.cooldown_rules as { cooldown_hours?: number } | null
      return rules?.cooldown_hours ?? 24
    }))
    
    const dynamicLookbackDate = new Date(Date.now() - maxCooldownHours * 60 * 60 * 1000).toISOString()

    const { data: recentAnalytics, error: analyticsError } = await supabase
      .from('orchestrator_analytics')
      .select('campaign_id, event_type, created_at')
      .eq('profile_id', user.id)
      .gte('created_at', dynamicLookbackDate)

    if (analyticsError) {
      console.error('[Orchestrator] Analytics query failed:', analyticsError)
    }

    // Tek seferlik (recurring olmayan) kampanyalarin "tamamlandi" bilgisi ZAMAN
    // PENCERESINDEN BAGIMSIZ sorgulanir. Aksi halde lookback penceresinin disinda
    // kalan eski bir 'completed' kaydi gorulmez ve kampanya tekrar gosterilir.
    const { data: completedEvents, error: completedError } = await supabase
      .from('orchestrator_analytics')
      .select('campaign_id')
      .eq('profile_id', user.id)
      .eq('event_type', 'completed')

    if (completedError) {
      console.error('[Orchestrator] Completed-events query failed:', completedError)
    }

    // Build a map of campaign_id -> latest interaction timestamp for cooldown events ONLY
    const campaignLastSeen = new Map<string, Date>()
    const campaignCompleted = new Set<string>()

    for (const event of completedEvents || []) {
      if (event.campaign_id) campaignCompleted.add(event.campaign_id)
    }

    for (const event of recentAnalytics || []) {
      if (!event.campaign_id) continue

      const eventDate = new Date(event.created_at)

      // Cooldown YALNIZCA kullanicinin gercek etkilesimlerinden baslar.
      // 'shown' (gorup dokunmama) cooldown baslatmaz.
      if (['completed', 'dismissed', 'snoozed'].includes(event.event_type)) {
        const existing = campaignLastSeen.get(event.campaign_id)
        if (!existing || eventDate > existing) {
          campaignLastSeen.set(event.campaign_id, eventDate)
        }
      }
    }

    // Evaluate declarative requirements context before loop if needed
    // e.g., if any campaign needs gallery_quota_available or no_gallery_photo_in_days
    let galleryPhotoCount: number | null = null
    let latestGrowthPhotoDate: Date | null = null

    // Helper to fetch gallery data lazily
    const ensureGalleryData = async () => {
      if (!petId) return
      if (galleryPhotoCount !== null) return

      const { count, error: countErr } = await supabase
        .from('pet_gallery')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId)

      if (!countErr) {
        galleryPhotoCount = count ?? 0
      }

      // NOT: Postgres'te "ORDER BY x DESC" varsayilani NULLS FIRST'tur.
      // taken_at NULL olan satirlar once gelip "hic fotograf yok" yanilgisina
      // yol actigi icin NULL kayitlar sorgudan haric tutulur.
      const { data: latestPhoto, error: latestErr } = await supabase
        .from('pet_gallery')
        .select('taken_at')
        .eq('pet_id', petId)
        .eq('category', 'growth_timeline')
        .not('taken_at', 'is', null)
        .order('taken_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!latestErr && latestPhoto?.taken_at) {
        latestGrowthPhotoDate = new Date(latestPhoto.taken_at)
      } else {
        latestGrowthPhotoDate = null // explicitly null so we don't re-fetch
      }
    }

    // 7. Rule Engine: Tag matching + Cooldown filtering + Scoring
    let bestCampaign: (typeof campaigns extends (infer T)[] | null ? T : never) | null = null
    let maxScore = -1

    for (const campaign of campaigns || []) {
      // Trigger matching
      const triggers = campaign.trigger_events || []
      if (triggers.length === 0 && triggerEvent !== 'on_load') continue
      if (triggers.length > 0 && !triggers.includes(triggerEvent)) continue

      const isEmergencyCampaign = triggers.includes('click_emergency_button')
      const rules = campaign.target_segment_rules as { target_tags?: string[], requires?: any } | null
      const cooldownRules = campaign.cooldown_rules as { cooldown_hours?: number, recurring?: boolean } | null

      // Skip campaigns already completed by this user
      // UNLESS it's an emergency campaign with missing address OR it's a recurring campaign
      if (campaignCompleted.has(campaign.id)) {
        if (!isEmergencyCampaign || hasSavedAddress) {
          if (!cooldownRules?.recurring) {
            continue
          }
        }
      }

      // Tag matching (AND logic)
      const targetTags = rules?.target_tags || []
      const isMatch = targetTags.length === 0 || targetTags.every((tag: string) => contextTags.includes(tag))
      if (!isMatch) continue

      // Declarative requires matching
      if (rules?.requires) {
        if (!petId) continue // If petId is missing, requirements cannot be evaluated

        await ensureGalleryData()

        if (rules.requires.gallery_quota_available === true) {
          const access = await checkFeatureAccess({ userId: user.id, featureKey: 'gallery_capacity' })
          if (!access.allowed) {
            continue
          }
        }

        if (rules.requires.no_gallery_photo_in_days && typeof rules.requires.no_gallery_photo_in_days === 'number') {
          if (latestGrowthPhotoDate) {
            const daysSinceLatest = (Date.now() - (latestGrowthPhotoDate as Date | null)!.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceLatest < rules.requires.no_gallery_photo_in_days) {
              continue
            }
          }
        }
      }

      // Per-campaign cooldown check (bypassed if emergency campaign and address is missing)
      if (!isEmergencyCampaign || hasSavedAddress) {
        const cooldownHours = cooldownRules?.cooldown_hours ?? 24
        const lastSeen = campaignLastSeen.get(campaign.id)
        if (lastSeen) {
          const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastSeen < cooldownHours) continue // Still in cooldown
        }
      }

      // Score — higher base_priority wins
      const score = campaign.base_priority
      if (score > maxScore) {
        maxScore = score
        bestCampaign = campaign
      }
    }

    // 8. Return the winning prompt (if any)
    if (bestCampaign && bestCampaign.orchestrator_prompts && bestCampaign.orchestrator_prompts.length > 0) {
      const prompt = bestCampaign.orchestrator_prompts[0]

      // Log 'shown' event for analytics funnel
      await supabase
        .from('orchestrator_analytics')
        .insert({
          campaign_id: bestCampaign.id,
          prompt_id: prompt.id,
          profile_id: user.id,
          event_type: 'shown',
        })
        .then(({ error: logError }) => {
          if (logError) console.error('[Orchestrator] Failed to log shown event:', logError)
        })

      return NextResponse.json({
        success: true,
        campaign_id: bestCampaign.id,
        prompt: {
          id: prompt.id,
          component_name: prompt.component_name,
          display_type: prompt.display_type,
          ui_config: prompt.ui_config
        }
      })
    }

    return NextResponse.json({ success: true, prompt: null })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Orchestrator Evaluate Error]', error)
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
