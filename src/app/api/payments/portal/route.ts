import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import {
  getApplicationOrigin,
  getStripeClient,
} from '@/lib/payments/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: noStoreHeaders }
  )
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 401)
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return errorResponse('PAYMENT_PROVIDER_NOT_CONFIGURED', 503)
  }

  const appOrigin = getApplicationOrigin(request)
  if (!appOrigin) {
    return errorResponse('APPLICATION_ORIGIN_NOT_CONFIGURED', 503)
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: subscription, error } = await admin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (error) {
      return errorResponse('SUBSCRIPTION_LOOKUP_FAILED', 500)
    }

    if (!subscription?.stripe_customer_id) {
      return errorResponse('BILLING_ACCOUNT_NOT_FOUND', 404)
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appOrigin}/owner/profile/subscription`,
      locale: 'tr',
    })

    return NextResponse.json(
      { success: true, url: portalSession.url },
      { headers: noStoreHeaders }
    )
  } catch {
    return errorResponse('PAYMENT_PROVIDER_ERROR', 502)
  }
}
