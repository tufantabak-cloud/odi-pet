import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CareClient from './CareClient'

export default async function CarePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id: petId } = await params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  const { data: pet } = await supabase.from('pets').select('id, name, avatar_url').eq('id', petId).single()
  if (!pet) redirect('/owner/dashboard')

  // Son yapılan bakım eventleri
  const { data: recentEvents } = await supabase
    .from('care_events')
    .select('event_type, performed_at')
    .eq('pet_id', petId)
    .order('performed_at', { ascending: false })
    .limit(50)

  return <CareClient pet={pet} recentEvents={recentEvents || []} />
}
