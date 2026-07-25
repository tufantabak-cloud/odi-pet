import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { lostReportSessionIdSchema } from '@/lib/lost-reports/validation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const BUCKET = 'lost-report-photos'
const MAX_FILE_SIZE = 2 * 1024 * 1024
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const responseHeaders = { 'Cache-Control': 'no-store' }

function isFileLike(
  value: FormDataEntryValue | null | undefined
): value is File {
  return Boolean(
    value
    && typeof value === 'object'
    && 'name' in value
    && 'size' in value
    && 'type' in value
    && 'arrayBuffer' in value
  )
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401, headers: responseHeaders }
    )
  }

  const formData = await request.formData().catch(() => null)
  const photo = formData?.get('photo')
  const sessionId = formData?.get('sessionId')
  const parsedSessionId = lostReportSessionIdSchema.safeParse(sessionId)

  if (!parsedSessionId.success || !isFileLike(photo)) {
    return NextResponse.json(
      { success: false, error: 'INVALID_PHOTO_UPLOAD' },
      { status: 400, headers: responseHeaders }
    )
  }

  const extension = mimeExtensions[photo.type]
  if (!extension || photo.size <= 0 || photo.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: 'INVALID_PHOTO_FILE' },
      { status: 400, headers: responseHeaders }
    )
  }

  const path = `${user.id}/${parsedSessionId.data}/${randomUUID()}.${extension}`
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo, {
      contentType: photo.type,
      upsert: false,
    })

  if (error) {
    return NextResponse.json(
      { success: false, error: 'PHOTO_UPLOAD_FAILED' },
      { status: 500, headers: responseHeaders }
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json(
    { success: true, photoUrl: publicUrl, path },
    { headers: responseHeaders }
  )
}
