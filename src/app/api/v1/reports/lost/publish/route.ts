import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import {
  getLostReportLocationText,
  lostReportPublishPayloadSchema,
  lostReportSessionIdSchema,
  normalizeTurkishPhone,
} from '@/lib/lost-reports/validation'
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from '@/lib/supabase/server'

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save_draft'),
    sessionId: lostReportSessionIdSchema,
    payload: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal('publish'),
    sessionId: lostReportSessionIdSchema,
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
])

const responseHeaders = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401, headers: responseHeaders }
      )
    }

    const body = await request.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PUBLISH_REQUEST' },
        { status: 400, headers: responseHeaders }
      )
    }

    const serializedPayload = JSON.stringify(parsedRequest.data.payload ?? {})
    if (serializedPayload.length > 32_768) {
      return NextResponse.json(
        { success: false, error: 'DRAFT_TOO_LARGE' },
        { status: 413, headers: responseHeaders }
      )
    }

    const admin = createAdminSupabaseClient()
    const { data: existingDraft } = await admin
      .from('lost_report_drafts')
      .select('profile_id, payload')
      .eq('session_id', parsedRequest.data.sessionId)
      .maybeSingle()

    if (existingDraft && existingDraft.profile_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'DRAFT_SESSION_CONFLICT' },
        { status: 409, headers: responseHeaders }
      )
    }

    if (parsedRequest.data.action === 'save_draft') {
      const mergedPayload = {
        ...((existingDraft?.payload as Record<string, unknown> | null) ?? {}),
        ...parsedRequest.data.payload,
      }

      let saveError = null
      if (existingDraft) {
        const { error } = await admin
          .from('lost_report_drafts')
          .update({
            payload: mergedPayload,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          })
          .eq('session_id', parsedRequest.data.sessionId)
        saveError = error
      } else {
        const { error } = await admin
          .from('lost_report_drafts')
          .insert({
            session_id: parsedRequest.data.sessionId,
            profile_id: user.id,
            payload: mergedPayload,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          })
        saveError = error
      }

      if (saveError) {
        console.error('Save draft error:', saveError)
        return NextResponse.json(
          { success: true, warning: 'DRAFT_SAVE_FAILED', details: saveError.message },
          { headers: responseHeaders }
        )
      }

      return NextResponse.json(
        { success: true },
        { headers: responseHeaders }
      )
    }

    const mergedPayload = {
      ...((existingDraft?.payload as Record<string, unknown> | null) ?? {}),
      ...(parsedRequest.data.payload ?? {}),
    }
    const parsedPayload = lostReportPublishPayloadSchema.safeParse(mergedPayload)
    if (!parsedPayload.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_LOST_REPORT_DATA' },
        { status: 400, headers: responseHeaders }
      )
    }

    const verifiedPhone = normalizeTurkishPhone(user.phone ?? '')
    const requestedPhone = normalizeTurkishPhone(parsedPayload.data.contactPhone)
    const effectivePhone = verifiedPhone || requestedPhone

    if (!effectivePhone || effectivePhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'PHONE_VERIFICATION_REQUIRED' },
        { status: 400, headers: responseHeaders }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: callerRole } = await supabase.rpc('user_pet_role', {
      p_pet_id: parsedPayload.data.petId,
    })

    if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
      const { data: petOwner } = await supabase
        .from('pet_owners')
        .select('id')
        .eq('pet_id', parsedPayload.data.petId)
        .eq('profile_id', user.id)
        .maybeSingle()

      const { data: directPet } = await supabase
        .from('pets')
        .select('id, owner_id')
        .eq('id', parsedPayload.data.petId)
        .maybeSingle()

      const isPetOwner = !!petOwner || directPet?.owner_id === user.id
      if (!isPetOwner) {
        return NextResponse.json(
          { success: false, error: 'PET_NOT_FOUND_OR_FORBIDDEN' },
          { status: 403, headers: responseHeaders }
        )
      }
    }

    const { data: previousPublish } = await supabase
      .from('lost_reports')
      .select('id')
      .eq('source_session_id', parsedRequest.data.sessionId)
      .maybeSingle()

    if (previousPublish) {
      return NextResponse.json(
        { success: true, reportId: previousPublish.id, idempotent: true },
        { headers: responseHeaders }
      )
    }

    const { data: activeReport } = await supabase
      .from('lost_reports')
      .select('id')
      .eq('pet_id', parsedPayload.data.petId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (activeReport) {
      return NextResponse.json(
        { success: false, error: 'ACTIVE_LOST_REPORT_EXISTS' },
        { status: 409, headers: responseHeaders }
      )
    }

    let lastSeenAt: string | undefined
    if (parsedPayload.data.lastSeenAt) {
      const candidate = new Date(parsedPayload.data.lastSeenAt)
      const oldestAllowed = new Date()
      oldestAllowed.setFullYear(oldestAllowed.getFullYear() - 5)

      if (candidate > new Date(Date.now() + 60_000) || candidate < oldestAllowed) {
        return NextResponse.json(
          { success: false, error: 'INVALID_LAST_SEEN_AT' },
          { status: 400, headers: responseHeaders }
        )
      }
      lastSeenAt = candidate.toISOString()
    }

    const location = parsedPayload.data.location
    const { data: report, error: insertError } = await admin
      .from('lost_reports')
      .insert({
        pet_id: parsedPayload.data.petId,
        last_seen_location: getLostReportLocationText(location),
        contact_phone: effectivePhone,
        latitude: location.isManual ? null : location.lat,
        longitude: location.isManual ? null : location.lng,
        photo_url:
          parsedPayload.data.photo && 'photoUrl' in parsedPayload.data.photo
            ? parsedPayload.data.photo.photoUrl
            : null,
        source_session_id: parsedRequest.data.sessionId,
        ...(lastSeenAt ? { last_seen_at: lastSeenAt } : {}),
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !report) {
      console.error('lost_report publish insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'LOST_REPORT_CREATE_FAILED', details: insertError?.message },
        { status: 500, headers: responseHeaders }
      )
    }

    await admin
      .from('lost_report_drafts')
      .delete()
      .eq('session_id', parsedRequest.data.sessionId)
      .eq('profile_id', user.id)

    return NextResponse.json(
      { success: true, reportId: report.id, idempotent: false },
      { status: 201, headers: responseHeaders }
    )
  } catch (err: any) {
    console.error('Unhandled lost report publish error:', err)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: err?.message },
      { status: 500, headers: responseHeaders }
    )
  }
}
