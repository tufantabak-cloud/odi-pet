import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getDailyQuestion, SmartQuestion } from '@/lib/profiling-engine'
import { detectAnomalies, SmartInsight } from '@/lib/insight-engine'
import { getPlanDisplayTitle } from '@/lib/plans/utils'
import { fetchEstrusVirtualEvents } from '@/lib/estrus/virtual-events'

/* ── Dashboard veri sözleşmesi ────────────────────────────── */

/** Profil verisi — sadece selamlama için kullanılıyor */
interface DashboardProfile {
  id: string
  first_name: string
  city?: string
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
  appetite_score?: number | null
  meal_time?: string | null
}

/** Weight log — son ağırlık/boy gösterimi için */
export interface DashboardWeightLog {
  pet_id: string
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
}

export interface DashboardPlan {
  id: string
  pet_id: string
  category: string
  sub_type: string
  scheduled_at?: string | null
  next_run?: string | null
  status?: string | null
  extra_data: any
  pets: { name: string } | null
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
  plans: DashboardPlan[]
  activeQuestion: SmartQuestion | null
  activeInsight: SmartInsight | null
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
          .select('id, first_name, city')
          .eq('id', uid)
          .single()

        if (profileError) {
          console.error('[dashboard] profile fetch failed:', profileError.message)
        }

        /* ── Pets (KRİTİK - Kanonik + Owner + Legacy fallback) ───────── */
        const [{ data: petMemberships }, { data: legacyMembers }, { data: ownedPets }] = await Promise.all([
          supabase
            .from('pet_memberships')
            .select('pet_id')
            .eq('profile_id', uid)
            .eq('status', 'active'),
          supabase
            .from('pet_members')
            .select('pet_id')
            .eq('profile_id', uid),
          supabase
            .from('pets')
            .select('id')
            .eq('owner_id', uid),
        ])

        const activeMembershipIds = (petMemberships ?? []).map((m: any) => m.pet_id).filter(Boolean)
        const legacyIds = (legacyMembers ?? []).map((m: any) => m.pet_id).filter(Boolean)
        const ownedIds = (ownedPets ?? []).map((p: any) => p.id).filter(Boolean)

        const petMembershipPetIds = Array.from(new Set([...activeMembershipIds, ...legacyIds, ...ownedIds]))

        const petResult = petMembershipPetIds.length === 0
          ? { data: [] as DashboardPet[], error: null }
          : await supabase
              .from('pets')
              .select('*')
              .in('id', petMembershipPetIds)
              .order('created_at', { ascending: false })

        const { data: pets, error: petsError } = petResult

        if (petsError) {
          console.error('[dashboard] pets fetch failed:', petsError.message)
        }

        /* ── Health schedules (sessiz) ───────────────────── */
        let upcomingSchedules: DashboardSchedule[] = []
        let completedSchedules: DashboardSchedule[] = []

        if (pets && pets.length > 0) {
          const petIdList = pets.map((p) => p.id)

          const { data: upcoming, error: upcomingError } = await supabase
            .from('health_schedules')
            .select('*')
            .in('pet_id', petIdList)
            .neq('status', 'done')
 
          if (upcomingError) {
            console.error('[dashboard] upcoming schedules fetch failed:', upcomingError.message)
          } else if (upcoming) {
            upcomingSchedules = (upcoming as any[]).map(item => ({
              ...item,
              pets: { name: pets.find(p => p.id === item.pet_id)?.name || '' }
            })) as DashboardSchedule[]
          }
 
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data: completed, error: completedError } = await supabase
            .from('health_schedules')
            .select('*')
            .in('pet_id', petIdList)
            .in('status', ['completed', 'done'])
            .gte('updated_at', yesterday)
 
          if (completedError) {
            console.error('[dashboard] completed schedules fetch failed:', completedError.message)
          } else if (completed) {
            completedSchedules = (completed as any[]).map(item => ({
              ...item,
              pets: { name: pets.find(p => p.id === item.pet_id)?.name || '' }
            })) as DashboardSchedule[]
          }

          // Inject virtual estrus forecast events as upcoming schedules
          const virtualEstrusEvents = await fetchEstrusVirtualEvents(supabase, pets)
          if (virtualEstrusEvents && virtualEstrusEvents.length > 0) {
            upcomingSchedules = [...upcomingSchedules, ...virtualEstrusEvents]
          }
        }

        /* ── Plans tablosundan veri çek ve merge et ───────── */
        let userPlans: DashboardPlan[] = []
        if (pets && pets.length > 0) {
          const petIdList = pets.map((p) => p.id)
          const { data: plansRes, error: plansError } = await supabase
            .from('plans')
            .select('*, pets(name)')
            .in('pet_id', petIdList)

          if (plansError) {
            console.error('[dashboard] plans fetch failed:', plansError.message)
          }

          const combinedPlans = [...(plansRes || [])]

          if (combinedPlans.length > 0) {
            userPlans = combinedPlans as DashboardPlan[]
            
            // Plans'ı health_schedules formatına dönüştür ve merge et
            const PLAN_CAT_MAP: Record<string, string> = {
              saglik: 'Sağlık', asi: 'Aşı', parazit: 'Parazit',
              bakim: 'Bakım', beslenme: 'Beslenme', hijyen: 'Hijyen', aktivite: 'Aktivite', aktiviteler: 'Aktivite',
              kontrol: 'Kontrol & Randevu', randevu: 'Kontrol & Randevu'
            }

            // Dedup: health_schedules'dan gelen plan_id ve sub_category+due_date setleri
            const existingSchedulePlanIds = new Set(
              upcomingSchedules.concat(completedSchedules)
                .map((s: any) => s.plan_id)
                .filter(Boolean)
            )
            const existingScheduleKeys = new Set(
              upcomingSchedules.concat(completedSchedules)
                .filter((s: any) => s.sub_category && s.due_date)
                .map((s: any) => `${s.sub_category}__${s.due_date}`)
            )

            for (const p of plansRes as any[]) {
              let dueDate = p.scheduled_at?.split('T')[0]
              let dueTime = null
              
              if (p.scheduled_at) {
                try {
                  const d = new Date(p.scheduled_at)
                  dueDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
                  dueTime = d.toLocaleTimeString('tr-TR', { 
                    timeZone: 'Europe/Istanbul', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false 
                  })
                } catch(e) {}
              }

              const asSchedule = {
                id: `plan_${p.id}`,
                _plan_id: p.id,
                _source: 'plans',
                _plan_category: p.category,
                pet_id: p.pet_id,
                title: getPlanDisplayTitle(p),
                due_date: dueDate,
                due_time: dueTime,
                status: p.status === 'completed' ? 'done' : p.status === 'cancelled' ? 'done' : 'upcoming',
                category: PLAN_CAT_MAP[p.category] || p.category,
                sub_category: p.sub_type,
                vaccines: p.extra_data?.vaccine ? { name: p.extra_data.vaccine.name } : null,
                pets: pets.find((pet: any) => pet.id === p.pet_id) ? { name: pets.find((pet: any) => pet.id === p.pet_id)!.name } : null,
                notes: p.note,
                updated_at: p.updated_at,
              } as any

              // Mükerrer kayıt kontrolü: plan_id veya sub_category+due_date eşleşmesi varsa atla
              if (existingSchedulePlanIds.has(p.id)) continue
              const compositeKey = `${p.sub_type}__${dueDate}`
              if (p.sub_type && dueDate && existingScheduleKeys.has(compositeKey)) continue

              if (asSchedule.status === 'done') {
                completedSchedules.push(asSchedule)
              } else {
                upcomingSchedules.push(asSchedule)
              }
            }
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
              .select('pet_id, created_at, appetite_score, meal_time')
              .in('pet_id', petIds)
              .order('created_at', { ascending: false }),
            supabase
              .from('weight_logs')
              .select('pet_id, measured_at, weight_kg, height_cm')
              .in('pet_id', petIds)
              .or('is_archived.is.null,is_archived.eq.false')
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

        /* ── Survey Stats (sessiz) ───────────────────────────────── */
        let surveyStats = null
        const { data: surveyRes } = await supabase
          .from('user_survey_stats')
          .select('*')
          .eq('user_id', uid)
          .single()
        
        if (surveyRes) {
          surveyStats = surveyRes
        }

        /* ── Profiling Engine ───────────────────────────────── */
        const activeQuestion = getDailyQuestion((pets || []), surveyStats, allWeightLogs);

        /* ── Insight Engine (Proactive Anomaly Detector) ────── */
        const activeInsight = detectAnomalies((pets || []), allFeedingLogs, allWeightLogs);

        /* ── Güvenli return ──────────────────────────────── */
        return {
          profile: profileError ? null : (profile as DashboardProfile | null),
          pets: (pets as DashboardPet[]) || [],
          upcomingSchedules,
          completedSchedules,
          allFeedingLogs,
          allWeightLogs,
          plans: userPlans,
          activeQuestion,
          activeInsight,
        }
      } catch (err) {
        console.error('[dashboard] fetchDashboardData fatal:', err)
        return {
          profile: null,
          pets: [],
          upcomingSchedules: [],
          completedSchedules: [],
          allFeedingLogs: [],
          allWeightLogs: [],
          plans: [],
          activeQuestion: null,
          activeInsight: null,
        }
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
