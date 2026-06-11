import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

/* ── Dashboard veri sözleşmesi ────────────────────────────── */

/** Profil verisi — sadece selamlama için kullanılıyor */
interface DashboardProfile {
  first_name: string
}

/**
 * Pet kaydı — Supabase select('*') sonucu.
 * page.tsx'in kullandığı tüm property'ler burada tanımlı;
 * index signature Supabase'in ek alan döndürmesine izin verir.
 */
export interface DashboardPet {
  id: string
  owner_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string
  avatar_url: string | null
  created_at: string
  [key: string]: unknown
}

/**
 * Health schedule kaydı — join relations dahil.
 * page.tsx due_date, due_time, title, pet_id, id, status ve
 * vaccines/pets join'lerini kullanır.
 */
export interface DashboardSchedule {
  id: string
  pet_id: string
  due_date: string
  due_time: string | null
  title: string | null
  status: string
  updated_at: string
  vaccines: { name: string } | null
  pets: { name: string } | null
  [key: string]: unknown
}

/** Feeding log — sadece son beslenme zamanı hesabı için */
export interface DashboardFeedingLog {
  pet_id: string
  created_at: string
}

/** Weight log — son ağırlık/boy gösterimi için */
export interface DashboardWeightLog {
  pet_id: string
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
}

/**
 * fetchDashboardData'nın dönüş tipi.
 * page.tsx bu yapıya güvenerek destructure eder.
 */
export interface DashboardData {
  profile: DashboardProfile | null
  pets: DashboardPet[]
  upcomingSchedules: DashboardSchedule[]
  completedSchedules: DashboardSchedule[]
  allFeedingLogs: DashboardFeedingLog[]
  allWeightLogs: DashboardWeightLog[]
}

/* ── Cache'li veri çekme ──────────────────────────────────── */

/**
 * Dashboard verilerini kullanıcı bazlı önbelleğe alır.
 * Tag: `dashboard-{userId}` → API route'lardan revalidateTag ile temizlenir.
 * TTL: 30 saniye — Stale veri penceresi kısa tutulur.
 *
 * Hata stratejisi:
 * - profile   → sessiz geç (null döner, sayfa fallback gösterir)
 * - pets      → KRİTİK — hata varsa throw (error.tsx tetiklenir)
 * - schedules → sessiz geç (boş array)
 * - logs      → sessiz geç (boş array)
 */
export async function getCachedDashboardData(userId: string): Promise<DashboardData> {
  const fetchDashboardData = unstable_cache(
    async (uid: string): Promise<DashboardData> => {
      const supabase = createAdminSupabaseClient()

      try {
        /* ── Profile (sessiz) ────────────────────────────── */
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', uid)
          .single()

        if (profileError) {
          console.error('[dashboard] profile fetch failed:', profileError.message)
        }

        /* ── Pets (KRİTİK) ──────────────────────────────── */
        const { data: pets, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false })

        if (petsError) {
          console.error('[dashboard] pets fetch failed:', petsError.message)
          throw new Error(`Pets sorgu hatası: ${petsError.message}`)
        }

        /* ── Health schedules (sessiz) ───────────────────── */
        let upcomingSchedules: DashboardSchedule[] = []
        let completedSchedules: DashboardSchedule[] = []

        if (pets && pets.length > 0) {
          const petIdList = pets.map((p) => p.id)

          const { data: upcoming, error: upcomingError } = await supabase
            .from('health_schedules')
            .select('*, vaccines(name), pets(name)')
            .in('pet_id', petIdList)
            .neq('status', 'done')

          if (upcomingError) {
            console.error('[dashboard] upcoming schedules fetch failed:', upcomingError.message)
          } else if (upcoming) {
            upcomingSchedules = upcoming as DashboardSchedule[]
          }

          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data: completed, error: completedError } = await supabase
            .from('health_schedules')
            .select('*, vaccines(name), pets(name)')
            .in('pet_id', petIdList)
            .in('status', ['completed', 'done'])
            .gte('updated_at', yesterday)

          if (completedError) {
            console.error('[dashboard] completed schedules fetch failed:', completedError.message)
          } else if (completed) {
            completedSchedules = completed as DashboardSchedule[]
          }
        }

        /* ── Feeding & weight logs (sessiz) ──────────────── */
        const petIds = (pets || []).map((p) => p.id)
        let allFeedingLogs: DashboardFeedingLog[] = []
        let allWeightLogs: DashboardWeightLog[] = []

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

          if (feedingRes.error) {
            console.error('[dashboard] feeding logs fetch failed:', feedingRes.error.message)
          } else {
            allFeedingLogs = (feedingRes.data as DashboardFeedingLog[]) || []
          }

          if (weightRes.error) {
            console.error('[dashboard] weight logs fetch failed:', weightRes.error.message)
          } else {
            allWeightLogs = (weightRes.data as DashboardWeightLog[]) || []
          }
        }

        /* ── Güvenli return ──────────────────────────────── */
        return {
          profile: profileError ? null : (profile as DashboardProfile | null),
          pets: (pets || []) as DashboardPet[],
          upcomingSchedules,
          completedSchedules,
          allFeedingLogs,
          allWeightLogs,
        }
      } catch (err) {
        console.error('[dashboard] fetchDashboardData fatal:', err)
        throw err // Re-throw → error.tsx tetiklenir
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
