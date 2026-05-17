import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

// Only admin / founder users should call this
export async function GET() {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabaseClient()

  const { data: waitlist, error } = await supabase
    .from('marketplace_waitlist')
    .select('profile_id, pet_id, preferred_food_brand, preferred_food_product, urgency_level')
    // We only export HOT and WARM leads (those who joined waitlist are basically all warm or hot)
    .in('urgency_level', ['warning', 'critical'])
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const leads = waitlist.map(row => ({
    profileId: row.profile_id,
    petId: row.pet_id,
    segment: row.urgency_level === 'critical' ? 'HOT' : 'WARM',
    foodBrand: row.preferred_food_brand,
    foodProduct: row.preferred_food_product,
    urgency: row.urgency_level
  }))

  return NextResponse.json({ leads })
}
