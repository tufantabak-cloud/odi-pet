import React from 'react'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { hasPetCapability } from '@/lib/pets/access'
import { redirect } from 'next/navigation'
import EditPetForm from './EditPetForm'

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'

  // Kanonik yetki: birincil sahip + ortak sahip. Ortak sahipler artık dışlanmıyor.
  const serverSupabase = await createServerSupabaseClient()
  if (!isAdmin) {
    const canEdit = await hasPetCapability(serverSupabase, id, 'can_edit_pet_profile')
    if (!canEdit) redirect('/owner/dashboard')
  }

  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : serverSupabase

  const { data: pet } = await supabase.from('pets').select('*').eq('id', id).single()

  if (!pet) redirect('/owner/dashboard')

  // Fetch pet_owners separately
  const { data: petOwners } = await supabase
    .from('pet_owners')
    .select('profile_id, role, profiles(first_name, last_name)')
    .eq('pet_id', id)

  // Fetch latest weight and height from weight_logs
  const { data: latestWeight } = await supabase
    .from('weight_logs')
    .select('weight_kg, height_cm')
    .eq('pet_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const petWithOwners = { 
    ...pet, 
    pet_owners: petOwners ?? [],
    weight_kg: latestWeight?.weight_kg ?? '',
    height_cm: latestWeight?.height_cm ?? ''
  }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <React.Suspense fallback={<div className="animate-pulse h-96 bg-bg-main rounded-2xl"></div>}>
        <EditPetForm pet={petWithOwners} ownerProfile={profile} />
      </React.Suspense>
    </div>
  )
}

