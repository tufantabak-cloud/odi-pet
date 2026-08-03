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

/** Kanonik rol merdiveni — public.pet_membership_role ile birebir aynı. */
type PetRole =
  | 'primary_owner'
  | 'co_owner'
  | 'care_admin'
  | 'care_editor'
  | 'viewer'

/**
 * Capability → izinli roller. 20260728120000_canonical_pet_memberships_phase0
 * içindeki SQL capability fonksiyonlarının birebir aynası. Bu tablo değişirse
 * SQL tarafı da aynı migration'da güncellenmelidir.
 */
const CAPABILITY_ROLES: Record<PetCapability, readonly PetRole[]> = {
  can_view_pet: ['primary_owner', 'co_owner', 'care_admin', 'care_editor', 'viewer'],
  can_edit_pet_profile: ['primary_owner', 'co_owner'],
  can_manage_pet_care: ['primary_owner', 'co_owner', 'care_admin', 'care_editor'],
  can_manage_pet_caregivers: ['primary_owner', 'co_owner', 'care_admin'],
  can_publish_pet_lost_report: ['primary_owner', 'co_owner'],
  can_manage_pet_ownership: ['primary_owner'],
  can_delete_pet: ['primary_owner'],
  can_manage_pet_billing: ['primary_owner'],
  is_primary_pet_owner: ['primary_owner'],
}

/** pet_members.role → kanonik rol eşlemesi (SQL current_pet_role ile aynı). */
const LEGACY_MEMBER_ROLE_MAP: Record<string, PetRole> = {
  owner: 'co_owner',
  admin: 'care_admin',
  editor: 'care_editor',
  viewer: 'viewer',
}

/**
 * public.current_pet_role() fonksiyonunun TypeScript aynası. Yalnızca kanonik
 * RPC kullanılamadığında (membership migration'ı henüz uygulanmamış ortamlar)
 * devreye girer. Çözümleme sırası SQL ile birebir aynıdır:
 *   1) pet_memberships (status='active')
 *   2) pets.owner_id            → primary_owner
 *   3) pet_owners (role='owner') → co_owner
 *   4) pet_members              → rol eşlemesi
 * Öncelik sırası korunduğu için RPC'li ve RPC'siz davranış aynıdır.
 */
async function resolvePetRoleFallback(
  supabase: ServerSupabaseClient,
  petId: string
): Promise<PetRole | null> {
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData?.user?.id
  if (!uid) return null

  const [
    { data: membership },
    { data: pet },
    { data: legacyOwner },
    { data: legacyMember },
  ] = await Promise.all([
    supabase
      .from('pet_memberships')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', uid)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('pets').select('id').eq('id', petId).eq('owner_id', uid).maybeSingle(),
    supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', uid)
      .eq('role', 'owner')
      .maybeSingle(),
    supabase
      .from('pet_members')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', uid)
      .maybeSingle(),
  ])

  if (membership?.role) return membership.role as PetRole
  if (pet) return 'primary_owner'
  if (legacyOwner) return 'co_owner'
  if (legacyMember?.role) return LEGACY_MEMBER_ROLE_MAP[legacyMember.role] ?? null

  return null
}

export async function hasPetCapability(
  supabase: ServerSupabaseClient,
  petId: string,
  capability: PetCapability
): Promise<boolean> {
  const { data, error } = await supabase.rpc(capability, {
    p_pet_id: petId,
  })

  if (error) {
    // Kanonik RPC'ler henüz uygulanmamış ortamlarda, aynı rol modelini
    // uygulama katmanında çözerek RPC'li davranışın birebir aynısını üretiriz.
    console.warn('[pet-access] capability RPC unavailable, using canonical fallback:', {
      capability,
      petId,
      code: error.code,
      message: error.message,
    })

    const role = await resolvePetRoleFallback(supabase, petId)
    if (!role) return false

    return CAPABILITY_ROLES[capability].includes(role)
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
