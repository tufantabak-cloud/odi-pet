import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { lostReportSessionIdSchema } from '@/lib/lost-reports/validation'
import {
  createAdminSupabaseClient,
} from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'jpg',
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
  try {
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

    const extension = mimeExtensions[photo.type] || 'jpg'
    if (photo.size <= 0 || photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PHOTO_FILE' },
        { status: 400, headers: responseHeaders }
      )
    }

    const admin = createAdminSupabaseClient()
    let uploadPath = `${user.id}/${parsedSessionId.data}/${randomUUID()}.${extension}`
    let uploadBucket = 'lost-report-photos'

    // Try lost-report-photos first using admin client
    let { error: uploadError } = await admin.storage
      .from('lost-report-photos')
      .upload(uploadPath, photo, {
        contentType: photo.type || 'image/jpeg',
        upsert: true,
      })

    // If primary bucket fails, fallback to pet-avatars bucket
    if (uploadError) {
      console.warn('lost-report-photos bucket failed, trying pet-avatars fallback:', uploadError.message)
      uploadBucket = 'pet-avatars'
      uploadPath = `${user.id}/lost-${randomUUID()}.${extension}`

      const fallbackResult = await admin.storage
        .from('pet-avatars')
        .upload(uploadPath, photo, {
          contentType: photo.type || 'image/jpeg',
          upsert: true,
        })

      if (fallbackResult.error) {
        console.error('pet-avatars fallback upload failed:', fallbackResult.error)
        return NextResponse.json(
          { success: false, error: 'PHOTO_UPLOAD_FAILED', details: fallbackResult.error.message },
          { status: 500, headers: responseHeaders }
        )
      }
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(uploadBucket).getPublicUrl(uploadPath)

    return NextResponse.json(
      { success: true, photoUrl: publicUrl, path: uploadPath },
      { headers: responseHeaders }
    )
  } catch (err: any) {
    console.error('Unhandled photo upload error:', err)
    return NextResponse.json(
      { success: false, error: 'PHOTO_UPLOAD_FAILED', message: err?.message },
      { status: 500, headers: responseHeaders }
    )
  }
}
