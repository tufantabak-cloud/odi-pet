import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { getEntitlement } from '@/lib/subscription/entitlement'
import { revalidatePath, revalidateTag } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const citiesParam = req.nextUrl.searchParams.get('cities')
  const cities = citiesParam ? citiesParam.split(',').map(c => c.trim()) : []
  
  if (cities.length === 0) {
    return NextResponse.json({ error: 'En az bir şehir seçimi zorunludur.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Premium kontrolü
  const entitlement = await getEntitlement(user.id)

  if (!entitlement.isPremium) {
    return NextResponse.json(
      { error: 'Bu özellik premium üyelere özeldir.' },
      { status: 403 }
    )
  }

  // Sahiplik doğrulaması
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Petin kendi bilgilerini al (tür, cinsiyet, ırk)
  const { data: pet } = await supabase
    .from('pets')
    .select('species, gender, breed')
    .eq('id', id)
    .single()
    
  if (!pet || !pet.species || !pet.gender || !pet.breed) {
    return NextResponse.json({ error: 'Pet bilgileri eksik (tür, cinsiyet, ırk gerekli).' }, { status: 400 })
  }

  const oppositeGender = pet.gender === 'male' ? 'female' : 'male'

  // Zaten değerlendirilmiş (like/skip) petlerin ID'lerini al
  const { data: actedMatches } = await supabase
    .from('pet_match_likes')
    .select('to_pet_id')
    .eq('from_pet_id', id)

  const actedPetIds = actedMatches?.map(m => m.to_pet_id) || []

  // Adayları getir:
  // - Aynı tür (species)
  // - Zıt cinsiyet (gender)
  // - KESİN aynı ırk (breed) - Kullanıcı isteği
  // - Seçilen şehir (city)
  // - Daha önce değerlendirilmemiş olmalı
  // - Kişinin kendi petlerinden biri olmamalı (owner_id kontrolü, gerçi gender/breed filtresi zaten çok daraltır ama yine de)
  let query = supabase
    .from('pets')
    .select('id, name, breed, gender, city, avatar_url, birth_date, breeding_listings!inner(title, notes, requirements, status)')
    .eq('species', pet.species)
    .eq('gender', oppositeGender)
    .eq('breed', pet.breed)
    .or('is_neutered.is.null,is_neutered.eq.false')
    .in('city', cities)
    .eq('breeding_listings.status', 'active')
    .neq('id', id)
    
  if (actedPetIds.length > 0) {
    query = query.not('id', 'in', `(${actedPetIds.join(',')})`)
  }

  const { data: candidates, error } = await query.limit(20)

  if (error) {
    console.error('Match candidates error:', error)
    return NextResponse.json({ error: 'Adaylar getirilirken hata oluştu.' }, { status: 500 })
  }

  // Candidates array formatını düzenle
  const formattedCandidates = candidates?.map(c => ({
    ...c,
    breeding_listing: Array.isArray(c.breeding_listings) ? c.breeding_listings[0] : c.breeding_listings
  })) || []

  return NextResponse.json({ candidates: formattedCandidates })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // Sahiplik doğrulaması
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to_pet_id, action } = body

  if (!to_pet_id || !['like', 'skip'].includes(action)) {
    return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 })
  }

  // İşlemi kaydet (pet_match_likes)
  const { error: insertError } = await supabase
    .from('pet_match_likes')
    .upsert({
      from_pet_id: id,
      to_pet_id,
      action
    }, { onConflict: 'from_pet_id, to_pet_id' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  let isMutual = false

  // Eğer aksiyon 'like' ise, karşı tarafın da beğenip beğenmediğini kontrol et
  if (action === 'like') {
    const { data: reverseMatch } = await supabase
      .from('pet_match_likes')
      .select('action')
      .eq('from_pet_id', to_pet_id)
      .eq('to_pet_id', id)
      .eq('action', 'like')
      .maybeSingle()
      
    if (reverseMatch) {
      isMutual = true
    }
  }

  return NextResponse.json({ success: true, is_mutual: isMutual })
}
