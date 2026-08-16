import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const petId = params.id

    // Check ownership
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, owner_id')
      .eq('id', petId)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    if (pet.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString()

    // 1. meal_consumption
    const { data: meals, error: mealsError } = await supabase
      .from('meal_consumption')
      .select('grams')
      .eq('pet_id', petId)
      .is('tombstoned_at', null)
      .gte('occurred_at', startDate)

    if (mealsError) {
      console.error('Meals query error:', mealsError)
    }

    const nutritionCount = meals?.length || 0
    const nutritionGrams = meals?.reduce((acc: number, meal: { grams?: number | string | null }) => acc + (Number(meal.grams) || 0), 0) || 0

    // 2. activity_logs
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_logs')
      .select('duration_minutes')
      .eq('pet_id', petId)
      .is('tombstoned_at', null)
      .gte('occurred_at', startDate)

    if (activitiesError) {
      console.error('Activities query error:', activitiesError)
    }

    const activityMinutes = activities?.reduce((acc: number, act: { duration_minutes?: number | string | null }) => acc + (Number(act.duration_minutes) || 0), 0) || 0

    // 3. health_medication_records
    const { data: meds, error: medsError } = await supabase
      .from('health_medication_records')
      .select('id')
      .eq('pet_id', petId)
      .gte('occurred_at', startDate)

    if (medsError) {
      console.error('Meds query error:', medsError)
    }

    const medicineDoses = meds?.length || 0

    return NextResponse.json({
      nutrition: { count: nutritionCount, grams: nutritionGrams },
      activity: { minutes: activityMinutes },
      medicine: { doses: medicineDoses }
    })
  } catch (error: any) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
