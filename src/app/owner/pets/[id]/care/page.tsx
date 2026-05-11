import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CareClient from './CareClient'

export default async function CarePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  const { id: petId } = await params
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

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
