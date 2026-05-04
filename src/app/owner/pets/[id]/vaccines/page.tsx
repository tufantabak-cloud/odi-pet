import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect, notFound } from 'next/navigation'
import VaccineOSClient from './VaccineOSClient'

export default async function VaccineOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('pet_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) notFound()

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, birth_date, avatar_url')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  const speciesCode = (pet.species || '').toLowerCase() === 'köpek' || (pet.species || '').toLowerCase() === 'dog' ? 'dog' : 'cat'

  const [setupProfileRes, vaccineRecordsRes, allTemplatesRes] = await Promise.all([
    supabase.from('vaccine_setup_profiles').select('*').eq('pet_id', id).single(),
    supabase.from('vaccine_records_v2').select('*').eq('pet_id', id).order('due_at', { ascending: true }),
    supabase.from('vaccine_templates').select('*')
      .eq('species', speciesCode)
      .or(`profile_id.eq.${user.id},profile_id.is.null`)
      .order('first_dose_week', { ascending: true }),
  ])

  const allTemplates = allTemplatesRes.data || []

  // Deduplicate: user overrides take priority over system defaults per vaccine_code+species
  const overriddenKeys = new Set(
    allTemplates.filter(t => t.profile_id !== null).map(t => `${t.species}_${t.vaccine_code}`)
  )
  const templates = allTemplates.filter(t => {
    if (t.profile_id !== null) return true
    return !overriddenKeys.has(`${t.species}_${t.vaccine_code}`)
  })

  return (
    <VaccineOSClient
      pet={pet}
      setupProfile={setupProfileRes.data ?? null}
      vaccineRecords={vaccineRecordsRes.data ?? []}
      templates={templates}
    />
  )
}
