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
    .select('id, name, species, avatar_url, birth_date, birth_date_precision')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  // Fetch plans (upcoming vaccines)
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('pet_id', id)
    .eq('category', 'asi')
    .eq('status', 'active')
    .eq('extra_data->>record_type', 'vaccine_schedule')
    .order('scheduled_at', { ascending: true })

  // Fetch vaccine records v2 (completed vaccine history)
  const { data: records } = await supabase
    .from('vaccine_records_v2')
    .select('*')
    .eq('pet_id', id)
    .not('administered_at', 'is', null)
    .neq('status', 'migrated_to_plan')
    .order('administered_at', { ascending: false })

  // Fetch setup profile
  const { data: setupProfile } = await supabase
    .from('vaccine_setup_profiles')
    .select('*')
    .eq('pet_id', id)
    .maybeSingle()

  return (
    <VaccinesClient 
      pet={pet} 
      initialPlans={plans || []} 
      initialRecords={records || []} 
      initialSetupProfile={setupProfile ?? null}
    />
  )
}
