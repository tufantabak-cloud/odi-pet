import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendWebPush, type PushPayload } from '@/lib/agents/notificationAgent'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const notificationPayloadSchema = z.object({
  profile_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
}).strict()

function getPushErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && typeof error.statusCode === 'number'
  ) {
    return error.statusCode
  }

  return undefined
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const actor = await requireRole(['admin', 'founder'])
    if (!actor) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'INVALID_NOTIFICATION_PAYLOAD' },
        { status: 400 }
      )
    }

    const parsedPayload = notificationPayloadSchema.safeParse(body)
    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'INVALID_NOTIFICATION_PAYLOAD' },
        { status: 400 }
      )
    }

    const { profile_id, title, message } = parsedPayload.data
    const admin = createAdminSupabaseClient()
    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id)

    if (subscriptionsError) {
      console.error('Push subscription query failed:', subscriptionsError)
      return NextResponse.json(
        { error: 'PUSH_SUBSCRIPTIONS_QUERY_FAILED' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'PUSH_SUBSCRIPTION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const payload: PushPayload = {
      title,
      body: message,
      url: '/',
    }

    let sentCount = 0
    const errors: string[] = []

    for (const subscription of subscriptions) {
      const pushSubscription: Parameters<typeof sendWebPush>[0] = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      }

      const result = await sendWebPush(pushSubscription, payload)
      if (result.success) {
        sentCount += 1
      } else {
        errors.push('PUSH_DELIVERY_FAILED')
        const errorStatus = getPushErrorStatus(result.error)
        if (errorStatus === 410 || errorStatus === 404) {
          const { error: deleteError } = await admin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)

          if (deleteError) {
            console.error('Stale push subscription cleanup failed:', deleteError)
          }
        }
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      message: sentCount > 0
        ? `${sentCount} cihaza bildirim gönderildi.`
        : 'Bildirim gönderilemedi.',
      payload,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    console.error('Manual push failed:', error)
    return NextResponse.json(
      { success: false, error: 'MANUAL_PUSH_FAILED' },
      { status: 500 }
    )
  }
}
