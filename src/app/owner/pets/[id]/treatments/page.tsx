import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
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
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  if (!isAdmin) {
    // Verify ownership
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership) notFound()
  }

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, avatar_url')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  // SADECE GÜVENLİ BİR ŞEKİLDE TABLOYU ÇEKMEYİ DENE, EĞER TABLO YOKSA BOŞ LİSTE DÖN (HATA FIRLATMA)
  let treatments = []
  try {
    const { data, error } = await supabase
      .from('health_treatments')
      .select('*')
      .eq('pet_id', id)
      .order('start_date', { ascending: false })
    
    if (!error && data) {
      treatments = data
    }
  } catch (err) {
    console.error('Tedaviler tablosu bulunamadı veya yetki hatası:', err)
  }

  return (
    <TreatmentsClient
      pet={pet}
      initialTreatments={treatments}
    />
  )
}
