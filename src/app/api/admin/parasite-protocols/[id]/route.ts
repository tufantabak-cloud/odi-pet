import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// PATCH — bir protokolün alanlarını günceller
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const resolvedParams = await params
  const { id } = resolvedParams

  let body
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_PROTOCOL_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  // PATCH: boş body -> 400 INVALID_PROTOCOL_DATA
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: 'INVALID_PROTOCOL_DATA', message: 'Güncellenecek alan gönderilmedi.' },
      { status: 400 }
    )
  }

  // PATCH: id veya created_at gönderilirse açıkça reddedilsin
  if (body.id !== undefined || body.created_at !== undefined) {
    return NextResponse.json(
      { error: 'INVALID_PROTOCOL_DATA', message: 'id veya created_at alanları değiştirilemez.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  // Önce protokolün var olup olmadığını kontrol et
  const { data: existing, error: existError } = await supabase
    .from('parasite_protocols')
    .select('id')
    .eq('id', id)
    .single()

  if (existError || !existing) {
    return NextResponse.json(
      { error: 'PROTOCOL_NOT_FOUND', message: 'Parazit protokolü bulunamadı.' },
      { status: 404 }
    )
  }

  // Sadece tanımlanmış alanları güncelle (bilinmeyen alanlar elenir)
  const allowedKeys = [
    'parasite_code',
    'protocol_name',
    'parasite_type',
    'species',
    'default_protection_duration_days',
    'allowed_application_methods',
    'default_application_method',
    'min_age_weeks',
    'is_active',
    'sort_order',
  ]

  const filteredUpdateData: Record<string, any> = {}
  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      filteredUpdateData[key] = body[key]
    }
  }

  if (Object.keys(filteredUpdateData).length === 0) {
    return NextResponse.json(
      { error: 'INVALID_PROTOCOL_DATA', message: 'Güncellenecek geçerli bir alan gönderilmedi.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('parasite_protocols')
    .update(filteredUpdateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'DUPLICATE_PROTOCOL', message: 'Bu parazit kodu ve evcil hayvan türü kombinasyonu zaten mevcut.' },
        { status: 409 }
      )
    }
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'INVALID_PROTOCOL_DATA', message: 'Sağlanan veriler veritabanı kısıtlamalarını ihlal ediyor.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'PROTOCOL_UPDATE_FAILED', message: 'Protokol güncellenirken genel bir hata oluştu.' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

// DELETE — protokolü fiziksel silmez, is_active = false olarak soft-delete yapar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const resolvedParams = await params
  const { id } = resolvedParams

  const supabase = await createServerSupabaseClient()

  // Varlık kontrolü
  const { data: existing, error: existError } = await supabase
    .from('parasite_protocols')
    .select('id')
    .eq('id', id)
    .single()

  if (existError || !existing) {
    return NextResponse.json(
      { error: 'PROTOCOL_NOT_FOUND', message: 'Parazit protokolü bulunamadı.' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('parasite_protocols')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'PROTOCOL_UPDATE_FAILED', message: 'Protokol deaktif edilirken genel bir hata oluştu.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: 'Protokol başarıyla deaktif edildi.' })
}
