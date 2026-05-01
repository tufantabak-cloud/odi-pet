'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function evaluateHabitTriggers(params: { overdueCount: number, wellnessScore: number, hasActivity: boolean }) {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createServerSupabaseClient()
  
  // 1. Fetch today's notifications for this user
  const todayStr = new Date().toISOString().split('T')[0]
  
  const { data: todayNotifs } = await supabase
    .from('notifications_log')
    .select('*')
    .eq('profile_id', user.id)
    .gte('sent_at', `${todayStr}T00:00:00Z`)
    .lte('sent_at', `${todayStr}T23:59:59Z`)
    
  const sentCount = todayNotifs?.length || 0
  const sentTypes = todayNotifs?.map(n => n.type) || []

  // Anti-spam: max 2 per day
  if (sentCount >= 2) return null

  // Priority Evaluation
  let targetType = ''
  let targetMessage = ''

  if (params.overdueCount > 0) {
    targetType = 'overdue'
    targetMessage = 'Gecikmiş göreviniz var. Lütfen hemen tamamlayın.'
  } else if (params.wellnessScore < 50) {
    targetType = 'low_score'
    targetMessage = 'Bugün bakım eksik. Skoru yükseltmek için bir görev tamamla.'
  } else if (!params.hasActivity && new Date().getHours() >= 10) {
    targetType = 'morning'
    targetMessage = 'Bugün henüz bakım yapılmadı. Haydi bir şeyler kaydet!'
  } else if (params.wellnessScore > 80) {
    targetType = 'high_score'
    targetMessage = 'Harika gidiyorsun! Dostunun bakımı kusursuz.'
  }

  if (!targetType) return null

  // Anti-spam: Do not send same type twice a day
  if (sentTypes.includes(targetType)) {
    // If the top priority was already sent, we could check the next priority.
    // But keeping it simple: if the current state dictates a type we already sent, do nothing.
    return null
  }

  // Insert new notification
  const { data: newNotif, error } = await supabase
    .from('notifications_log')
    .insert({
      profile_id: user.id,
      type: targetType,
      message: targetMessage
    })
    .select('*')
    .single()

  if (error) {
    console.error('[HabitEngine] error inserting notification:', error)
    return null
  }

  return newNotif
}
