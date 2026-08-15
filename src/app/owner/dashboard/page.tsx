export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import DashboardSmartCards from './DashboardSmartCards'
import { getNowTR } from '@/lib/utils'
import Image from 'next/image'
import { getCachedDashboardData } from './dashboard-queries'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PawPrint, Calendar, Pencil, Gift, ChevronRight } from 'lucide-react'
import SmartQuestionCard from '@/components/profiling/SmartQuestionCard'
import SmartInsightCard from '@/components/profiling/SmartInsightCard'
import SocialShortcuts from '@/components/dashboard/SocialShortcuts'
import QuickJournalWidget from '@/components/dashboard/QuickJournalWidget'
import { PetSlider } from '@/components/dashboard/PetSlider'
import DashboardClient from './DashboardClient'
import { GlassCard } from '@/components/ui/primitives'


export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs, plans, activeQuestion, activeInsight } =
    await getCachedDashboardData(user.id)

  const supabase = await createServerSupabaseClient()

  // Kullanıcının e-postasına gelen bekleyen bakım ekibi davetleri
  const { data: pendingUserInvites } = user.email
    ? await supabase
        .from('pet_invites')
        .select('id, token, role, created_at, expires_at, pets(id, name, species, breed, avatar_url, profiles(first_name, last_name))')
        .eq('email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
    : { data: null }

  const { data: lostReportsRaw } = await supabase
    .from('lost_reports')
    .select('*, pets(name, avatar_url, species, breed, city)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  const userCities = Array.from(new Set((pets || []).map((p: any) => p.city).filter(Boolean)))
  const lostReports = lostReportsRaw?.filter((report: any) => {
    if (userCities.length === 0) return false
    const reportCity = report.pets?.city
    if (!reportCity) return false
    return userCities.includes(reportCity)
  }).slice(0, 10) || []

  const now = getNowTR()
  const today = getNowTR()
  today.setHours(0, 0, 0, 0)
  const in30 = getNowTR()
  in30.setDate(in30.getDate() + 30)

  const { data: journalEntries } = await supabase
    .from('pet_journal_entries')
    .select('id, pet_id, created_at')
    .in('pet_id', (pets || []).map((p: any) => p.id))
    .gte('created_at', today.toISOString())

  // Yaklaşan Etkinlikler (Planlar hariç, aşı vb. - sadece gelecek)
  const upcomingEvents = upcomingSchedules
    .filter((s: any) => s._source !== 'plans' && new Date(s.due_date) > today && new Date(s.due_date) <= in30)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3)

  // Aktif Planlar
  const activePlans = (plans || [])
    .filter((p: any) => (p.status === 'active' || !p.status) && (p.scheduled_at || p.next_run) && new Date(p.scheduled_at || p.next_run) >= today)
    .sort((a: any, b: any) => new Date(a.scheduled_at || a.next_run).getTime() - new Date(b.scheduled_at || b.next_run).getTime())

  const petsWithStats = (pets || []).map((pet: any) => {
    let lastFeedingDate = ''
    let weightVal = ''

    const feeding = allFeedingLogs.find((f: any) => f.pet_id === pet.id)
    if (feeding) {
      const diffHrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60))
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} s. once`
      else lastFeedingDate = `${Math.floor(diffHrs / 24)} g. once`
    }

    const weight = allWeightLogs.find((w: any) => w.pet_id === pet.id)
    if (weight?.weight_kg) weightVal = `${weight.weight_kg} kg`

    const overdueCount = upcomingSchedules.filter(
      (s: any) => s.pet_id === pet.id && new Date(s.due_date) < now
    ).length
    const upcomingCount = upcomingSchedules.filter(
      (s: any) => s.pet_id === pet.id && new Date(s.due_date) >= now
    ).length

    return { ...pet, lastFeedingDate, weightVal, overdueCount, upcomingCount }
  })

  const firstName = profile?.first_name || 'Hos Geldin'
  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Günaydın'
    if (h < 18) return 'İyi günler'
    return 'İyi akşamlar'
  })()

  const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

  // Header görev özeti — aylar sonraki tüm açık kayıtları "aktif görev" saymak yerine
  // kullanıcıya anlamlı bir durum göster: gecikmiş > bugün > sıradaki > her şey yolunda.
  // Sayaç TÜM petleri kapsar (upcomingSchedules hesap geneli), bu yüzden metinlerde "Toplam" ile belirtilir.
  // Terminal (kapanmış) durumlar sayılmaz. health_schedules.status serbest metin; kodda gerçekten
  // kullanılan kapanış değerleri: done, completed. plans ise cancelled/completed'i dashboard-queries
  // içinde 'done'a çevirip upcoming'den düşürüyor; 'cancelled' yine de savunma amaçlı hariç tutulur.
  const TERMINAL_TASK_STATUSES = new Set(['done', 'completed', 'cancelled'])
  const isOpenTask = (s: any) => !TERMINAL_TASK_STATUSES.has(s.status)
  const pendingSchedules = upcomingSchedules.filter(isOpenTask)
  const endOfToday = getNowTR()
  endOfToday.setHours(23, 59, 59, 999)
  const overdueTaskCount = pendingSchedules.filter((s: any) => new Date(s.due_date) < today).length
  const todayTaskCount = pendingSchedules.filter((s: any) => {
    const d = new Date(s.due_date)
    return d >= today && d <= endOfToday
  }).length
  const nextTask = pendingSchedules
    .filter((s: any) => new Date(s.due_date) > endOfToday)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  let headerTaskLabel = 'Bugün her şey yolunda'
  let headerTaskTone: 'overdue' | 'today' | 'calm' = 'calm'
  if (overdueTaskCount > 0) {
    headerTaskLabel = `Toplam ${overdueTaskCount} gecikmiş görev`
    headerTaskTone = 'overdue'
  } else if (todayTaskCount > 0) {
    headerTaskLabel = `Bugün toplam ${todayTaskCount} görev`
    headerTaskTone = 'today'
  } else if (nextTask) {
    const nextStr = new Date(nextTask.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    headerTaskLabel = `Sıradaki görev ${nextStr}`
    headerTaskTone = 'calm'
  }

  return (
    <DashboardOnboardingWrapper>      <div className="flex flex-col gap-[var(--space-5)] pb-[calc(96px+env(safe-area-inset-bottom))]">
        {(!pets || pets.length === 0) ? (
          <div className="px-[var(--space-4)] pt-6 flex flex-col gap-4">
            <h1 className="text-[22px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
              {greeting}, {firstName}
            </h1>
            <GlassCard padding="lg" className="text-center flex flex-col items-center mt-4">
              <div className="text-5xl mb-4">🐾</div>
              <h2 className="text-[17px] font-black text-[var(--color-text-primary)] mb-2">
                Hoş Geldiniz!
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-6 max-w-[250px] mx-auto leading-relaxed">
                Başlamak için ilk dostunuzu ekleyin ve Odi dünyasını keşfedin.
              </p>
              <Link href="/owner/pets/add" data-testid="add-first-pet-button" className="h-12 w-full max-w-[200px] flex items-center justify-center bg-[var(--color-primary)] text-white rounded-[18px] font-800 text-[14px] hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/20">
                İlk Dostumu Ekle 🐾
              </Link>
            </GlassCard>
          </div>
        ) : (
          <DashboardClient
            greeting={greeting}
            firstName={firstName}
            dateStr={dateStr}
            headerTaskLabel={headerTaskLabel}
            headerTaskTone={headerTaskTone}
            petsWithStats={petsWithStats}
            pets={pets}
            activeQuestion={activeQuestion}
            activeInsight={activeInsight}
            upcomingSchedules={upcomingSchedules}
            completedSchedules={completedSchedules}
            upcomingEvents={upcomingEvents}
            activePlans={activePlans}
            lostReports={lostReports}
            allWeightLogs={allWeightLogs}
            journalEntries={journalEntries || []}
            pendingUserInvites={pendingUserInvites || []}
          />
        )}
      </div>
    </DashboardOnboardingWrapper>
  )
}
