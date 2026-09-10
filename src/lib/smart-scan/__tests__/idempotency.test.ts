import { describe, it, expect, vi } from 'vitest'

describe('Smart Scan Pet Creation Idempotency', () => {
  it('detects and replays existing pet creation without duplicates when given same idempotency key', async () => {
    const existingPetId = 'pet-uuid-12345'
    const sessionId = 'session-uuid-abcde'
    const idempotencyKey = 'idemp-key-unique-999'

    // Mock RPC returning idempotent replay
    const mockRpc = vi.fn().mockResolvedValueOnce({
      data: {
        success: true,
        pet_id: existingPetId,
        idempotent_replay: false,
        session_id: sessionId,
      },
      error: null,
    }).mockResolvedValueOnce({
      data: {
        success: true,
        pet_id: existingPetId,
        idempotent_replay: true,
        session_id: sessionId,
      },
      error: null,
    })

    // First call
    const firstResult = await mockRpc('create_pet_from_smart_scan', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_pet_payload: { name: 'Lokum', species: 'cat', breed: 'Tekir' },
    })

    expect(firstResult.data.success).toBe(true)
    expect(firstResult.data.pet_id).toBe(existingPetId)
    expect(firstResult.data.idempotent_replay).toBe(false)

    // Second call with same idempotency key
    const replayResult = await mockRpc('create_pet_from_smart_scan', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_pet_payload: { name: 'Lokum', species: 'cat', breed: 'Tekir' },
    })

    expect(replayResult.data.success).toBe(true)
    expect(replayResult.data.pet_id).toBe(existingPetId)
    expect(replayResult.data.idempotent_replay).toBe(true)
  })
})
