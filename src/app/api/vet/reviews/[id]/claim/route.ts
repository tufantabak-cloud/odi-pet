import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // GÜVENLİK DÜZELTMESİ: Bu endpoint önceden `vetId`'yi doğrudan istek
  // gövdesinden alıyordu ("MOCK: Vet ID would come from session") ve hiçbir
  // rol/kimlik kontrolü yapmıyordu. `vet_reviews` RLS politikası
  // (`profile_id = auth.uid()`) UPDATE'i teknik olarak yalnızca incelemenin
  // sahibi pet owner'ına izin verse de, bu da gerçek bir yetkilendirme
  // ihlaliydi: herhangi bir giriş yapmış pet owner, kendi incelemesini
  // rastgele/uydurma bir vetId ile "veteriner onayı almış" gibi
  // işaretleyebiliyor, ve `increment_vet_load` RPC'sini var olan gerçek bir
  // veterinerin id'siyle çağırarak o veterinerin yük sayacını bozabiliyordu.
  // `public.vets` tablosunun `auth.users`/`profiles` ile hiçbir bağlantısı
  // olmadığı (repo genelinde tek kullanım yeri database.types.ts) ve bu alt
  // sistemin uçtan uca "MOCK" olarak işaretlendiği doğrulandı; bu yüzden
  // minimal ve güvenli düzeltme, en azından çağıranın gerçekten 'vet' (veya
  // 'admin'/'founder') rolüne sahip olmasını zorunlu kılmaktır.
  const vetProfile = await requireRole(['vet', 'admin', 'founder'])
  if (!vetProfile) {
    return NextResponse.json({ error: 'Forbidden: vet role required' }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const vetId = (await req.json()).vetId
  if (!vetId) {
    return NextResponse.json({ error: 'Missing vetId' }, { status: 400 })
  }

  // CLAIM MEKANİZMASI (KRİTİK) - Atomic update where status = 'pending'
  const { data, error } = await supabase
    .from('vet_reviews')
    .update({ 
      status: 'in_review',
      vet_id: vetId
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error || !data) {
    // If no data returned, it was either not found or already claimed (status != pending)
    return NextResponse.json({ error: 'Review already claimed or not found' }, { status: 409 })
  }

  // Load fix: increment load upon claim
  await supabase.rpc('increment_vet_load', { p_vet_id: vetId })

  return NextResponse.json({ success: true, data })
}
