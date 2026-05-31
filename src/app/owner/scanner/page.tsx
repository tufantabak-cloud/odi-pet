import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScannerClient from './ScannerClient'

export default async function ScannerPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createServerSupabaseClient()

  // Kullanıcının petlerini getir
  const { data: pets, error } = await supabase
    .from('pets')
    .select('id, name, species, avatar_url')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ScannerPage] pets fetch failed:', error.message)
  }

  if (!pets || pets.length === 0) {
    redirect('/owner/pets/add')
  }

  return <ScannerClient pets={pets} />
}
