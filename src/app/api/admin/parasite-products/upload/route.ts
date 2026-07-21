import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const BUCKET = 'parasite-product-images'
const MAX_BYTES = 3 * 1024 * 1024 // 3MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

// POST — admin ürün görseli yükler, public URL döndürür (image_url'e yazılır)
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })

  let formData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_UPLOAD', message: 'Geçersiz form verisi.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'NO_FILE', message: 'Dosya gönderilmedi.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'FILE_TOO_LARGE', message: 'Görsel 3MB sınırını aşıyor.' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'Yalnızca JPEG, PNG veya WebP görsel yüklenebilir.' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename = `products/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'UPLOAD_FAILED', message: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return NextResponse.json({ success: true, path: filename, url: publicUrl }, { status: 201 })
}

// DELETE — bir ürün görselini bucket'tan kaldırır (bu bucket'a ait path zorunlu)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const path: unknown = body?.path
  if (typeof path !== 'string' || path.includes('..') || !path.startsWith('products/')) {
    return NextResponse.json({ error: 'INVALID_PATH', message: 'Geçersiz görsel yolu.' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: 'DELETE_FAILED', message: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
