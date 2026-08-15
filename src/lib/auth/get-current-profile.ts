import { createServerSupabaseClient } from '../supabase/server'

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return null
  return user
}

export async function getCurrentProfile() {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createServerSupabaseClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null
  return profile
}

export async function requireRole(allowedRoles: string[]) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  if (!allowedRoles.includes(profile.role)) return null
  return profile
}

/**
 * Returns true when the acting user is allowed to assign `targetRole`.
 * Rule: only a founder may grant the founder role to anyone else.
 */
export function canAssignRole(
  actorRole: string,
  targetRole: string
): boolean {
  if (targetRole === 'founder') return actorRole === 'founder'
  // admin / founder can assign non-founder roles
  return actorRole === 'admin' || actorRole === 'founder'
}

/**
 * Server-side guard: resolves the current profile and throws a 403-shaped
 * error string when the caller is not a founder.
 * Usage: const profile = await assertFounder()
 */
export async function assertFounder() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'founder') return null
  return profile
}
