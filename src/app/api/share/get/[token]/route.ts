import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  if (!token) {
    return NextResponse.json({ error: 'Token bulunamadı.' }, { status: 400 })
  }

  try {
    // Admin client kullanıyoruz çünkü anonim bakıcılar RLS engeline takılmadan veriyi okuyabilmeli
    // Token, doğrulama aracı olarak görev yapıyor.
    const supabase = createAdminSupabaseClient()

    // 1. Token'a sahip kartı bul
    const { data: card, error: cardError } = await supabase
      .from('shared_pet_cards')
      .select('*, pets(*), profiles!shared_pet_cards_owner_user_id_fkey(full_name, phone)')
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (cardError || !card) {
      console.error('[API/Share/Get] Card fetch error:', cardError)
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı.' }, { status: 404 })
    }

    // 2. Süre kontrolü
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      // Eğer süresi dolmuşsa ama hala is_active = true kalmışsa (cron gecikmesi vb.) erişimi reddet
      return NextResponse.json({ error: 'Bu bağlantının süresi dolmuştur.' }, { status: 403 })
    }

    // 3. Veriyi dön (Pet bilgisi ve gerekli kısımlar)
    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        accessType: card.access_type,
        expiresAt: card.expires_at,
        canLogEntries: card.can_log_entries,
        customNotes: card.caregiver_custom_notes
      },
      pet: card.pets,
      owner: card.profiles
    })

  } catch (error: any) {
    console.error('[API/Share/Get] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
