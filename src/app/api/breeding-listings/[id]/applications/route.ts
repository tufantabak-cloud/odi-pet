import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: listing } = await supabase
    .from('breeding_listings')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!listing || listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: applications, error } = await supabase
    .from('breeding_applications')
    .select(`
      *,
      pets!applicant_pet_id (
        id, name, species, breed, birth_date, avatar_url, gender
      ),
      profiles!applicant_user_id (
        id, full_name
      )
    `)
    .eq('listing_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch applications error:', error)
    return NextResponse.json({ error: 'Başvurular getirilirken hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({ applications: applications || [] })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json()
  const { applicant_pet_id, message, kvkk_consent } = body

  if (!kvkk_consent) {
    return NextResponse.json({ error: 'KVKK onayı zorunludur.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // ── 1. İlanı sorgula (purpose, status, pet_id dahil) ──
  const { data: listing } = await supabase
    .from('breeding_listings')
    .select('user_id, title, status, purpose, pet_id')
    .eq('id', id)
    .single()

  if (!listing) return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 })

  // İlan aktiflik kontrolü
  if (listing.status !== 'active') {
    return NextResponse.json(
      { error: 'LISTING_NOT_ACTIVE', message: 'Bu ilan artık aktif değil.' },
      { status: 400 }
    )
  }

  // Kendi ilanına başvuru kontrolü
  if (listing.user_id === user.id) {
    return NextResponse.json({ error: 'Kendi ilanınıza başvuramazsınız.' }, { status: 400 })
  }

  // ── 2. Başvuran petin sahiplik kontrolü (sunucu tarafı) ──
  const { data: petOwner } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', applicant_pet_id)
    .eq('profile_id', user.id)
    .single()

  if (!petOwner) {
    return NextResponse.json({ error: 'Seçilen pet size ait değil.' }, { status: 403 })
  }

  // ── 3-5. Başvuran pet ve ilan peti bilgilerini çek ──
  const isBreeding = listing.purpose === 'breeding'

  if (isBreeding) {
    // Başvuran pet bilgileri
    const { data: applicantPetData } = await supabase
      .from('pets')
      .select('name, species, gender, is_neutered')
      .eq('id', applicant_pet_id)
      .single()

    if (!applicantPetData) {
      return NextResponse.json({ error: 'Başvuran pet bulunamadı.' }, { status: 404 })
    }

    // İlan sahibinin pet bilgileri
    const { data: listingPetData } = await supabase
      .from('pets')
      .select('species, gender')
      .eq('id', listing.pet_id)
      .single()

    if (!listingPetData) {
      return NextResponse.json({ error: 'İlan peti bulunamadı.' }, { status: 404 })
    }

    // 3. Kısırlaştırma kontrolü (sadece breeding)
    if (applicantPetData.is_neutered) {
      return NextResponse.json(
        { error: 'NEUTERED_APPLICANT_PET', message: 'Kısırlaştırılmış pet ile üreme başvurusu yapılamaz.' },
        { status: 400 }
      )
    }

    // 4. Tür uyumluluğu kontrolü (sadece breeding)
    if (listingPetData.species !== applicantPetData.species) {
      return NextResponse.json(
        { error: 'SPECIES_MISMATCH', message: 'Farklı türler arasında üreme başvurusu yapılamaz.' },
        { status: 400 }
      )
    }

    // 5. Cinsiyet uyumluluğu kontrolü (sadece breeding)
    const validGenders = ['male', 'female']
    if (!validGenders.includes(applicantPetData.gender || '') || !validGenders.includes(listingPetData.gender || '')) {
      return NextResponse.json(
        { error: 'SEX_REQUIRED', message: 'Üreme başvurusu için her iki petin de cinsiyeti belirtilmiş olmalıdır.' },
        { status: 400 }
      )
    }
    if (applicantPetData.gender === listingPetData.gender) {
      return NextResponse.json(
        { error: 'SEX_MISMATCH', message: 'Aynı cinsiyetteki petler arasında üreme başvurusu yapılamaz.' },
        { status: 400 }
      )
    }
  }

  // ── 6. Duplicate başvuru kontrolü ──
  const { data: existingApp } = await supabase
    .from('breeding_applications')
    .select('id')
    .eq('listing_id', id)
    .eq('applicant_pet_id', applicant_pet_id)
    .single()

  if (existingApp) {
    return NextResponse.json({ error: 'Bu pet ile zaten başvuru yaptınız.' }, { status: 400 })
  }

  // ── 7. Başvuruyu kaydet (user_id'leri sunucuda üret) ──
  const { error: insertError } = await supabase
    .from('breeding_applications')
    .insert({
      listing_id: id,
      applicant_pet_id,
      applicant_user_id: user.id,
      owner_user_id: listing.user_id,
      message: message || null,
      kvkk_consent: true,
      kvkk_consent_at: new Date().toISOString()
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── 8. Bildirim oluştur ──
  const { data: applicantPet } = await supabase
    .from('pets')
    .select('name')
    .eq('id', applicant_pet_id)
    .single()

  await supabase.from('notification_jobs').insert({
    user_id: listing.user_id,
    pet_id: applicant_pet_id,
    job_type: 'new_breeding_application',
    payload: { 
      listing_id: id, 
      applicant_pet_name: applicantPet?.name || 'Bir patili dost', 
      listing_title: listing.title 
    },
    scheduled_for: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}
