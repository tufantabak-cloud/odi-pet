"use no memo"
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


export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs, plans, activeQuestion, activeInsight } =
    await getCachedDashboardData(user.id)

  const supabase = await createServerSupabaseClient()
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
  const activePlans = (plans || []).filter((p: any) => p.next_run && new Date(p.next_run) > today)

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
  const activeTasksCount = upcomingSchedules.filter((s: any) => s.status !== 'done').length

  return (
    <DashboardOnboardingWrapper>      <div className="flex flex-col gap-[var(--space-5)] pb-[calc(96px+env(safe-area-inset-bottom))]">
        {(!pets || pets.length === 0) ? (
          <div className="px-[var(--space-4)] pt-6 flex flex-col gap-4">
            <h1 className="text-[22px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
              {greeting}, {firstName}
            </h1>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] rounded-[24px] p-8 text-center flex flex-col items-center mt-4">
              <div className="text-5xl mb-4">🐾</div>
              <h2 className="text-[17px] font-black text-[var(--color-text-primary)] mb-2">
                Hoş Geldiniz!
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-6 max-w-[250px] mx-auto leading-relaxed">
                Başlamak için ilk dostunuzu ekleyin ve Odi.Pet dünyasını keşfedin.
              </p>
              <Link href="/owner/pets/add" data-testid="add-first-pet-button" className="h-12 w-full max-w-[200px] flex items-center justify-center bg-[var(--color-primary)] text-white rounded-[18px] font-800 text-[14px] hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/20">
                İlk Dostumu Ekle 🐾
              </Link>
            </div>
          </div>
        ) : (
          <DashboardClient
            greeting={greeting}
            firstName={firstName}
            dateStr={dateStr}
            activeTasksCount={activeTasksCount}
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
          />
        )}
      </div>
    </DashboardOnboardingWrapper>
  )
}
