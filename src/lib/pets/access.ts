import 'server-only'

import type { createServerSupabaseClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>

export type PetCapability =
  | 'can_view_pet'
  | 'can_edit_pet_profile'
  | 'can_manage_pet_care'
  | 'can_manage_pet_caregivers'
  | 'can_publish_pet_lost_report'
  | 'can_manage_pet_ownership'
  | 'can_delete_pet'
  | 'can_manage_pet_billing'
  | 'is_primary_pet_owner'

export async function hasPetCapability(
  supabase: ServerSupabaseClient,
  petId: string,
  capability: PetCapability
): Promise<boolean> {
  const { data, error } = await supabase.rpc(capability, {
    p_pet_id: petId,
  })

  if (error) {
    console.error('[pet-access] capability check failed', {
      capability,
      petId,
      code: error.code,
    })
    return false
  }

  return data === true
}

export function ownershipRpcSucceeded(
  value: unknown
): value is Record<string, unknown> & { ok: true } {
  return (
    typeof value === 'object'
    && value !== null
    && 'ok' in value
    && value.ok === true
  )
}

export function ownershipRpcCode(value: unknown): string | null {
  if (
    typeof value !== 'object'
    || value === null
    || !('code' in value)
    || typeof value.code !== 'string'
  ) {
    return null
  }

  return value.code
}
