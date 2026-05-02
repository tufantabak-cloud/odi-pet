import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import CustomVaccinesClient from './CustomVaccinesClient'
import { redirect } from 'next/navigation'

export default async function CustomVaccinesPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()
  
  const { data: templates } = await supabase
    .from('vaccine_templates')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  return <CustomVaccinesClient templates={templates || []} />
}
