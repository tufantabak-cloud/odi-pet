import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NutritionClient from './NutritionClient'

export default async function PetNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  const { id } = await params
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Ensure owner access
  const { data: isOwner } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!isOwner) redirect('/owner/pets')

  const [
    { data: pet },
    { data: profile },
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

  if (!pet) redirect('/owner/pets')

  return (
    <NutritionClient
      pet={pet}
      profile={profile ?? null}
      inventory={inventory ?? null}
      feedingLogs={feedingLogs ?? []}
      weightLogs={weightLogs ?? []}
    />
  )
}
