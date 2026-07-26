import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getIP, logbookRateLimit } from '@/lib/auth-security'

const createLogbookSchema = z.object({
  token: z.string().min(10).max(128).regex(/^[A-Za-z0-9_-]+$/),
  entryType: z.string().min(1).max(64),
  notes: z.string().max(1000).nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req)
    const body = await req.json().catch(() => null)
    const parsed = createLogbookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz veri: token, entryType ve en fazla 1000 karakterlik not kabul edilir.' }, { status: 400 })
    }

    const { token, entryType, notes } = parsed.data
    const { success: withinLimit } = await logbookRateLimit.limit(`logbook:${token}:${ip}`)
    if (!withinLimit) {
      return NextResponse.json({ error: 'Çok fazla seyir defteri girişi yapıldı. Lütfen biraz bekleyin.' }, { status: 429 })
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
      notes: notes ? notes.trim() : null
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

