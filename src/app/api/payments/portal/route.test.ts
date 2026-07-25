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

function createAdminClient(customerId: string | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: customerId ? { stripe_customer_id: customerId } : null,
      error: null,
    }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)

  return {
    from: vi.fn().mockReturnValue(query),
  }
}

function createRequest() {
  return new Request('http://localhost:3000/api/payments/portal', {
    method: 'POST',
  })
}

describe('POST /api/payments/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'profile-1' })
    mocks.getApplicationOrigin.mockReturnValue('http://localhost:3000')
  })

  it('oturum yoksa ayrıcalıklı istemciyi kullanmaz', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest())

    expect(response.status).toBe(401)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('ödeme sağlayıcısı yapılandırılmamışsa kapalı kalır', async () => {
    mocks.getStripeClient.mockReturnValue(null)

    const response = await POST(createRequest())

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    })
  })

  it('Stripe müşteri kaydı olmayan hesap için portal açmaz', async () => {
    mocks.getStripeClient.mockReturnValue({
      billingPortal: { sessions: { create: vi.fn() } },
    })
    mocks.createAdminSupabaseClient.mockReturnValue(createAdminClient(null))

    const response = await POST(createRequest())

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: 'BILLING_ACCOUNT_NOT_FOUND',
    })
  })

  it('kimliği doğrulanmış kullanıcının Stripe portalını açar', async () => {
    const stripe = {
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            url: 'https://billing.stripe.com/session/test',
          }),
        },
      },
    }
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(
      createAdminClient('cus_existing')
    )

    const response = await POST(createRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      url: 'https://billing.stripe.com/session/test',
    })
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_existing',
      return_url: 'http://localhost:3000/owner/profile/subscription',
      locale: 'tr',
    })
  })
})
