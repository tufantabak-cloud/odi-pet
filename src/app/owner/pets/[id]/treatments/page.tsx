import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect, notFound } from 'next/navigation'
import TreatmentsClient from './TreatmentsClient'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TreatmentsPage(props: PageProps) {
  const { id } = await props.params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('pet_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) notFound()

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
