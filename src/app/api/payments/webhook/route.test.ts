import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStripeClient: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/payments/stripe', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/payments/stripe')>()
  return {
    ...actual,
    getStripeClient: mocks.getStripeClient,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}))

import { POST } from './route'

type EventState = {
  status: 'processing' | 'completed' | 'failed'
  attempt_count: number
} | null

function createAdminClient(options?: {
  eventState?: EventState
  subscription?: { profile_id: string; plan: string } | null
}) {
  const writes: Array<{ table: string; value: Record<string, unknown> }> = []
  const from = vi.fn((table: string) => {
    let operation: 'select' | 'insert' | 'update' = 'select'
    const query = {
      error: null,
      select: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      insert: vi.fn((value: Record<string, unknown>) => {
        operation = 'insert'
        writes.push({ table, value })
        return query
      }),
      upsert: vi.fn(async (value: Record<string, unknown>) => {
        writes.push({ table, value })
        return { error: null }
      }),
      update: vi.fn((value: Record<string, unknown>) => {
        operation = 'update'
        writes.push({ table, value })
        return query
      }),
      maybeSingle: vi.fn(async () => {
        if (table === 'stripe_webhook_events' && operation === 'insert') {
          return options?.eventState
            ? { data: null, error: { code: '23505' } }
            : { data: { id: 'event-id' }, error: null }
        }

        if (operation === 'update') {
          return { data: { id: 'event-id' }, error: null }
        }

        return {
          data:
            table === 'stripe_webhook_events'
              ? options?.eventState ?? null
              : options?.subscription ?? null,
          error: null,
        }
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    return query
  })

  return { from, writes }
}

function webhookRequest(signature = 'valid_signature') {
  return new Request('http://localhost:3000/api/payments/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'Content-Type': 'application/json',
    },
    body: '{"id":"evt_1"}',
  })
}

function checkoutEvent() {
  return {
    id: 'evt_checkout',
    type: 'checkout.session.completed',
    created: 1_700_000_000,
    data: {
      object: {
        metadata: { profile_id: 'profile-1', plan_key: 'pro' },
        client_reference_id: 'profile-1',
        customer: 'cus_1',
        subscription: 'sub_1',
      },
    },
  }
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_example')
  })

  it('Stripe yapılandırması eksikse veri işlemeden kapalı kalır', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    mocks.getStripeClient.mockReturnValue(null)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(503)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('imza başlığı yoksa ayrıcalıklı istemciyi oluşturmaz', async () => {
    const stripe = {
      webhooks: { constructEvent: vi.fn() },
    }
    mocks.getStripeClient.mockReturnValue(stripe)
    const request = new Request(
      'http://localhost:3000/api/payments/webhook',
      {
        method: 'POST',
        body: '{}',
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('geçersiz imzalı webhook gövdesini reddeder', async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error('invalid')
        }),
      },
    }
    mocks.getStripeClient.mockReturnValue(stripe)

    const response = await POST(webhookRequest('invalid_signature'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'INVALID_SIGNATURE' })
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('tamamlanmış olayı tekrar işlemek yerine güvenli başarı döndürür', async () => {
    const stripe = {
      webhooks: { constructEvent: vi.fn().mockReturnValue(checkoutEvent()) },
      subscriptions: { retrieve: vi.fn() },
    }
    const admin = createAdminClient({
      eventState: { status: 'completed', attempt_count: 1 },
    })
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, duplicate: true })
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled()
  })

  it('imzalı checkout olayını gerçek abonelik kaydına işler', async () => {
    const stripe = {
      webhooks: { constructEvent: vi.fn().mockReturnValue(checkoutEvent()) },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_1',
          status: 'active',
          items: {
            data: [{ current_period_end: 1_800_000_000 }],
          },
        }),
      },
    }
    const admin = createAdminClient()
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(admin.writes).toContainEqual({
      table: 'user_subscriptions',
      value: expect.objectContaining({
        profile_id: 'profile-1',
        plan: 'pro',
        status: 'active',
        stripe_customer_id: 'cus_1',
        stripe_subscription_id: 'sub_1',
      }),
    })
    expect(admin.writes).toContainEqual({
      table: 'stripe_webhook_events',
      value: expect.objectContaining({
        status: 'completed',
      }),
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('başarısız fatura olayında aboneliği past_due yapar', async () => {
    const event = {
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      created: 1_700_000_000,
      data: {
        object: {
          customer: 'cus_1',
          period_end: 1_800_000_000,
          parent: {
            subscription_details: {
              subscription: 'sub_1',
              metadata: { profile_id: 'profile-1', plan_key: 'pro' },
            },
          },
        },
      },
    }
    const stripe = {
      webhooks: { constructEvent: vi.fn().mockReturnValue(event) },
    }
    const admin = createAdminClient({
      subscription: { profile_id: 'profile-1', plan: 'pro' },
    })
    mocks.getStripeClient.mockReturnValue(stripe)
    mocks.createAdminSupabaseClient.mockReturnValue(admin)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(admin.writes).toContainEqual({
      table: 'user_subscriptions',
      value: expect.objectContaining({
        status: 'past_due',
      }),
    })
  })
})
