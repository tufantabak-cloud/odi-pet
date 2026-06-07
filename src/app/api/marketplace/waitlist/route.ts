import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { petId, source, preferredFoodBrand, preferredFoodProduct, urgencyLevel, notes } = body

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Insert with duplicate handling (unique constraint on profile_id + pet_id)
    const { error } = await supabase
      .from('marketplace_waitlist')
      .insert({
        profile_id: user.id,
        pet_id: petId,
        source: source || 'marketplace_beta',
        preferred_food_brand: preferredFoodBrand || null,
        preferred_food_product: preferredFoodProduct || null,
        urgency_level: urgencyLevel || null,
        notes: notes || null
      })

    if (error) {
      // 23505 is unique violation in Postgres
      if (error.code === '23505') {
        return NextResponse.json({ success: true, alreadyJoined: true })
      }
      throw error
    }

    return NextResponse.json({ success: true, alreadyJoined: false })
  } catch (error: unknown) {
    console.error('Waitlist join error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal Server Error' }, { status: 500 })
  }
}
