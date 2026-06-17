import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

// GET: fetch completed onboarding steps
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Get demo mode and wizard completion status
  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('demo_mode, wizard_completed')
    .eq('profile_id', user.id)
    .single()

  // Get completed steps
  const { data: steps, error } = await supabase
    .from('user_onboarding_steps')
    .select('step_id')
    .eq('user_id', user.id)
    .eq('is_completed', true)

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching steps:', error)
  }

  const completedSteps = steps?.map(s => s.step_id) || []

  return NextResponse.json({
    completedSteps,
    demoMode: progress?.demo_mode || false,
    wizard_completed: progress?.wizard_completed || false
  })
}

// PATCH: update onboarding progress table (e.g. wizard_completed)
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('onboarding_progress')
    .upsert({ 
      profile_id: user.id, 
      ...body, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'profile_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: complete a step or handle demo data
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, stepId } = body
  const supabase = await createServerSupabaseClient()

  if (action === 'complete_step' && stepId) {
    const { error } = await supabase
      .from('user_onboarding_steps')
      .upsert({ 
        user_id: user.id, 
        step_id: stepId,
        is_completed: true,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, step_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // Preserve demo logic
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

