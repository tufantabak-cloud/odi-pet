import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { normalizeTurkishPhone } from '@/lib/lost-reports/validation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    phone: z.string().min(10).max(24),
  }),
  z.object({
    action: z.literal('verify'),
    phone: z.string().min(10).max(24),
    code: z.string().regex(/^\d{6}$/),
  }),
])

const responseHeaders = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401, headers: responseHeaders }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'INVALID_OTP_REQUEST' },
      { status: 400, headers: responseHeaders }
    )
  }

  const phone = normalizeTurkishPhone(parsed.data.phone)
  if (!phone) {
    return NextResponse.json(
      { success: false, error: 'INVALID_PHONE_NUMBER' },
      { status: 400, headers: responseHeaders }
    )
  }

  const supabase = await createServerSupabaseClient()

  const isDev = process.env.NODE_ENV === 'development'

  if (parsed.data.action === 'send') {
    const currentPhone = normalizeTurkishPhone(user.phone ?? '')
    if (currentPhone === phone && user.phone_confirmed_at) {
      return NextResponse.json(
        { success: true, phone, alreadyVerified: true },
        { headers: responseHeaders }
      )
    }

    if (!isDev) {
      const { error } = currentPhone === phone
        ? await supabase.auth.resend({ type: 'phone_change', phone })
        : await supabase.auth.updateUser({ phone })

      if (error) {
        console.error('Supabase OTP Error:', error)
        return NextResponse.json(
          { success: false, error: 'OTP_DELIVERY_FAILED', details: error.message },
          { status: 503, headers: responseHeaders }
        )
      }
    }

    return NextResponse.json(
      { success: true, phone, alreadyVerified: false },
      { headers: responseHeaders }
    )
  }

  // action === 'verify'
  let isValid = false;

  if (isDev && parsed.data.code === '123456') {
    isValid = true;
  } else if (!isDev) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: parsed.data.code,
      type: 'phone_change',
    })

    if (!error && data.user && data.user.id === user.id) {
      isValid = true;
    }
  }

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: 'INVALID_OR_EXPIRED_OTP' },
      { status: 400, headers: responseHeaders }
    )
  }

  // In development, we might not be able to update auth.users.phone if SMS is disabled,
  // but we can definitely update profiles.phone.
  // We can try to update auth.users if possible, but admin API is needed to bypass SMS verification.
  // The profiles table is the main source of truth for the app anyway.
  await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', user.id)

  return NextResponse.json(
    { success: true, phone },
    { headers: responseHeaders }
  )
}
