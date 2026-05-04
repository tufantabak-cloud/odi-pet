import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Escape ICS text values
function icsEscape(s: string) {
  return s.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n')
}

// Format date to ICS YYYYMMDD or YYYYMMDDTHHMMSSZ
function icsDate(d: string | Date, allDay = true) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (allDay) return date.toISOString().replace(/-/g, '').split('T')[0]
  return date.toISOString().replace(/[-:]/g, '').replace('.000', '')
}

function buildEvent(opts: {
  uid: string; summary: string; description: string
  date: string; allDay?: boolean; priority?: string
  url?: string; categories?: string
}) {
  const prio = opts.priority === 'critical' ? '1' : opts.priority === 'high' ? '3' : '5'
  const stamp = icsDate(new Date(), false)
  const lines = [
    'BEGIN:VEVENT',
    `UID:${opts.uid}@odi.pet`,
    `DTSTAMP:${stamp}`,
    opts.allDay !== false
      ? `DTSTART;VALUE=DATE:${icsDate(opts.date)}`
      : `DTSTART:${icsDate(opts.date, false)}`,
    `SUMMARY:${icsEscape(opts.summary)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    `PRIORITY:${prio}`,
    `CATEGORIES:${opts.categories ?? 'ODI'}`,
    opts.url ? `URL:${opts.url}` : '',
    'END:VEVENT',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  // No auth header — token IS the credential
  const supabase = await createServerSupabaseClient()

  // 1. Validate token
  const { data: feed } = await supabase
    .from('calendar_feed_tokens')
    .select('*, profiles(id)')
    .eq('token', token)
    .single()

  if (!feed) {
    return new NextResponse('Invalid feed token', { status: 404, headers: { 'Content-Type': 'text/plain' } })
  }

  const profileId = feed.profile_id
  const filters: Record<string, boolean> = feed.filters ?? {}
  const daysAhead = feed.days_ahead ?? 30
  const scope = feed.scope ?? 'assigned'

  // Update last_fetched_at (fire-and-forget)
  supabase.from('calendar_feed_tokens')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('token', token)
    .then(() => {})

  // 2. Get plan for scope enforcement
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan')
    .eq('profile_id', profileId)
    .single()
  const plan = sub?.plan ?? 'free'

  // Plan limits
  const effectiveDays = plan === 'free' ? 7 : daysAhead
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + effectiveDays * 86400000).toISOString().split('T')[0]

  // 3. Fetch events
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Get all pet IDs user has access to
  const [{ data: memberPets }, { data: ownedPets }] = await Promise.all([
    supabase.from('pet_members').select('pet_id, pets(name)').eq('profile_id', profileId),
    supabase.from('pets').select('id, name').eq('owner_id', profileId),
  ])

  const allPetIds = [...new Set([
    ...(memberPets?.map(m => m.pet_id) ?? []),
    ...(ownedPets?.map(p => p.id) ?? []),
  ])]

  if (allPetIds.length === 0) {
    return buildICS([], appUrl, plan)
  }

  const petsMap: Record<string, string> = {}
  for (const p of ownedPets ?? []) petsMap[p.id] = p.name
  for (const m of memberPets ?? []) {
    if (m.pet_id && (m as any).pets?.name) petsMap[m.pet_id] = (m as any).pets.name
  }

  // Build schedule query
  let schedQ = supabase
    .from('health_schedules')
    .select('id, pet_id, title, due_date, plan_type, priority, status, escalation_level, assigned_to, vaccines(name)')
    .in('pet_id', allPetIds)
    .neq('status', 'done')
    .gte('due_date', from)
    .lte('due_date', to)

  // Scope filtering
  if (scope === 'assigned') schedQ = schedQ.eq('assigned_to', profileId)
  if (scope === 'critical_only' || plan === 'ai_plus' && scope === 'critical_only') {
    schedQ = schedQ.eq('escalation_level', 'critical')
  }

  const [{ data: schedules }, { data: appointments }] = await Promise.all([
    schedQ,
    supabase.from('appointments')
      .select('id, pet_id, scheduled_at, status, clinics(name)')
      .in('pet_id', allPetIds)
      .gte('scheduled_at', from + 'T00:00:00')
      .lte('scheduled_at', to + 'T23:59:59'),
  ])

  const TYPE_ICONS: Record<string, string> = {
    vaccine: '💉', medication: '💊', grooming: '✂️',
    checkup: '🩺', appointment: '🏥', task: '📋',
  }

  const events: string[] = []

  // Health schedules → ICS events
  for (const s of schedules ?? []) {
    if (!filters[s.plan_type ?? 'task']) continue
    if (plan === 'free' && s.priority === 'low') continue // free: skip low priority

    const petName = petsMap[s.pet_id] ?? 'Pet'
    const icon = TYPE_ICONS[s.plan_type] ?? '📋'
    const title = s.title || (s as any).vaccines?.name || 'Bakım Görevi'
    const esc = s.escalation_level !== 'none' ? ` [${s.escalation_level?.toUpperCase()}]` : ''

    events.push(buildEvent({
      uid: `task-${s.id}`,
      summary: `${icon} ${title} — ${petName}${esc}`,
      description: `Pet: ${petName}\nGörev: ${title}\nDurum: ${s.status}\nODI'de görüntüle: ${appUrl}/owner/pets/${s.pet_id}`,
      date: s.due_date,
      priority: s.priority ?? 'normal',
      url: `${appUrl}/owner/pets/${s.pet_id}`,
      categories: 'ODI,PET CARE',
    }))
  }

  // Appointments → ICS events
  if (filters.appointments !== false) {
    for (const a of appointments ?? []) {
      const petName = petsMap[a.pet_id] ?? 'Pet'
      events.push(buildEvent({
        uid: `apt-${a.id}`,
        summary: `🏥 ${(a as any).clinics?.name ?? 'Veteriner Randevu'} — ${petName}`,
        description: `Pet: ${petName}\nKlinik: ${(a as any).clinics?.name ?? '—'}\nODI'de görüntüle: ${appUrl}/owner/pets/${a.pet_id}`,
        date: a.scheduled_at,
        allDay: false,
        priority: 'high',
        url: `${appUrl}/owner/pets/${a.pet_id}`,
        categories: 'ODI,VET',
      }))
    }
  }

  // AI+ predictive alerts as calendar blocks
  if (plan === 'ai_plus' && scope !== 'assigned') {
    const { data: insights } = await supabase
      .from('predictive_insights')
      .select('pet_id, risk_level, message, created_at')
      .eq('risk_level', 'CRITICAL')
      .in('pet_id', allPetIds)
      .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())

    for (const ins of insights ?? []) {
      events.push(buildEvent({
        uid: `risk-${ins.pet_id}-${ins.created_at}`,
        summary: `⚠️ ODI Risk Alert — ${petsMap[ins.pet_id] ?? 'Pet'}`,
        description: ins.message,
        date: new Date().toISOString().split('T')[0],
        priority: 'critical',
        categories: 'ODI,RISK',
      }))
    }
  }

  return buildICS(events, appUrl, plan)
}

function buildICS(events: string[], appUrl: string, plan: string) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Odi Pet Care//Calendar Feed//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:ODI Pet Care${plan !== 'free' ? ' (' + plan.toUpperCase() + ')' : ''}`,
    'X-WR-TIMEZONE:Europe/Istanbul',
    'X-WR-CALDESC:Evcil hayvan bakım görevleri ve randevuları',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="odi-calendar.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
