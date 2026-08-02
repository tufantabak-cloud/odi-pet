import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // This is intentionally allowed without auth for SOS public link usage
  const { data, error } = await supabase
    .from('lost_reports')
    .select('*')
    .eq('pet_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  return NextResponse.json({ report: data || null })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const { last_seen_location, contact_phone, last_seen_at, city, district, province, latitude, longitude } = body
  const supabase = await createServerSupabaseClient()

  // Validation
  const loc = typeof last_seen_location === 'string' ? last_seen_location.trim() : ''
  if (!loc || loc.length < 5) {
    return NextResponse.json({ error: 'Lütfen son görülme konumunu detaylı giriniz (en az 5 karakter)' }, { status: 400 })
  }
  if (loc.length > 500) {
    return NextResponse.json({ error: 'Konum bilgisi çok uzun, en fazla 500 karakter girilebilir' }, { status: 400 })
  }

  const phone = typeof contact_phone === 'string' ? contact_phone.replace(/[\s-()]/g, '') : ''
  if (!/^\+?[0-9]{10,15}$/.test(phone)) {
    return NextResponse.json({ error: 'Lütfen geçerli bir iletişim numarası giriniz (örn: 05554443322)' }, { status: 400 })
  }

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz: Sadece pet sahibi kayıp ilanı açabilir' }, { status: 403 })
  }

  // Check if already active
  const { data: existing } = await supabase
    .from('lost_reports')
    .select('id')
    .eq('pet_id', id)
    .eq('status', 'active')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Bu pet için zaten aktif bir kayıp ilanı var' }, { status: 400 })
  }

  let validLastSeenAt = undefined
  if (last_seen_at) {
    const dateObj = new Date(last_seen_at)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Lütfen geçerli bir tarih giriniz' }, { status: 400 })
    }
    const now = new Date()
    if (dateObj > new Date(now.getTime() + 60000)) { // 1 min buffer
      return NextResponse.json({ error: 'Son görülme tarihi gelecekte olamaz' }, { status: 400 })
    }
    if (dateObj < new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())) {
      return NextResponse.json({ error: 'Son görülme tarihi 5 yıldan eski olamaz' }, { status: 400 })
    }
    validLastSeenAt = dateObj.toISOString()
  }

  const selectedProvince = province || city

  const { error } = await supabase
    .from('lost_reports')
    .insert({
      pet_id: id,
      last_seen_location: loc,
      contact_phone: phone,
      ...(selectedProvince && { province: String(selectedProvince).trim() }),
      ...(district && { district: String(district).trim() }),
      ...(validLastSeenAt && { last_seen_at: validLastSeenAt }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      status: 'active'
    })

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  if (city && typeof city === 'string') {
    await supabase.from('pets').update({ city: city.trim() }).eq('id', id)
  }

  // Çevresel Bildirim Gönderimi
  try {
    const { data: pet } = await supabase.from('pets').select('name, species, city').eq('id', id).single()
    const lostCity = pet?.city
    if (lostCity) {
      const adminSupabase = createAdminSupabaseClient()
      
      const { data: nearbyOwners } = await adminSupabase
        .from('pet_owners')
        .select('profile_id')
        .neq('profile_id', user.id)
        .in(
          'pet_id',
          (await adminSupabase
            .from('pets')
            .select('id')
            .eq('city', lostCity)
            .neq('owner_id', user.id)
          ).data?.map(p => p.id) ?? []
        )
        .limit(50)

      const uniqueProfileIds = [
        ...new Set(
          nearbyOwners?.map(o => o.profile_id).filter(Boolean) ?? []
        )
      ]

      if (uniqueProfileIds.length > 0) {
        const speciesText = pet.species === 'cat' || pet.species?.toLowerCase() === 'kedi' ? 'kedi' : 'köpek'
        await adminSupabase
          .from('notifications')
          .insert(
            uniqueProfileIds.map(profileId => ({
              profile_id: profileId,
              pet_id: id,
              title: '🚨 Yakınında Kayıp Pet Var!',
              message: `${pet.name} adlı ${speciesText} ${lostCity}'de kaybedildi. Çevrenize dikkat edin!`,
              type: 'lost_pet_nearby',
              is_read: false,
              sent_email: false
            }))
          )
      }
    }
  } catch (notifError) {
    console.error('Çevresel bildirim hatası:', notifError)
  }

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Kayıp ilanı başarıyla oluşturuldu.' })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { status } = await req.json()
  const supabase = await createServerSupabaseClient()

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 })
  }

  if (status !== 'found') {
    return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lost_reports')
    .update({ status: 'found' })
    .eq('pet_id', id)
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Petiniz bulundu olarak işaretlendi. İlan kapatıldı.' })
}
