import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import {
  getStripeClient,
  stripeObjectId,
  subscriptionPeriodEnd,
} from '@/lib/payments/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminSupabaseClient>

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders,
  })
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return stripeObjectId(invoice.parent?.subscription_details?.subscription)
}

function eventMetadata(
  event: Stripe.Event
): Stripe.Metadata | null | undefined {
  switch (event.type) {
    case 'checkout.session.completed':
      return event.data.object.metadata
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return event.data.object.metadata
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded':
      return event.data.object.parent?.subscription_details?.metadata
    default:
      return null
  }
}

async function findExistingSubscription(
  admin: AdminClient,
  stripeSubscriptionId: string | null,
  stripeCustomerId: string | null
) {
  if (stripeSubscriptionId) {
    const { data, error } = await admin
      .from('user_subscriptions')
      .select('profile_id, plan')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle()

    if (error) throw new Error('SUBSCRIPTION_LOOKUP_FAILED')
    if (data?.profile_id) return data
  }

  if (stripeCustomerId) {
    const { data, error } = await admin
      .from('user_subscriptions')
      .select('profile_id, plan')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle()

    if (error) throw new Error('SUBSCRIPTION_LOOKUP_FAILED')
    if (data?.profile_id) return data
  }

  return null
}

async function findPlanByPriceId(
  admin: AdminClient,
  priceId: string | null
): Promise<string | null> {
  if (!priceId) return null

  for (const column of [
    'stripe_price_id_monthly',
    'stripe_price_id_yearly',
  ] as const) {
    const { data, error } = await admin
      .from('subscription_plans')
      .select('plan_key')
      .eq(column, priceId)
      .maybeSingle()

    if (error) throw new Error('PLAN_LOOKUP_FAILED')
    if (data?.plan_key) return data.plan_key
  }

  return null
}

async function upsertSubscription(
  admin: AdminClient,
  values: {
    profileId: string
    plan: string
    status: string
    customerId: string | null
    subscriptionId: string | null
    currentPeriodEnd: string | null
  }
) {
  const { error } = await admin
    .from('user_subscriptions')
    .upsert(
      {
        profile_id: values.profileId,
        plan: values.plan,
        status: values.status,
        stripe_customer_id: values.customerId,
        stripe_subscription_id: values.subscriptionId,
        current_period_end: values.currentPeriodEnd,
      },
      { onConflict: 'profile_id' }
    )

  if (error) throw new Error('SUBSCRIPTION_UPDATE_FAILED')
}

async function syncStripeEvent(
  event: Stripe.Event,
  admin: AdminClient,
  stripe: Stripe
) {
  const metadata = eventMetadata(event)

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkout = event.data.object
      const profileId = metadata?.profile_id || checkout.client_reference_id
      const plan = metadata?.plan_key
      const customerId = stripeObjectId(checkout.customer)
      const subscriptionId = stripeObjectId(checkout.subscription)

      if (!profileId || !plan || !customerId || !subscriptionId) {
        throw new Error('INCOMPLETE_CHECKOUT_METADATA')
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await upsertSubscription(admin, {
        profileId,
        plan,
        status: subscription.status,
        customerId,
        subscriptionId,
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
      })
      return
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const customerId = stripeObjectId(subscription.customer)
      const priceId = subscription.items.data[0]?.price.id ?? null
      const existing = await findExistingSubscription(
        admin,
        subscription.id,
        customerId
      )
      const profileId = metadata?.profile_id || existing?.profile_id
      const plan =
        (await findPlanByPriceId(admin, priceId)) ||
        metadata?.plan_key ||
        existing?.plan

      if (!profileId || !plan || !customerId) {
        throw new Error('INCOMPLETE_SUBSCRIPTION_METADATA')
      }

      await upsertSubscription(admin, {
        profileId,
        plan,
        status: subscription.status,
        customerId,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
      })
      return
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId = stripeObjectId(subscription.customer)
      const existing = await findExistingSubscription(
        admin,
        subscription.id,
        customerId
      )
      const profileId = metadata?.profile_id || existing?.profile_id

      if (!profileId) {
        throw new Error('SUBSCRIPTION_OWNER_NOT_FOUND')
      }

      await upsertSubscription(admin, {
        profileId,
        plan: 'free',
        status: 'canceled',
        customerId,
        subscriptionId: null,
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
      })
      return
    }

    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      const customerId = stripeObjectId(invoice.customer)
      const subscriptionId = invoiceSubscriptionId(invoice)
      const existing = await findExistingSubscription(
        admin,
        subscriptionId,
        customerId
      )
      const profileId = metadata?.profile_id || existing?.profile_id
      const plan = metadata?.plan_key || existing?.plan

      if (!profileId || !plan) {
        throw new Error('INVOICE_SUBSCRIPTION_NOT_FOUND')
      }

      await upsertSubscription(admin, {
        profileId,
        plan,
        status:
          event.type === 'invoice.payment_succeeded' ? 'active' : 'past_due',
        customerId,
        subscriptionId,
        currentPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
      })
      return
    }

    default:
      return
  }
}

async function beginEvent(
  admin: AdminClient,
  event: Stripe.Event
): Promise<'started' | 'completed' | 'processing'> {
  const now = new Date()
  const eventValues = {
    id: event.id,
    event_type: event.type,
    status: 'processing',
    attempt_count: 1,
    last_error: null,
    received_at: new Date(event.created * 1000).toISOString(),
    last_attempt_at: now.toISOString(),
    processed_at: null,
  }
  const { data: inserted, error: insertError } = await admin
    .from('stripe_webhook_events')
    .insert(eventValues)
    .select('id')
    .maybeSingle()

  if (!insertError && inserted) return 'started'
  if (insertError && insertError.code !== '23505') {
    throw new Error('EVENT_LOG_WRITE_FAILED')
  }

  const { data: existing, error: lookupError } = await admin
    .from('stripe_webhook_events')
    .select('status, attempt_count, last_attempt_at')
    .eq('id', event.id)
    .maybeSingle()

  if (lookupError) throw new Error('EVENT_LOG_LOOKUP_FAILED')
  if (existing?.status === 'completed') return 'completed'
  if (!existing) throw new Error('EVENT_LOG_LOOKUP_FAILED')

  const retryCutoff = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const mayRetry =
    existing.status === 'failed' ||
    (existing.status === 'processing' &&
      existing.last_attempt_at < retryCutoff)

  if (!mayRetry) return 'processing'

  let retryQuery = admin
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      attempt_count: existing.attempt_count + 1,
      last_error: null,
      last_attempt_at: now.toISOString(),
      processed_at: null,
    })
    .eq('id', event.id)
    .eq('status', existing.status)

  if (existing.status === 'processing') {
    retryQuery = retryQuery.lt('last_attempt_at', retryCutoff)
  }

  const { data: claimed, error: retryError } = await retryQuery
    .select('id')
    .maybeSingle()

  if (retryError) throw new Error('EVENT_LOG_WRITE_FAILED')
  return claimed ? 'started' : 'processing'
}

async function finishEvent(
  admin: AdminClient,
  eventId: string,
  status: 'completed' | 'failed',
  lastError: string | null
) {
  const { error } = await admin
    .from('stripe_webhook_events')
    .update({
      status,
      last_error: lastError?.slice(0, 500) ?? null,
      processed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', eventId)

  if (error) throw new Error('EVENT_LOG_FINALIZE_FAILED')
}

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!stripe || !webhookSecret) {
    return response(
      { success: false, error: 'PAYMENT_WEBHOOK_NOT_CONFIGURED' },
      503
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return response({ success: false, error: 'MISSING_SIGNATURE' }, 400)
  }

  let event: Stripe.Event
  try {
    const payload = await request.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    return response({ success: false, error: 'INVALID_SIGNATURE' }, 400)
  }

  const admin = createAdminSupabaseClient()

  try {
    const eventState = await beginEvent(admin, event)
    if (eventState === 'completed') {
      return response({ success: true, duplicate: true })
    }
    if (eventState === 'processing') {
      return response({ success: false, error: 'EVENT_ALREADY_PROCESSING' }, 409)
    }

    await syncStripeEvent(event, admin, stripe)
    await finishEvent(admin, event.id, 'completed', null)

    return response({ success: true })
  } catch (error) {
    const safeError =
      error instanceof Error ? error.message : 'WEBHOOK_PROCESSING_FAILED'

    try {
      await finishEvent(admin, event.id, 'failed', safeError)
    } catch {
      // Stripe yeniden deneyeceği için burada özgün işleme hatası korunur.
    }

    return response(
      { success: false, error: 'WEBHOOK_PROCESSING_FAILED' },
      500
    )
  }
}
