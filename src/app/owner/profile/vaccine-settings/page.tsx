import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import VaccineSettingsClient from './VaccineSettingsClient'

export default async function VaccineSettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, avatar_url')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  return <VaccineSettingsClient pets={pets ?? []} />
}
