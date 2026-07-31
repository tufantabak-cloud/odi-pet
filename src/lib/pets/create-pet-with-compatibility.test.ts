import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createPetWithCompatibility } from './create-pet-with-compatibility'

function clientWith(options: {
  rpcData?: unknown
  rpcError?: { code?: string; message: string } | null
  legacyError?: { code?: string; message: string } | null
}) {
  const single = vi.fn().mockResolvedValue({
    data: options.legacyError ? null : { id: 'pet-1', name: 'Odi' },
    error: options.legacyError ?? null,
  })
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => (
    table === 'pets' ? { insert } : { upsert }
  ))
  const rpc = vi.fn().mockResolvedValue({
    data: options.rpcData ?? null,
    error: options.rpcError ?? null,
  })

  return {
    supabase: { rpc, from } as unknown as SupabaseClient<Database>,
    rpc,
    from,
    insert,
    upsert,
  }
}

describe('createPetWithCompatibility', () => {
  it('uses the canonical RPC when it is available', async () => {
    const client = clientWith({
      rpcData: { id: 'pet-rpc', name: 'Odi' },
      rpcError: null,
    })

    const result = await createPetWithCompatibility(
      client.supabase,
      'user-1',
      { name: 'Odi', species: 'dog', breed: 'Pug' }
    )

    expect(result).toMatchObject({
      data: { id: 'pet-rpc', name: 'Odi' },
      error: null,
      usedLegacyFallback: false,
    })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('falls back only when the canonical RPC is missing from the schema cache', async () => {
    const client = clientWith({
      rpcError: {
        code: 'PGRST202',
        message: 'Could not find the function public.create_pet_with_primary_membership(p_payload)',
      },
    })

    const result = await createPetWithCompatibility(
      client.supabase,
      'user-1',
      { name: 'Odi', species: 'dog', breed: 'Pug' }
    )

    expect(result).toMatchObject({
      data: { id: 'pet-1', name: 'Odi' },
      error: null,
      usedLegacyFallback: true,
    })
    expect(client.insert).toHaveBeenCalledWith({
      name: 'Odi',
      species: 'dog',
      breed: 'Pug',
      owner_id: 'user-1',
    })
    expect(client.upsert).toHaveBeenCalledWith(
      {
        pet_id: 'pet-1',
        profile_id: 'user-1',
        role: 'owner',
      },
      { onConflict: 'pet_id,profile_id' }
    )
  })

  it('does not hide unrelated database errors', async () => {
    const client = clientWith({
      rpcError: {
        code: '42501',
        message: 'permission denied',
      },
    })

    const result = await createPetWithCompatibility(
      client.supabase,
      'user-1',
      { name: 'Odi', species: 'dog', breed: 'Pug' }
    )

    expect(result).toMatchObject({
      error: { code: '42501' },
      usedLegacyFallback: false,
    })
    expect(client.from).not.toHaveBeenCalled()
  })
})
