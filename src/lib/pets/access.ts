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
    if (capability !== 'can_view_pet') {
      console.error('[pet-access] capability RPC failed (strict check):', {
        capability,
        petId,
        code: error.code,
        message: error.message,
      })
      return false
    }

    console.warn('[pet-access] can_view_pet RPC failed, falling back to legacy check:', {
      capability,
      petId,
      code: error.code,
      message: error.message,
    })

    // Fallback logic for environments where RPC functions are not yet migrated
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) return false

    const uid = authData.user.id
    const [{ data: pet }, { data: membership }] = await Promise.all([
      supabase.from('pets').select('id').eq('id', petId).eq('owner_id', uid).maybeSingle(),
      supabase.from('pet_memberships').select('id').eq('pet_id', petId).eq('profile_id', uid).eq('status', 'active').maybeSingle(),
    ])

    return !!(pet || membership)
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
