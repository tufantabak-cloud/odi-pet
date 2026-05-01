import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// GET: fetch onboarding progress (upsert if missing)
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (progress) return NextResponse.json(progress)

  // Auto-create if missing (existing users pre-migration)
  const { data: fresh } = await supabase
    .from('onboarding_progress')
    .insert({ profile_id: user.id })
    .select().single()

  // Backfill from existing data
  await backfillProgress(supabase, user.id)

  return NextResponse.json(fresh)
}

// PATCH: update specific checklist step
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  // Check if all steps complete → award points
  const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() }

  // Check completion for reward
  if (body.has_generated_report) {
    const { data: prog } = await supabase.from('onboarding_progress').select('*').eq('profile_id', user.id).single()
    const allDone = prog?.has_added_pet && prog?.has_added_vaccine &&
      prog?.has_added_feeding_log && prog?.has_invited_member && body.has_generated_report

    if (allDone && !prog?.activation_points_awarded) {
      updateData.activation_points_awarded = true
      // Award 100 Care Points
      await supabase.rpc('increment_care_points', { uid: user.id, points: 100 })
    }
  }

  const { data } = await supabase
    .from('onboarding_progress')
    .upsert({ profile_id: user.id, ...updateData }, { onConflict: 'profile_id' })
    .select().single()

  return NextResponse.json(data)
}

// POST: seed demo mode data for the current user
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  const supabase = await createServerSupabaseClient()

  if (action === 'enable_demo') {
    // Check if demo pet already exists
    const { data: existing } = await supabase.from('pets')
      .select('id').eq('owner_id', user.id).eq('name', '🐾 Demo - Bella').single()

    if (!existing) {
      // Create demo pet
      const { data: demoPet } = await supabase.from('pets').insert({
        owner_id: user.id,
        name: '🐾 Demo - Bella',
        species: 'dog',
        breed: 'Golden Retriever',
        birth_date: new Date(Date.now() - 2 * 365 * 86400000).toISOString().split('T')[0],
        gender: 'female',
        weight: 28,
        is_demo: false, // Flagged but real row for full feature access
      }).select().single()

      if (demoPet) {
        const past = (d: number) => new Date(Date.now() - d * 86400000).toISOString().split('T')[0]
        const pastTs = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

        await Promise.all([
          // Overdue health task
          supabase.from('health_schedules').insert({
            pet_id: demoPet.id, owner_id: user.id,
            title: 'Yıllık Kontrol', plan_type: 'checkup',
            due_date: past(14), status: 'upcoming',
            priority: 'high', escalation_level: 'warning_2',
          }),
          // Upcoming vaccine
          supabase.from('health_schedules').insert({
            pet_id: demoPet.id, owner_id: user.id,
            title: 'Karma Aşı Hatırlatma', plan_type: 'vaccine',
            due_date: past(-7), status: 'upcoming', priority: 'high',
          }),
          // Daily score (care score)
          supabase.from('daily_scores').insert(
            Array.from({ length: 7 }, (_, i) => ({
              pet_id: demoPet.id, owner_id: user.id,
              date: past(i), score: 65 + Math.floor(Math.random() * 20),
            }))
          ),
          // Nutrition log
          supabase.from('nutrition_logs').insert(
            Array.from({ length: 5 }, (_, i) => ({
              pet_id: demoPet.id, owner_id: user.id,
              date: past(i), food_logged: true, water_logged: i < 3,
            }))
          ),
        ])
      }
    }

    await supabase.from('onboarding_progress')
      .upsert({ profile_id: user.id, demo_mode: true }, { onConflict: 'profile_id' })

    return NextResponse.json({ success: true, message: 'Demo modu aktif' })
  }

  if (action === 'disable_demo') {
    await supabase.from('onboarding_progress')
      .upsert({ profile_id: user.id, demo_mode: false }, { onConflict: 'profile_id' })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// Backfill progress from existing user data
async function backfillProgress(supabase: any, userId: string) {
  const [{ count: petCount }, { count: vaccineCount }, { count: nutritionCount }, { count: inviteCount }, { count: reportCount }] = await Promise.all([
    supabase.from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('vaccine_records').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('nutrition_logs').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('pet_invites').select('id', { count: 'exact', head: true }).eq('invited_by', userId),
    supabase.from('pet_reports').select('id', { count: 'exact', head: true }).eq('profile_id', userId),
  ])

  await supabase.from('onboarding_progress').upsert({
    profile_id: userId,
    has_added_pet: (petCount ?? 0) > 0,
    has_added_vaccine: (vaccineCount ?? 0) > 0,
    has_added_feeding_log: (nutritionCount ?? 0) > 0,
    has_invited_member: (inviteCount ?? 0) > 0,
    has_generated_report: (reportCount ?? 0) > 0,
    wizard_completed: (petCount ?? 0) > 0,
  }, { onConflict: 'profile_id' })
}
