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

  if (parsed.data.action === 'send') {
    const currentPhone = normalizeTurkishPhone(user.phone ?? '')
    if (currentPhone === phone && user.phone_confirmed_at) {
      return NextResponse.json(
        { success: true, phone, alreadyVerified: true },
        { headers: responseHeaders }
      )
    }

    const { error } = currentPhone === phone
      ? await supabase.auth.resend({ type: 'phone_change', phone })
      : await supabase.auth.updateUser({ phone })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'OTP_DELIVERY_FAILED' },
        { status: 503, headers: responseHeaders }
      )
    }

    return NextResponse.json(
      { success: true, phone, alreadyVerified: false },
      { headers: responseHeaders }
    )
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: parsed.data.code,
    type: 'phone_change',
  })

  if (error || !data.user || data.user.id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'INVALID_OR_EXPIRED_OTP' },
      { status: 400, headers: responseHeaders }
    )
  }

  await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', user.id)

  return NextResponse.json(
    { success: true, phone },
    { headers: responseHeaders }
  )
}
