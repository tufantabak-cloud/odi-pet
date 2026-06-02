import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NutritionClient from './NutritionClient'

export default async function PetNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

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
    { data: weightLogs }
  ] = await Promise.all([
    supabase.from('pets').select('id, name, avatar_url').eq('id', id).single(),
    supabase.from('pet_nutrition_profiles').select('*').eq('pet_id', id).single(),
    supabase.from('food_inventory').select('*').eq('pet_id', id).single(),
    supabase.from('feeding_logs').select('*').eq('pet_id', id).order('meal_time', { ascending: false }).limit(30),
    supabase.from('weight_logs').select('*').eq('pet_id', id).order('measured_at', { ascending: true }).limit(20)
  ])

  if (!pet) redirect('/owner/dashboard')

  return (
    <NutritionClient
      pet={pet}
      profile={nutritionProfile ?? null}
      inventory={inventory ?? null}
      feedingLogs={feedingLogs ?? []}
      weightLogs={weightLogs ?? []}
    />
  )
}
