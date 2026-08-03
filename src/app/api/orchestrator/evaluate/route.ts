import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// ─── Config ──────────────────────────────────────────────
// OPOS Progressive Profiling: Global ad-fatigue limit
const GLOBAL_MAX_PROMPTS_PER_DAY = 3

// ─── Request Schema ──────────────────────────────────────
const evaluateRequestSchema = z.object({
  contextTags: z.array(z.string()).default([]),
  triggerEvent: z.string().default('on_load'),
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
    const { contextTags, triggerEvent } = evaluateRequestSchema.parse(body)

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

    // 5. Fetch profile to verify if address/phone is actually saved in DB (SSOT check)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('city, phone, emergency_contact_phone')
      .eq('id', user.id)
      .single()

    const hasSavedAddress = Boolean(userProfile?.city && (userProfile?.phone || userProfile?.emergency_contact_phone))

    // 6. Fetch user's recent analytics for cooldown checks (last 7 days for efficiency)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentAnalytics, error: analyticsError } = await supabase
      .from('orchestrator_analytics')
      .select('campaign_id, event_type, created_at')
      .eq('profile_id', user.id)
      .gte('created_at', weekAgo)

    if (analyticsError) {
      console.error('[Orchestrator] Analytics query failed:', analyticsError)
    }

    // Build a map of campaign_id -> latest interaction timestamp
    const campaignLastSeen = new Map<string, Date>()
    const campaignCompleted = new Set<string>()
    for (const event of recentAnalytics || []) {
      if (!event.campaign_id) continue
      const eventDate = new Date(event.created_at)
      const existing = campaignLastSeen.get(event.campaign_id)
      if (!existing || eventDate > existing) {
        campaignLastSeen.set(event.campaign_id, eventDate)
      }
      if (event.event_type === 'completed') {
        campaignCompleted.add(event.campaign_id)
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

      // Skip campaigns already completed by this user (Unless emergency campaign and address is still missing in DB!)
      if (campaignCompleted.has(campaign.id)) {
        if (!isEmergencyCampaign || hasSavedAddress) {
          continue
        }
      }

      // Tag matching (AND logic)
      const rules = campaign.target_segment_rules as { target_tags?: string[] } | null
      const targetTags = rules?.target_tags || []
      const isMatch = targetTags.length === 0 || targetTags.every((tag: string) => contextTags.includes(tag))
      if (!isMatch) continue

      // Per-campaign cooldown check (bypassed if emergency campaign and address is missing)
      if (!isEmergencyCampaign || hasSavedAddress) {
        const cooldown = campaign.cooldown_rules as { cooldown_hours?: number } | null
        const cooldownHours = cooldown?.cooldown_hours ?? 24
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

    // 7. Return the winning prompt (if any)
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
