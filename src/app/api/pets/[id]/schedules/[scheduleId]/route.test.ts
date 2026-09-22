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

import { PATCH, DELETE } from './route'

const PET_ID = 'pet-123'
const SCHEDULE_ID = 'schedule-456'

function makeParams() {
  return { params: Promise.resolve({ id: PET_ID, scheduleId: SCHEDULE_ID }) }
}

function createPatchRequest(body: unknown): Request {
  return new Request(`http://localhost/api/pets/${PET_ID}/schedules/${SCHEDULE_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createDeleteRequest(): Request {
  return new Request(`http://localhost/api/pets/${PET_ID}/schedules/${SCHEDULE_ID}`, {
    method: 'DELETE',
  })
}

describe('PATCH /api/pets/[id]/schedules/[scheduleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('rejects unauthorized requests with 401', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const res = await PATCH(createPatchRequest({ status: 'completed' }) as any, makeParams())
    expect(res.status).toBe(401)
  })

  it('updates status to "done" when given "completed" without sending nonexistent "completed" or "completed_at" columns', async () => {
    let capturedUpdates: any = null

    const single = vi.fn().mockResolvedValue({
      data: { id: SCHEDULE_ID, pet_id: PET_ID, status: 'done' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const eqPet = vi.fn().mockReturnValue({ select })
    const eqId = vi.fn().mockReturnValue({ eq: eqPet })
    const update = vi.fn((updates) => {
      capturedUpdates = updates
      return { eq: eqId }
    })
    const from = vi.fn().mockReturnValue({ update })

    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const res = await PATCH(createPatchRequest({ status: 'completed' }) as any, makeParams())
    expect(res.status).toBe(200)

    expect(capturedUpdates).toBeDefined()
    expect(capturedUpdates.status).toBe('done')
    // Crucial: Must NOT contain 'completed' or 'completed_at'
    expect(capturedUpdates.completed).toBeUndefined()
    expect(capturedUpdates.completed_at).toBeUndefined()
  })

  it('handles postponement by mapping scheduled_at to due_date', async () => {
    let capturedUpdates: any = null

    const single = vi.fn().mockResolvedValue({
      data: { id: SCHEDULE_ID, pet_id: PET_ID, due_date: '2026-09-25' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const eqPet = vi.fn().mockReturnValue({ select })
    const eqId = vi.fn().mockReturnValue({ eq: eqPet })
    const update = vi.fn((updates) => {
      capturedUpdates = updates
      return { eq: eqId }
    })
    const from = vi.fn().mockReturnValue({ update })

    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const res = await PATCH(createPatchRequest({ scheduled_at: '2026-09-25' }) as any, makeParams())
    expect(res.status).toBe(200)
    expect(capturedUpdates.due_date).toBe('2026-09-25')
  })
})

describe('DELETE /api/pets/[id]/schedules/[scheduleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('soft cancels health schedule per OPOS Cilt 5', async () => {
    let capturedUpdates: any = null

    const eqPet = vi.fn().mockResolvedValue({ error: null })
    const eqId = vi.fn().mockReturnValue({ eq: eqPet })
    const update = vi.fn((updates) => {
      capturedUpdates = updates
      return { eq: eqId }
    })
    const from = vi.fn().mockReturnValue({ update })

    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const res = await DELETE(createDeleteRequest() as any, makeParams())
    expect(res.status).toBe(200)
    expect(capturedUpdates.status).toBe('cancelled')
  })
})
