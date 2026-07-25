import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getStripeClient: vi.fn(),
  getApplicationOrigin: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/payments/stripe', () => ({
  getStripeClient: mocks.getStripeClient,
  getApplicationOrigin: mocks.getApplicationOrigin,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}))

import { POST } from './route'

type SubscriptionRow = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
} | null

function createAdminClient(options?: {
  planPrice?: string | null
  subscription?: SubscriptionRow
}) {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => {
    if (table === 'subscription_plans') {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            plan_key: 'pro',
            stripe_price_id_monthly:
              options?.planPrice === undefined
                ? 'price_pro_monthly'
                : options.planPrice,
            stripe_price_id_yearly: null,
            is_active: true,
          },
          error: null,
        }),
      }
      query.select.mockReturnValue(query)
      query.eq.mockReturnValue(query)
      return query
    }

    if (table === 'user_subscriptions') {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: options?.subscription ?? null,
          error: null,
        }),
        upsert,
      }
      query.select.mockReturnValue(query)
      query.eq.mockReturnValue(query)
      return query
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, upsert }
}

function createRequest(body: unknown) {
  return new Request('http://localhost:3000/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/payments/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    mocks.getSessionUser.mockResolvedValue({
      id: 'profile-1',
      email: 'owner@example.com',
      phone: '+905551112233',
    })
    mocks.getApplicationOrigin.mockReturnValue('http://localhost:3000')
  })

  it('oturum yoksa ayrıcalıklı istemci oluşturmadan reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest({ plan: 'pro' }))

    expect(response.status).toBe(401)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
    expect(mocks.getStripeClient).not.toHaveBeenCalled()
  })

  it('istemci tarafından gönderilen rastgele planı kabul etmez', async () => {
    const response = await POST(createRequest({ plan: 'enterprise' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'INVALID_REQUEST' })
  })

  it('Stripe yapılandırılmamışsa güvenli biçimde kapalı kalır', async () => {
    mocks.getStripeClient.mockReturnValue(null)

    const response = await POST(createRequest({ plan: 'pro' }))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    })
  })

  it('etkin Stripe aboneliğinin ikinci kez açılmasını engeller', async () => {
    const stripe = {
      checkout: { sessions: { create: vi.fn() } },
      customers: { create: vi.fn() },
    }
    const admin = createAdminClient({
      subscription: {
        stripe_customer_id: 'cus_existing',
        stripe_subscription_id: 'sub_existing',
        status: 'active',
      },
    })
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(createRequest({ plan: 'pro' }))

    expect(response.status).toBe(409)
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('fiyat kimliği tanımlı değilse ödeme oturumu açmaz', async () => {
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', '')
    const stripe = {
      checkout: { sessions: { create: vi.fn() } },
      customers: { create: vi.fn() },
    }
    const admin = createAdminClient({ planPrice: null })
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(createRequest({ plan: 'pro' }))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: 'PLAN_PRICE_NOT_CONFIGURED',
    })
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('kullanıcı için gerçek Stripe Checkout oturumu oluşturur', async () => {
    const stripe = {
      customers: {
        create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            url: 'https://checkout.stripe.com/test-session',
          }),
        },
      },
    }
    const admin = createAdminClient()
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(
      createRequest({ plan: 'pro', interval: 'monthly' })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/test-session')
    expect(admin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'profile-1',
        stripe_customer_id: 'cus_new',
      }),
      { onConflict: 'profile_id' }
    )
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_new',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        metadata: expect.objectContaining({
          profile_id: 'profile-1',
          plan_key: 'pro',
        }),
      })
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
