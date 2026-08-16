import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import type { NextRequest } from 'next/server'
import { PATCH } from './route'

const PET_ID = 'pet-1'
const USER_ID = 'user-1'
const STRANGER_PET_ID = 'pet-stranger'

function createRequest(body: unknown): NextRequest {
  return new Request(`http://localhost/api/breeding-listings/${PET_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function makeContext(id: string = PET_ID) {
  return { params: Promise.resolve({ id }) }
}

/**
 * FORENSIC DÜZELTME testi: PATCH /api/breeding-listings/[id]
 *
 * Test edilen davranışlar:
 *  1. pet_owners tabanlı sahiplik kontrolü (mevcut, kanıtlanmış desen) — değiştirilmedi.
 *  2. Mass-assignment engeli: client body'sindeki `pet_id`/`user_id`/`id` gibi
 *     authorization alanları ASLA `breeding_listings.update()` çağrısına geçmez;
 *     yalnızca whitelist edilmiş ilan alanları (title, purpose, notes, vb.) geçer.
 */
function mockSupabase({
  hasOwnership = true,
  updateError = null as unknown,
  listingForClose = null as { id: string; title: string } | null,
}: {
  hasOwnership?: boolean
  updateError?: unknown
  listingForClose?: { id: string; title: string } | null
} = {}) {
  const capturedUpdatePayloads: Record<string, unknown>[] = []

  const petOwnersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: hasOwnership ? { role: 'owner' } : null,
    }),
  }

  const breedingListingsQuery: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: listingForClose }),
    // Route: .update(payload).eq('pet_id', id).eq('user_id', user.id)
    // İki zincirli .eq() çağrısını taklit eder; ikinci .eq() sonucu döndürür.
    update: vi.fn((payload: Record<string, unknown>) => {
      capturedUpdatePayloads.push(payload)
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: updateError }),
        }),
      }
    }),
  }

  // Route: .select(...).eq('listing_id', ...).eq('status', 'pending')
  const breedingApplicationsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [] }),
    }),
  }

  const notificationJobsQuery = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }

  const from = vi.fn((table: string) => {
    if (table === 'pet_owners') return petOwnersQuery
    if (table === 'breeding_listings') return breedingListingsQuery
    if (table === 'breeding_applications') return breedingApplicationsQuery
    if (table === 'notification_jobs') return notificationJobsQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  mocks.createServerSupabaseClient.mockResolvedValue({ from })
  return { from, capturedUpdatePayloads, breedingListingsQuery }
}

describe('PATCH /api/breeding-listings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: USER_ID })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await PATCH(createRequest({ title: 'x' }), makeContext())

    expect(response.status).toBe(401)
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })

  it('pet_owners üyeliği olmayan kullanıcı 401 ile reddedilir (mevcut ownership deseni korunuyor)', async () => {
    mockSupabase({ hasOwnership: false })

    const response = await PATCH(createRequest({ title: 'Yeni başlık' }), makeContext())

    expect(response.status).toBe(401)
  })

  it('body boş/geçersiz alanlardan oluşuyorsa 400 döner ve update çağrılmaz', async () => {
    const { breedingListingsQuery } = mockSupabase()

    const response = await PATCH(createRequest({ unknown_field: 'zararlı' }), makeContext())

    expect(response.status).toBe(400)
    expect(breedingListingsQuery.update).not.toHaveBeenCalled()
  })

  it('MASS-ASSIGNMENT ENGELİ: body içindeki pet_id/user_id/id whitelist dışı bırakılır, update payload’a asla girmez', async () => {
    const { capturedUpdatePayloads } = mockSupabase()

    const response = await PATCH(
      createRequest({
        title: 'Güncellenmiş başlık',
        pet_id: STRANGER_PET_ID, // saldırı denemesi: başka bir pet'e bağlama
        user_id: 'attacker-controlled-id', // saldırı denemesi: sahiplik değiştirme
        id: 'arbitrary-pk-override', // saldırı denemesi: PK üzerine yazma
      }),
      makeContext()
    )

    expect(response.status).toBe(200)
    expect(capturedUpdatePayloads).toHaveLength(1)
    const payload = capturedUpdatePayloads[0]
    expect(payload).toEqual({ title: 'Güncellenmiş başlık' })
    expect(payload).not.toHaveProperty('pet_id')
    expect(payload).not.toHaveProperty('user_id')
    expect(payload).not.toHaveProperty('id')
  })

  it('izin verilen alanlar (title, notes, status vb.) doğru şekilde geçer', async () => {
    const { capturedUpdatePayloads } = mockSupabase()

    const response = await PATCH(
      createRequest({
        title: 'Başlık',
        notes: 'Not',
        requirements: ['aşılı'],
        photo_url: 'https://example.com/photo.jpg',
        estrus_notification_enabled: true,
        experience_level: 'experienced',
      }),
      makeContext()
    )

    expect(response.status).toBe(200)
    expect(capturedUpdatePayloads[0]).toEqual({
      title: 'Başlık',
      notes: 'Not',
      requirements: ['aşılı'],
      photo_url: 'https://example.com/photo.jpg',
      estrus_notification_enabled: true,
      experience_level: 'experienced',
    })
  })

  it('status=closed akışı, whitelisted update ile birlikte hâlâ çalışır (regresyon)', async () => {
    const { capturedUpdatePayloads } = mockSupabase({
      listingForClose: { id: 'listing-1', title: 'İlan' },
    })

    const response = await PATCH(createRequest({ status: 'closed' }), makeContext())

    expect(response.status).toBe(200)
    expect(capturedUpdatePayloads[0]).toEqual({ status: 'closed' })
  })
})
