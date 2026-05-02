import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect, notFound } from 'next/navigation'
import VaccineOSClient from './VaccineOSClient'

export default async function VaccineOSPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('pet_id')
    .eq('pet_id', params.id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) notFound()

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, birth_date, avatar_url')
    .eq('id', params.id)
    .single()

  if (!pet) notFound()

  const [setupProfileRes, vaccineRecordsRes, templatesRes] = await Promise.all([
    supabase.from('vaccine_setup_profiles').select('*').eq('pet_id', params.id).single(),
    supabase.from('vaccine_records_v2').select('*').eq('pet_id', params.id).order('due_at', { ascending: true }),
    supabase.from('vaccine_templates').select('*')
      .eq('species', pet.species === 'Köpek' ? 'dog' : 'cat')
      .eq('is_active', true)
      .order('min_age_weeks', { ascending: true }),
  ])

  return (
    <VaccineOSClient
      pet={pet}
      setupProfile={setupProfileRes.data ?? null}
      vaccineRecords={vaccineRecordsRes.data ?? []}
      templates={templatesRes.data ?? []}
    />
  )
}
