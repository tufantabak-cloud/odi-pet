import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: reportId } = await context.params

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const finderName = typeof body.finder_name === 'string' ? body.finder_name.trim() : ''
  const finderPhone = typeof body.finder_phone === 'string' ? body.finder_phone.trim() : ''
  const foundLocation = typeof body.found_location === 'string' ? body.found_location.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  // Validasyon
  if (!finderName || finderName.length < 2) {
    return NextResponse.json({ error: 'Lütfen adınızı giriniz (en az 2 karakter).' }, { status: 400 })
  }
  if (finderName.length > 100) {
    return NextResponse.json({ error: 'Ad çok uzun, en fazla 100 karakter.' }, { status: 400 })
  }
  if (finderPhone && !/^\+?[0-9\s\-()]{7,20}$/.test(finderPhone)) {
    return NextResponse.json({ error: 'Lütfen geçerli bir telefon numarası giriniz.' }, { status: 400 })
  }
  if (foundLocation.length > 500) {
    return NextResponse.json({ error: 'Konum bilgisi çok uzun, en fazla 500 karakter.' }, { status: 400 })
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: 'Mesaj çok uzun, en fazla 1000 karakter.' }, { status: 400 })
  }

  // Giriş yapılmış kullanıcı varsa al (opsiyonel — anonim da mümkün)
  let finderUserId: string | null = null
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) finderUserId = session.user.id
  } catch {
    // Auth hatası kritik değil, devam et
  }

  const adminSupabase = createAdminSupabaseClient()

  // İlanın var ve aktif olduğunu doğrula
  const { data: report, error: reportError } = await adminSupabase
    .from('lost_reports')
    .select(`
      id,
      pet_id,
      status,
      contact_phone,
      pets (
        id,
        name,
        species,
        owner_id
      )
    `)
    .eq('id', reportId)
    .eq('status', 'active')
    .single()

  if (reportError || !report) {
    return NextResponse.json(
      { error: 'Kayıp ilanı bulunamadı veya artık aktif değil.' },
      { status: 404 }
    )
  }

  // Bildirimi kaydet
  const { error: insertError } = await adminSupabase
    .from('lost_found_notifications')
    .insert({
      report_id:      reportId,
      finder_name:    finderName,
      finder_phone:   finderPhone || null,
      found_location: foundLocation || null,
      message:        message || null,
      finder_user_id: finderUserId,
    })

  if (insertError) {
    console.error('[found-notification] insert error:', insertError)
    return NextResponse.json({ error: 'Bildirim kaydedilemedi.' }, { status: 500 })
  }

  // Pet sahibine in-app bildirim gönder
  try {
    const pet = Array.isArray(report.pets) ? report.pets[0] : report.pets as any
    if (pet?.owner_id) {
      const speciesText = (pet.species === 'cat' || pet.species?.toLowerCase() === 'kedi') ? 'kediniz' : 'köpeğiniz'
      await adminSupabase.from('notifications').insert({
        profile_id: pet.owner_id,
        pet_id:     pet.id,
        title:      `🎉 ${pet.name} Bulundu Bildirimi!`,
        message:    `${finderName} adlı kişi ${speciesText} gördüğünü bildiriyor.${foundLocation ? ` Konum: ${foundLocation}` : ''}${finderPhone ? ` Tel: ${finderPhone}` : ''}`,
        type:       'lost_pet_found_tip',
        is_read:    false,
        sent_email: false,
      })
    }
  } catch (notifErr) {
    // Bildirim hatası kritik değil, devam et
    console.error('[found-notification] notification error:', notifErr)
  }

  return NextResponse.json({
    success: true,
    message: 'Bildiriminiz iletildi. Pet sahibine haber verildi.',
  })
}
