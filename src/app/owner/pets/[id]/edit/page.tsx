import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditPetForm from './EditPetForm'

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Auth: simple owner_id check (always reliable)
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!pet) redirect('/owner/dashboard')

  // Fetch pet_owners separately (non-blocking — table may not exist yet)
  const { data: petOwners } = await supabase
    .from('pet_owners')
    .select('profile_id, role, profiles(first_name, last_name)')
    .eq('pet_id', id)

  const petWithOwners = { ...pet, pet_owners: petOwners ?? [] }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <EditPetForm pet={petWithOwners} />
    </div>
  )
}

