import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function PetsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('pets')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', profile.id)

  if (count === 0) {
    redirect('/owner/pets/add')
  }

  redirect('/owner/dashboard')
}
