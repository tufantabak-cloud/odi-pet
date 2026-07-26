import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

const createShareSchema = z.object({
  petId: z.string().uuid(),
  accessType: z.enum(['temporary', 'permanent', 'adoption']).default('temporary'),
  expiresAt: z.string().datetime().nullable().optional(),
  canLogEntries: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => null)
    const parsed = createShareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz istek parametreleri.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { petId, accessType, expiresAt, canLogEntries } = parsed.data
    const supabase = await createServerSupabaseClient()

    // 1. Kullanıcının petin sahibi olduğunu doğrula
    const { data: petOwner } = await supabase
      .from('pet_owners')
      .select('id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle()

    const { data: directPet } = await supabase
      .from('pets')
      .select('id')
      .eq('id', petId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!petOwner && !directPet) {
      return NextResponse.json(
        { error: 'Yalnızca kendinize ait petler için paylaşım bağlantısı oluşturabilirsiniz.' },
        { status: 403 }
      )
    }

    // 2. Kriptografik olarak güvenli, tahmin edilemez 64 karakter hex token üret
    const shareToken = crypto.randomBytes(32).toString('hex')

    const payload = {
      owner_user_id: user.id,
      pet_id: petId,
      share_token: shareToken,
      access_type: accessType,
      expires_at: expiresAt || null,
      can_log_entries: canLogEntries,
      is_active: true
    }

    const { data, error } = await supabase
      .from('shared_pet_cards')
      .insert(payload)
      .select('share_token, expires_at')
      .single()

    if (error) {
      console.error('[API/Share/Create] Insert error:', error.message)
      return NextResponse.json({ error: 'Paylaşım kartı oluşturulurken veritabanı hatası oluştu.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: data.share_token, expires_at: data.expires_at })

  } catch (error: unknown) {
    console.error('[API/Share/Create] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}

