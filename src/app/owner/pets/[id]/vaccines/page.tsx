import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect, notFound } from 'next/navigation'
import VaccinesClient from './VaccinesClient'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetVaccinesPage(props: PageProps) {
  const { id } = await props.params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  if (!isAdmin) {
    // Verify ownership
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership) notFound()
  }

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, avatar_url')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  // Fetch plans (upcoming vaccines)
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('pet_id', id)
    .eq('category', 'asi')
    .order('scheduled_at')

  // Fetch vaccine records v2 (completed vaccine history)
  const { data: records } = await supabase
    .from('vaccine_records_v2')
    .select('*')
    .eq('pet_id', id)
    .order('administered_at', { ascending: false })

  return (
    <VaccinesClient 
      pet={pet} 
      initialPlans={plans || []} 
      initialRecords={records || []} 
    />
  )
}
