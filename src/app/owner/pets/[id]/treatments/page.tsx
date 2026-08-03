import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'
import { redirect, notFound } from 'next/navigation'
import TreatmentsClient from './TreatmentsClient'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TreatmentsPage(props: PageProps) {
  const { id } = await props.params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  const serverSupabase = await createServerSupabaseClient()

  if (!isAdmin) {
    const canView = await hasPetCapability(serverSupabase, id, 'can_view_pet')
    if (!canView) redirect('/owner/dashboard')
  }

  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : serverSupabase

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, avatar_url')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  return <TreatmentsClient pet={pet} />
}
