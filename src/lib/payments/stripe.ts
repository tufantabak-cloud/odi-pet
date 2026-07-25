import Stripe from 'stripe'

let stripeClient: Stripe | null = null
let stripeClientKey: string | null = null

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!secretKey) {
    return null
  }

  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 10_000,
    })
    stripeClientKey = secretKey
  }

  return stripeClient
}

export function getApplicationOrigin(request: Request): string | null {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.ODIPET_BASE_URL?.trim()

  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin)
      const isLocalDevelopment =
        process.env.NODE_ENV !== 'production' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')

      if (url.protocol === 'https:' || (url.protocol === 'http:' && isLocalDevelopment)) {
        return url.origin
      }
    } catch {
      return null
    }

    return null
  }

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  try {
    const requestUrl = new URL(request.url)
    const isLocalRequest =
      requestUrl.hostname === 'localhost' ||
      requestUrl.hostname === '127.0.0.1'

    return isLocalRequest ? requestUrl.origin : null
  } catch {
    return null
  }
}

export function stripeObjectId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

export function subscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isFinite(value))

  if (periodEnds.length === 0) return null
  return new Date(Math.max(...periodEnds) * 1000).toISOString()
}
