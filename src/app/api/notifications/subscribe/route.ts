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
}).strict()

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(4096),
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

    console.info('[push/subscribe] Saving device subscription')

    const supabase = await createServerSupabaseClient()
    const userAgent = request.headers.get('user-agent') ?? ''
    const { endpoint, keys } = parsed.data

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          profile_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent,
        },
        { onConflict: 'profile_id,endpoint' }
      )

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

    console.info('[push/subscribe] Device subscription saved')
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
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', user.id)
      .eq('endpoint', parsed.data.endpoint)

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/unsubscribe] Unexpected failure:', error)
    return NextResponse.json(
      { error: 'PUSH_SUBSCRIPTION_DELETE_FAILED' },
      { status: 500 }
    )
  }
}
