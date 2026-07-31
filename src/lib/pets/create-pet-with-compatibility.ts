import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'

type PetInsert = Database['public']['Tables']['pets']['Insert']

type CreatedPet = {
  id: string
  name?: string
  species?: string
}

type CreatePetResult = {
  data: CreatedPet | Json | null
  error: {
    code?: string
    message: string
  } | null
  usedLegacyFallback: boolean
}

function isMissingAtomicPetRpc(error: { code?: string; message?: string } | null): boolean {
  return error?.code === 'PGRST202'
    && Boolean(error.message?.includes('create_pet_atomic') || error.message?.includes('create_pet_with_primary_membership'))
}

/**
 * Uses the canonical atomic RPC `create_pet_atomic` for safe, single-transaction pet creation.
 */
export async function createPetWithCompatibility(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PetInsert
): Promise<CreatePetResult> {
  // 1. Try primary atomic RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcResult = await (supabase as any).rpc('create_pet_atomic', {
    p_payload: payload as unknown as Json,
  })

  if (!rpcResult.error) {
    return {
      data: rpcResult.data as CreatedPet,
      error: null,
      usedLegacyFallback: false,
    }
  }

  // 2. Try fallback canonical RPC
  const secondaryRpcResult = await supabase.rpc('create_pet_with_primary_membership', {
    p_payload: payload as unknown as Json,
  })

  if (!secondaryRpcResult.error) {
    return {
      data: secondaryRpcResult.data as CreatedPet,
      error: null,
      usedLegacyFallback: false,
    }
  }

  if (!isMissingAtomicPetRpc(rpcResult.error)) {
    return {
      data: null,
      error: rpcResult.error,
      usedLegacyFallback: false,
    }
  }

  console.warn(
    '[pet-create] Atomic RPC is missing; using legacy fallback insert.'
  )

  const legacyResult = await supabase
    .from('pets')
    .insert({
      ...payload,
      owner_id: userId,
    })
    .select('id, name, species')
    .single()

  if (legacyResult.error || !legacyResult.data) {
    return {
      data: legacyResult.data,
      error: legacyResult.error,
      usedLegacyFallback: true,
    }
  }

  // Keep pet_memberships & pet_owners aligned for legacy fallbacks
  await supabase.from('pet_memberships').upsert({
    pet_id: legacyResult.data.id,
    profile_id: userId,
    role: 'primary_owner',
    status: 'active',
    source: 'pet_creation',
  }, { onConflict: 'pet_id,profile_id' })

  await supabase.from('pet_owners').upsert({
    pet_id: legacyResult.data.id,
    profile_id: userId,
    role: 'primary_owner',
  }, { onConflict: 'pet_id,profile_id' })

  return {
    data: legacyResult.data,
    error: null,
    usedLegacyFallback: true,
  }
}
