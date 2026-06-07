import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, entryType, notes } = body

    if (!token || !entryType) {
      return NextResponse.json({ error: 'Eksik bilgi: token ve entryType zorunludur.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // 1. Token'ı doğrula ve kartı getir
    const { data: card, error: cardError } = await supabase
      .from('shared_pet_cards')
      .select('id, pet_id, can_log_entries, is_active, expires_at')
      .eq('share_token', token)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Geçersiz bağlantı.' }, { status: 401 })
    }

    if (!card.is_active || (card.expires_at && new Date(card.expires_at) < new Date())) {
      return NextResponse.json({ error: 'Bu bağlantının süresi dolmuştur, işlem yapılamaz.' }, { status: 403 })
    }

    if (!card.can_log_entries) {
      return NextResponse.json({ error: 'Bu bağlantı için seyir defteri girişi yetkisi verilmemiştir.' }, { status: 403 })
    }

    // 2. Seyir defteri girişini kaydet
    const payload = {
      shared_card_id: card.id,
      pet_id: card.pet_id,
      entry_type: entryType,
      notes: notes || null
    }

    const { error: insertError } = await supabase
      .from('caregiver_logbook_entries')
      .insert(payload)

    if (insertError) {
      console.error('[API/Logbook/Create] Insert error:', insertError)
      return NextResponse.json({ error: 'Kayıt sırasında bir hata oluştu.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('[API/Logbook/Create] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
