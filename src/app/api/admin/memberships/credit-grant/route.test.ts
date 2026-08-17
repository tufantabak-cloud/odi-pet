import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import * as supabaseServer from '@/lib/supabase/server'
import { POST } from '@/app/api/admin/memberships/credit-grant/route'

vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
  }
})

vi.mock('@/lib/supabase/server', async () => {
  return {
    createAdminSupabaseClient: () => ({
      from: (table: string) => {
        const chain = {
          select: () => chain,
          in: () => chain,
          eq: () => chain,
          single: async () => {
            const user = await authModule.getSessionUser()
            if (table === 'profiles') {
              if (user && user.id === '00000000-0000-0000-0000-000000000002') return { data: { role: 'owner' }, error: null }
              return { data: { role: 'admin' }, error: null }
            }
            return { data: null, error: null }
          },
          insert: async () => ({ error: null })
        }
        return chain
      },
      rpc: async () => ({ data: null, error: null })
    }),
    createServerSupabaseClient: vi.fn()
  }
})

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const pgClient = new Client({ connectionString: dbUrl })

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

describe('Admin API: POST /api/admin/memberships/credit-grant', () => {
  const testAdminId = '00000000-0000-0000-0000-000000000001'
  const testUserId = '00000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    await pgClient.connect()
    // Cleanup any existing fixtures
    await pgClient.query(`DELETE FROM public.membership_events WHERE profile_id IN ($1, $2)`, [testAdminId, testUserId])
    await pgClient.query(`DELETE FROM public.membership_credits WHERE profile_id IN ($1, $2)`, [testAdminId, testUserId])
    await pgClient.query(`DELETE FROM public.user_subscriptions WHERE profile_id IN ($1, $2)`, [testAdminId, testUserId])
    await pgClient.query(`DELETE FROM auth.users WHERE id IN ($1, $2)`, [testAdminId, testUserId])
    
    // Create admin user
    await pgClient.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ($1, 'admin@test.com', '{"role":"admin"}')
    `, [testAdminId])
    await pgClient.query(`
      INSERT INTO public.profiles (id, email, role)
      VALUES ($1, 'admin@test.com', 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin'
    `, [testAdminId])

    // Create standard user
    await pgClient.query(`
      INSERT INTO auth.users (id, email)
      VALUES ($1, 'user@test.com')
      ON CONFLICT (id) DO NOTHING
    `, [testUserId])
    await pgClient.query(`
      INSERT INTO public.profiles (id, email, role)
      VALUES ($1, 'user@test.com', 'owner')
      ON CONFLICT (id) DO UPDATE SET role = 'owner'
    `, [testUserId])
    await pgClient.query(`
      INSERT INTO public.user_subscriptions (profile_id, plan, status)
      VALUES ($1, 'free', 'expired')
      ON CONFLICT (profile_id) DO UPDATE SET plan = 'free', status = 'expired', ai_plus_until = NULL, pro_until = NULL
    `, [testUserId])
  })

  afterAll(async () => {
    // CLEANUP
    await pgClient.query(`DELETE FROM public.membership_events WHERE profile_id = $1`, [testUserId])
    await pgClient.query(`DELETE FROM public.membership_credits WHERE profile_id = $1`, [testUserId])
    await pgClient.query(`DELETE FROM public.user_subscriptions WHERE profile_id = $1`, [testUserId])
    await pgClient.query(`DELETE FROM public.profiles WHERE id IN ($1, $2)`, [testAdminId, testUserId])
    await pgClient.query(`DELETE FROM auth.users WHERE id IN ($1, $2)`, [testAdminId, testUserId])
    await pgClient.end()
  })

  it('TEST 1 — ADMIN +30', async () => {
    // mock session
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testAdminId } as any)

    // Ensure state is clean FREE
    await pgClient.query(`DELETE FROM public.membership_credits WHERE profile_id = $1`, [testUserId])
    await pgClient.query(`
      UPDATE public.user_subscriptions 
      SET plan = 'free', status = 'expired', ai_plus_until = NULL, pro_until = NULL 
      WHERE profile_id = $1
    `, [testUserId])

    const req = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: [testUserId],
        days: 30,
        reason: 'campaign',
        note: 'Test +30'
      })
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify DB
    const sub = await pgClient.query(`SELECT * FROM public.user_subscriptions WHERE profile_id = $1`, [testUserId])
    expect(sub.rows.length).toBe(1)
    expect(sub.rows[0].plan).toBe('pro')
    expect(sub.rows[0].status).toBe('active')

    const prof = await pgClient.query(`SELECT premium_tier, premium_until FROM public.profiles WHERE id = $1`, [testUserId])
    expect(prof.rows[0].premium_tier).toBe('pro')

    const creds = await pgClient.query(`SELECT * FROM public.membership_credits WHERE profile_id = $1`, [testUserId])
    expect(creds.rows.length).toBe(1)
    const daysKey = Object.keys(creds.rows[0]).find(k => k.includes('day') || k.includes('amount'))
    expect(creds.rows[0][daysKey!]).toBe(30)
  })

  it('TEST 2 — IDEMPOTENCY', async () => {
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testAdminId } as any)

    // Find the idempotency key used in the previous request by scanning the ledger (in real life it's generated by TS, but here we can't easily extract it unless we mock Date.now, wait we didn't mock Date.now)
    // Actually the API route generates a new idempotency key `admin_grant:${timestamp}:${targetUserId}` for EACH request.
    // So to test idempotency, we must test the RPC directly with the SAME idempotency key, OR mock the idempotency key generation in the API route.
    // Wait, the test says: "Aynı request'i aynı idempotency_key ile ikinci kez gönder."
    // But the API route generates the key dynamically: `const timestamp = Date.now(); const idempotencyKey = admin_grant:...`
    // We can mock Date.now()!
    const mockDate = new Date(2026, 8, 16).getTime()
    vi.spyOn(Date, 'now').mockReturnValue(mockDate)

    const req1 = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: [testUserId],
        days: 15,
        reason: 'campaign'
      })
    })
    await POST(req1)

    const creds1 = await pgClient.query(`SELECT * FROM public.membership_credits WHERE profile_id = $1`, [testUserId])
    const countAfterFirst = creds1.rows.length

    // send identical request (since Date.now is mocked, timestamp is identical -> idempotencyKey is identical)
    const req2 = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: [testUserId],
        days: 15,
        reason: 'campaign'
      })
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(200)

    const creds2 = await pgClient.query(`SELECT * FROM public.membership_credits WHERE profile_id = $1`, [testUserId])
    expect(creds2.rows.length).toBe(countAfterFirst) // ledger didn't increment
    
    vi.restoreAllMocks()
  })

  it('TEST 3 — SECURITY', async () => {
    // Anon RPC
    const anonClient = createClient(supabaseUrl, anonKey)
    const { error: anonErr } = await anonClient.rpc('grant_membership_credit', {
      p_profile_id: testUserId, p_days: 10, p_reason: 'test', p_idempotency_key: 'test3', p_metadata: {}
    })
    expect(anonErr?.message).toMatch(/permission denied|Could not find the function/i)

    // API Authorization check (unauthorized user)
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testUserId } as any)
    const req = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({ user_ids: [testUserId], days: 10 })
    })
    const res = await POST(req)
    expect(res.status).toBe(403) // Forbidden: Admin yetkisi gerekli
  })

  it('TEST 4 — ROLLING', async () => {
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testAdminId } as any)

    // Reset sub
    await pgClient.query(`DELETE FROM public.user_subscriptions WHERE profile_id = $1`, [testUserId])
    
    const now = new Date()
    const aiPlusEnd = new Date(now.getTime() + 10 * 86400000)
    const proEnd = new Date(aiPlusEnd.getTime() + 20 * 86400000) // 20 days queue

    await pgClient.query(`
      INSERT INTO public.user_subscriptions (profile_id, plan, status, ai_plus_until, pro_until)
      VALUES ($1, 'ai_plus', 'active', $2, $3)
    `, [testUserId, aiPlusEnd.toISOString(), proEnd.toISOString()])

    const req = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({ user_ids: [testUserId], days: 30 })
    })
    await POST(req)

    const sub = await pgClient.query(`SELECT * FROM public.user_subscriptions WHERE profile_id = $1`, [testUserId])
    const updatedAiPlus = new Date(sub.rows[0].ai_plus_until).getTime()
    const updatedPro = new Date(sub.rows[0].pro_until).getTime()

    // AI+ extended by 30 days
    expect(updatedAiPlus - aiPlusEnd.getTime()).toBeGreaterThan(29 * 86400000)
    // PRO queue 20 days preserved (so it ends 20 days after AI+)
    expect(updatedPro - updatedAiPlus).toBeGreaterThan(19 * 86400000)
  })

  it('TEST 5 — USER/ADMIN EŞLEŞMESİ', async () => {
    // We already checked profiles premium_tier and premium_until in TEST 1
    const prof = await pgClient.query(`SELECT premium_tier, premium_until FROM public.profiles WHERE id = $1`, [testUserId])
    const sub = await pgClient.query(`SELECT plan, pro_until, ai_plus_until FROM public.user_subscriptions WHERE profile_id = $1`, [testUserId])
    
    // In our implementation, the derived cache `premium_tier` and `premium_until` in profiles matches `user_subscriptions`
    expect(prof.rows[0].premium_tier).toBe(sub.rows[0].plan)
  })

  it('TEST 7 — ERROR HANDLING', async () => {
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testAdminId } as any)

    // Trigger error by sending invalid JSON to the DB RPC (or passing string instead of array to user_ids to fail API)
    const req = new NextRequest('http://localhost:3000/api/admin/memberships/credit-grant', {
      method: 'POST',
      body: JSON.stringify({ user_ids: ["invalid-uuid"], days: 30 })
    })
    const res = await POST(req)
    expect(res.status).toBe(500) // API translates RPC error to 500

    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
