import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params

  if (!token) {
    return NextResponse.json({ error: 'Token bulunamadı.' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()

    // 1. Token'a sahip kartı bul - Sadece güvenli halka açık alanları çek
    const { data: card, error: cardError } = await supabase
      .from('shared_pet_cards')
      .select(`
        id,
        access_type,
        expires_at,
        can_log_entries,
        caregiver_custom_notes,
        is_active,
        pets (
          name,
          species,
          breed,
          avatar_url,
          vet_name,
          vet_phone
        ),
        profiles!shared_pet_cards_owner_user_id_fkey (
          full_name,
          phone
        )
      `)
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı.' }, { status: 404 })
    }

    // 2. Süre kontrolü
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Bu bağlantının süresi dolmuştur.' }, { status: 403 })
    }

    // 3. Yalnızca izin verilen güvenli verileri dön
    const petData = Array.isArray(card.pets) ? card.pets[0] : card.pets
    const ownerData = Array.isArray(card.profiles) ? card.profiles[0] : card.profiles

    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        accessType: card.access_type,
        expiresAt: card.expires_at,
        canLogEntries: card.can_log_entries,
        customNotes: card.caregiver_custom_notes
      },
      pet: petData ? {
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        avatar_url: petData.avatar_url,
        vet_name: petData.vet_name,
        vet_phone: petData.vet_phone
      } : null,
      owner: ownerData ? {
        full_name: ownerData.full_name,
        phone: ownerData.phone
      } : null
    })

  } catch (error: unknown) {
    console.error('[API/Share/Get] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}

