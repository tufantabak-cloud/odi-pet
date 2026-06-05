import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const checkSubscription = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('profile_id', userId)
    .single()
  if (!data) return false
  return data.plan === 'pro' || data.plan === 'ai_plus'
})
