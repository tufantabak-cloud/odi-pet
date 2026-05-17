import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// Strictly typed event whitelist — reject everything else
const ALLOWED_EVENTS = new Set([
  'onboarding_started',
  'pet_created',
  'quick_win_seen',
  'onboarding_completed',
  'checklist_step_completed',
  'demo_enabled',
  'first_report_generated',
  'insurance_widget_viewed',
  'insurance_cta_clicked',
  'subscription_started',
  'refill_cta_click',
  // Nutrition & Marketplace
  'nutrition_profile_created',
  'feeding_logged',
  'refill_risk_triggered',
  'refill_cta_clicked',
  'refill_planner_opened',
  'refill_reminder_requested',
  'refill_reminder_snoozed',
  'refill_reminder_dismissed',
  'refill_reminder_escalated',
  'marketplace_beta_eligible',
  'marketplace_beta_clicked',
  'marketplace_waitlist_joined',
  'marketplace_waitlist_duplicate',
  'affiliate_partner_clicked',
  // Vaccine OS
  'vaccine_setup_mode_selected',
  'vaccine_schedule_generated',
  'vaccine_quick_marked',
  'vaccine_detailed_logged',
  'vaccine_logged',
  'vaccine_overdue_detected',
  'vaccine_chain_completed',
])

export async function POST(req: NextRequest) {
  // 1. Auth guard
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Payload size guard (~10 KB)
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 10_240) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  // 3. Parse body
  let body: { event?: string; payload?: unknown; ts?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, payload = {}, ts } = body

  // 4. Whitelist validation
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json(
      { error: `Unknown event "${event}". Allowed: ${[...ALLOWED_EVENTS].join(', ')}` },
      { status: 422 }
    )
  }

  // 5. Insert — no business logic here, just capture
  const supabase = await createServerSupabaseClient()
  const { error: dbErr } = await supabase.from('event_stream').insert({
    profile_id: user.id,
    event,
    payload,
    ts: ts ? new Date(ts) : new Date(),
  })

  if (dbErr) {
    console.warn('[analytics] insert failed (non-critical):', dbErr.message)
    return NextResponse.json({ success: false, warning: 'DB error (non-critical)' })
  }

  return NextResponse.json({ success: true })
}
