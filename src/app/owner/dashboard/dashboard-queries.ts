import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Dashboard verilerini kullanıcı bazlı önbelleğe alır.
 * Tag: `dashboard-{userId}` → API route'lardan revalidateTag ile temizlenir.
 * TTL: 30 saniye — Stale veri penceresi kısa tutulur.
 */
export async function getCachedDashboardData(userId: string) {
  const fetchDashboardData = unstable_cache(
    async (uid: string) => {
      const supabase = createAdminSupabaseClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', uid)
        .single()

      const { data: pets } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false })

      // Health schedules for all user's pets
      let upcomingSchedules: any[] = []
      let completedSchedules: any[] = []
      if (pets && pets.length > 0) {
        const { data } = await supabase
          .from('health_schedules')
          .select('*, vaccines(name), pets(name)')
          .in('pet_id', pets.map((p: any) => p.id))
          .neq('status', 'done')
        if (data) upcomingSchedules = data

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: completed } = await supabase
          .from('health_schedules')
          .select('*, vaccines(name), pets(name)')
          .in('pet_id', pets.map((p: any) => p.id))
          .in('status', ['completed', 'done'])
          .gte('updated_at', yesterday)
        if (completed) completedSchedules = completed
      }

      // Feeding & weight logs
      const petIds = (pets || []).map((p: any) => p.id)
      let allFeedingLogs: any[] = []
      let allWeightLogs: any[] = []

      if (petIds.length > 0) {
        const [feedingRes, weightRes] = await Promise.all([
          supabase
            .from('feeding_logs')
            .select('pet_id, created_at')
            .in('pet_id', petIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('weight_logs')
            .select('pet_id, measured_at, weight_kg, height_cm')
            .in('pet_id', petIds)
            .order('measured_at', { ascending: false }),
        ])
        allFeedingLogs = feedingRes.data || []
        allWeightLogs = weightRes.data || []
      }

      return {
        profile,
        pets: pets || [],
        upcomingSchedules,
        completedSchedules,
        allFeedingLogs,
        allWeightLogs,
      }
    },
    [`dashboard-${userId}`],
    {
      tags: [`dashboard-${userId}`, 'dashboard'],
      revalidate: 30, // 30 saniye TTL
    }
  )

  return fetchDashboardData(userId)
}
