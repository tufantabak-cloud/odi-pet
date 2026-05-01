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
