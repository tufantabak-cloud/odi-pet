import React from 'react'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditPetForm from './EditPetForm'
import FloatingSOS from '@/components/FloatingSOS'

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  // Auth: simple owner_id check (bypassed for admins/founders)
  let petQuery = supabase.from('pets').select('*').eq('id', id)
  if (!isAdmin) {
    petQuery = petQuery.eq('owner_id', profile.id)
  }
  const { data: pet } = await petQuery.single()

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
        <EditPetForm pet={petWithOwners} />
      </React.Suspense>
      
      {/* Floating SOS Button */}
      <div className="fixed bottom-24 right-4 z-[90]">
        <FloatingSOS
          petId={pet.id}
          petName={pet.name}
          vetPhone={pet.vet_phone}
          vetName={pet.vet_name}
          sosContacts={pet.sos_contacts}
        />
      </div>
    </div>
  )
}

