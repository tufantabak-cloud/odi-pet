import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import {
  getApplicationOrigin,
  getStripeClient,
} from '@/lib/payments/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'ai_plus']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

const ACTIVE_STRIPE_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'incomplete',
  'paused',
])

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: noStoreHeaders }
  )
}

function fallbackPriceId(
  plan: 'pro' | 'ai_plus',
  interval: 'monthly' | 'yearly'
) {
  const key =
    plan === 'pro'
      ? interval === 'monthly'
        ? 'STRIPE_PRICE_PRO_MONTHLY'
        : 'STRIPE_PRICE_PRO_YEARLY'
      : interval === 'monthly'
        ? 'STRIPE_PRICE_AI_PLUS'
        : 'STRIPE_PRICE_AI_PLUS_YEARLY'

  return process.env[key]?.trim() || null
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 401)
  }

  let input: z.infer<typeof checkoutSchema>
  try {
    input = checkoutSchema.parse(await request.json())
  } catch {
    return errorResponse('INVALID_REQUEST', 400)
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
    const [{ data: plan, error: planError }, { data: currentSubscription, error: subscriptionError }] =
      await Promise.all([
        admin
          .from('subscription_plans')
          .select(
            'plan_key, stripe_price_id_monthly, stripe_price_id_yearly, is_active'
          )
          .eq('plan_key', input.plan)
          .eq('plan_type', 'consumer')
          .maybeSingle(),
        admin
          .from('user_subscriptions')
          .select('stripe_customer_id, stripe_subscription_id, status')
          .eq('profile_id', user.id)
          .maybeSingle(),
      ])

    if (planError || !plan || plan.is_active === false) {
      return errorResponse('PLAN_NOT_AVAILABLE', 404)
    }

    if (subscriptionError) {
      return errorResponse('SUBSCRIPTION_LOOKUP_FAILED', 500)
    }

    if (
      currentSubscription?.stripe_subscription_id &&
      ACTIVE_STRIPE_STATUSES.has(currentSubscription.status)
    ) {
      return errorResponse('SUBSCRIPTION_ALREADY_EXISTS', 409)
    }

    const databasePriceId =
      input.interval === 'monthly'
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly
    const priceId = databasePriceId || fallbackPriceId(input.plan, input.interval)

    if (!priceId) {
      return errorResponse('PLAN_PRICE_NOT_CONFIGURED', 503)
    }

    let customerId = currentSubscription?.stripe_customer_id ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        phone: user.phone,
        metadata: {
          profile_id: user.id,
        },
      })
      customerId = customer.id

      const { error: customerSaveError } = await admin
        .from('user_subscriptions')
        .upsert(
          {
            profile_id: user.id,
            plan: 'free',
            status: 'active',
            stripe_customer_id: customerId,
          },
          { onConflict: 'profile_id' }
        )

      if (customerSaveError) {
        return errorResponse('SUBSCRIPTION_UPDATE_FAILED', 500)
      }
    }

    const metadata = {
      profile_id: user.id,
      plan_key: input.plan,
      billing_interval: input.interval,
    }
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: 'tr',
      success_url: `${appOrigin}/owner/profile/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/owner/profile/subscription?checkout=cancelled`,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    if (!checkoutSession.url) {
      return errorResponse('CHECKOUT_SESSION_FAILED', 502)
    }

    return NextResponse.json(
      { success: true, url: checkoutSession.url },
      { headers: noStoreHeaders }
    )
  } catch {
    return errorResponse('PAYMENT_PROVIDER_ERROR', 502)
  }
}
