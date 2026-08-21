import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { hasPetCapability } from '@/lib/pets/access'
import { redirect } from 'next/navigation'
import NutritionClient from './NutritionClient'

import { Suspense } from 'react'

export default async function PetNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'

  const serverSupabase = await createServerSupabaseClient()
  if (!isAdmin) {
    const canView = await hasPetCapability(serverSupabase, id, 'can_view_pet')
    if (!canView) redirect('/owner/dashboard')
  }

  const supabase = isAdmin ? createAdminSupabaseClient() : serverSupabase

  const [
    { data: pet },
    { data: nutritionProfile },
    { data: inventory },
    { data: feedingLogs },
    { data: weightLogs },
    { data: assignments },
    { data: nutritionPlans }
  ] = await Promise.all([
    supabase.from('pets').select('id, name, avatar_url, species, breed, birth_date, gender, is_neutered').eq('id', id).single(),
    supabase.from('pet_nutrition_profiles').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('food_inventory').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('feeding_logs').select('*').eq('pet_id', id).order('meal_time', { ascending: false }).limit(30),
    supabase.from('weight_logs').select('*').eq('pet_id', id).or('is_archived.is.null,is_archived.eq.false').order('measured_at', { ascending: false }).limit(20),
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
    `).eq('pet_id', id).order('started_at', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('plans').select('*').eq('pet_id', id).eq('category', 'beslenme').order('scheduled_at', { ascending: false })
  ])

  if (!pet) redirect('/owner/dashboard')

  return (
    <Suspense fallback={<div className="p-8 text-center text-text-secondary text-sm font-medium">Beslenme Modülü Yükleniyor...</div>}>
      <NutritionClient
        pet={pet}
        profile={nutritionProfile ?? null}
        inventory={inventory ?? null}
        feedingLogs={feedingLogs ?? []}
        weightLogs={weightLogs ?? []}
        assignments={assignments ?? []}
        nutritionPlans={nutritionPlans ?? []}
      />
    </Suspense>
  )
}
