import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }).strict(),
  device_id: z.string().optional(),
  platform: z.string().optional(),
  browser: z.string().optional(),
  app_version: z.string().optional(),
}).strict()

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(4096).optional(),
  device_id: z.string().optional(),
}).strict()

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

// POST /api/notifications/subscribe
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const parsed = subscriptionSchema.safeParse(await readJson(request))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PUSH_SUBSCRIPTION' },
        { status: 400 }
      )
    }

    console.info('[push/subscribe] Saving device subscription for user:', user.id)

    const supabase = await createServerSupabaseClient()
    const userAgent = request.headers.get('user-agent') ?? ''
    const { endpoint, keys, device_id, platform, browser, app_version } = parsed.data

    const subscriptionData: Record<string, unknown> = {
      profile_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
      user_agent: userAgent,
    }

    // First attempt full upsert with core required fields
    let { error } = await supabase
      .from('push_subscriptions')
      .upsert(subscriptionData, { onConflict: 'profile_id,endpoint' })

    // If schema mismatch error occurred due to optional extended fields, attempt safe insert
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
      console.warn('[push/subscribe] Retrying with strictly minimal fields due to schema variance:', error.message)
      const minimalData = {
        profile_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        user_agent: userAgent,
      }
      const retryResult = await supabase
        .from('push_subscriptions')
        .upsert(minimalData, { onConflict: 'profile_id,endpoint' })
      error = retryResult.error
    }

    if (error) {
      console.error('[push/subscribe] Database save failed:', {
        code: error.code,
        message: error.message,
      })
      return NextResponse.json(
        { error: 'PUSH_SUBSCRIPTION_SAVE_FAILED' },
        { status: 500 }
      )
    }

    // Safely attempt observability log insert
    try {
      await supabase.from('notification_delivery_logs').insert({
        profile_id: user.id,
        event_type: 'subscription_created',
        metadata: { platform: platform ?? 'unknown', browser: browser ?? 'unknown', device_id: device_id ?? null }
      })
    } catch {
      // Non-blocking log insertion failure
    }

    console.info('[push/subscribe] Device subscription saved successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/subscribe] Unexpected failure:', error)
    return NextResponse.json(
      { error: 'PUSH_SUBSCRIPTION_SAVE_FAILED' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/subscribe
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const parsed = unsubscribeSchema.safeParse(await readJson(request))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PUSH_SUBSCRIPTION' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { endpoint, device_id } = parsed.data

    let query = supabase.from('push_subscriptions').delete().eq('profile_id', user.id)
    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    } else if (device_id) {
      query = query.eq('device_id', device_id)
    } else {
      return NextResponse.json({ error: 'ENDPOINT_OR_DEVICE_ID_REQUIRED' }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      console.error('[push/unsubscribe] Database delete failed:', {
        code: error.code,
        message: error.message,
      })
      return NextResponse.json(
        { error: 'PUSH_SUBSCRIPTION_DELETE_FAILED' },
        { status: 500 }
      )
    }

    try {
      await supabase.from('notification_delivery_logs').insert({
        profile_id: user.id,
        event_type: 'subscription_removed',
        metadata: { endpoint: endpoint ?? null, device_id: device_id ?? null }
      })
    } catch {
      // Non-blocking log insertion failure
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/unsubscribe] Unexpected failure:', error)
    return NextResponse.json(
      { error: 'PUSH_SUBSCRIPTION_DELETE_FAILED' },
      { status: 500 }
    )
  }
}
