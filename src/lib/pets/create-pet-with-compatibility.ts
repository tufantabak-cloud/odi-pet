import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'

type PetInsert = Database['public']['Tables']['pets']['Insert']

type CreatedPet = {
  id: string
  name?: string
}

type CreatePetResult = {
  data: CreatedPet | Json | null
  error: {
    code?: string
    message: string
  } | null
  usedLegacyFallback: boolean
}

function isMissingCreatePetRpc(error: { code?: string; message?: string } | null): boolean {
  return error?.code === 'PGRST202'
    && Boolean(error.message?.includes('create_pet_with_primary_membership'))
}

/**
 * Uses the canonical atomic RPC when available. The linked remote database can
 * temporarily lag behind the application migration, so only a confirmed
 * missing-RPC error falls back to the legacy schema.
 */
export async function createPetWithCompatibility(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PetInsert
): Promise<CreatePetResult> {
  const rpcResult = await supabase.rpc('create_pet_with_primary_membership', {
    p_payload: payload,
  })

  if (!isMissingCreatePetRpc(rpcResult.error)) {
    return {
      data: rpcResult.data,
      error: rpcResult.error,
      usedLegacyFallback: false,
    }
  }

  console.warn(
    '[pet-create] Canonical RPC is missing; using the legacy owner_id-compatible insert.'
  )

  const legacyResult = await supabase
    .from('pets')
    .insert({
      ...payload,
      owner_id: userId,
    })
    .select('id, name')
    .single()

  if (legacyResult.error || !legacyResult.data) {
    return {
      data: legacyResult.data,
      error: legacyResult.error,
      usedLegacyFallback: true,
    }
  }

  // The existing pets trigger writes pet_members in the same transaction.
  // Keep the second legacy ownership mirror aligned for older readers too.
  const { error: ownerMirrorError } = await supabase
    .from('pet_owners')
    .upsert(
      {
        pet_id: legacyResult.data.id,
        profile_id: userId,
        role: 'owner',
      },
      { onConflict: 'pet_id,profile_id' }
    )

  if (ownerMirrorError) {
    console.warn('[pet-create] Legacy pet_owners mirror could not be updated:', {
      petId: legacyResult.data.id,
      code: ownerMirrorError.code,
      message: ownerMirrorError.message,
    })
  }

  return {
    data: legacyResult.data,
    error: null,
    usedLegacyFallback: true,
  }
}
