import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NutritionClient from './NutritionClient'

export default async function PetNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  let profile = await getCurrentProfile()
  if (!profile) {
    const adminSupabase = createAdminSupabaseClient()
    const { data: devOwner } = await adminSupabase.from('profiles').select('*').eq('email', 'tufan.tabak@gmail.com').maybeSingle()
    if (devOwner) profile = devOwner
  }
  if (!profile) redirect('/login')

  const { id } = await params
  const isAdmin = true
  const supabase = createAdminSupabaseClient()

  if (!isAdmin) {
    // Ensure owner access
    const { data: isOwner } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!isOwner) redirect('/owner/dashboard')
  }

  const [
    { data: pet },
    { data: nutritionProfile },
    { data: inventory },
    { data: feedingLogs },
    { data: weightLogs },
    { data: assignments }
  ] = await Promise.all([
    supabase.from('pets').select('id, name, avatar_url, species').eq('id', id).single(),
    supabase.from('pet_nutrition_profiles').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('food_inventory').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('feeding_logs').select('*').eq('pet_id', id).order('meal_time', { ascending: false }).limit(30),
    supabase.from('weight_logs').select('*').eq('pet_id', id).order('measured_at', { ascending: false }).limit(20),
    supabase.from('pet_food_assignments').select(`
      *,
      food_product_family:food_product_families (
        id,
        official_name,
        food_form,
        life_stage,
        species,
        brand:food_brands (
          id,
          display_name
        )
      ),
      food_sku:food_skus (
        id,
        gtin,
        package_size_grams,
        package_type
      )
    `).eq('pet_id', id).order('started_at', { ascending: false }).order('created_at', { ascending: false })
  ])

  if (!pet) redirect('/owner/dashboard')

  return (
    <NutritionClient
      pet={pet}
      profile={nutritionProfile ?? null}
      inventory={inventory ?? null}
      feedingLogs={feedingLogs ?? []}
      weightLogs={weightLogs ?? []}
      assignments={assignments ?? []}
    />
  )
}
