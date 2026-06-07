import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { petId, accessType, expiresAt, canLogEntries } = body

    if (!petId) {
      return NextResponse.json({ error: 'Pet ID zorunludur.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Benzersiz ve tahmin edilemez bir token üretelim
    const shareToken = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2, 10)

    const payload = {
      owner_user_id: user.id,
      pet_id: petId,
      share_token: shareToken,
      access_type: accessType || 'temporary',
      expires_at: expiresAt || null,
      can_log_entries: canLogEntries ?? false,
      is_active: true
    }

    const { data, error } = await supabase
      .from('shared_pet_cards')
      .insert(payload)
      .select('share_token, expires_at')
      .single()

    if (error) {
      console.error('[API/Share/Create] Insert error:', error)
      return NextResponse.json({ error: `Kayıt hatası: ${(error instanceof Error ? error.message : String(error))}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: data.share_token, expires_at: data.expires_at })

  } catch (error: unknown) {
    console.error('[API/Share/Create] Error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
