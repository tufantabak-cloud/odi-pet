import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function PetsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('pet_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .eq('status', 'active')

  if (count === 0) {
    redirect('/owner/pets/add')
  }

  redirect('/owner/dashboard')
}
