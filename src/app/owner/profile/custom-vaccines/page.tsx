import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import CustomVaccinesClient from './CustomVaccinesClient'
import { redirect } from 'next/navigation'

export default async function CustomVaccinesPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Fetch all system templates + user overrides
  const { data: allTemplates } = await supabase
    .from('vaccine_templates')
    .select('*')
    .or(`profile_id.eq.${profile.id},profile_id.is.null`)
    .order('vaccine_name', { ascending: true })

  const templates = allTemplates || []

  // Deduplicate: user overrides take priority over system defaults
  const overriddenCodes = new Set(
    templates.filter(t => t.profile_id !== null).map(t => `${t.species}_${t.vaccine_code}`)
  )
  const deduplicated = templates.filter(t => {
    if (t.profile_id !== null) return true
    return !overriddenCodes.has(`${t.species}_${t.vaccine_code}`)
  })

  return <CustomVaccinesClient templates={deduplicated} />
}
