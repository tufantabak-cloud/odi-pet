import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PetDetailClient from './PetDetailClient'

function calcAge(birthDate: string | null) {
  if (!birthDate) return { text: '—', label: '—' }
  const born = new Date(birthDate)
  const today = new Date()
  const totalMonths = (today.getFullYear() - born.getFullYear()) * 12 + (today.getMonth() - born.getMonth())
  const ageYears = Math.floor(totalMonths / 12)
  const label = ageYears < 1 ? 'Yavru' : ageYears < 7 ? 'Yetişkin' : ageYears < 12 ? 'Yaşlı' : 'Yaşlı (12+)'
  const text = ageYears < 1 ? `${totalMonths} ay` : `${ageYears} yıl`
  return { text, label }
}

export default async function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: pet } = await supabase.from('pets').select('*').eq('id', id).eq('owner_id', user?.id).single()
  if (!pet) redirect('/owner/pets')

  const [
    { data: schedules },
    { data: vaccineRecords },
    { data: diseases },
    { data: allergies },
    { data: medications },
    { data: growthRecords },
    { data: appointments },
    { data: nutritionLogs },
    { data: payments },
  ] = await Promise.all([
    supabase.from('health_schedules').select('*, vaccines(name)').eq('pet_id', id).order('due_date').limit(20),
    supabase.from('vaccine_records').select('*, vaccines(name)').eq('pet_id', id).order('applied_date', { ascending: false }).limit(10),
    supabase.from('health_diseases').select('*').eq('pet_id', id).order('diagnosis_date', { ascending: false }).limit(5),
    supabase.from('health_allergies').select('*').eq('pet_id', id).limit(5),
    supabase.from('health_medications').select('*').eq('pet_id', id).limit(5),
    supabase.from('growth_records').select('*').eq('pet_id', id).order('recorded_at', { ascending: false }).limit(5),
    supabase.from('appointments').select('*, clinics(name)').eq('pet_id', id).order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('nutrition_logs').select('*').eq('pet_id', id).order('date', { ascending: false }).limit(7),
    supabase.from('payments').select('*').eq('pet_id', id).order('payment_date', { ascending: false }).limit(5),
  ])

  const age = calcAge(pet.birth_date)
  const score = pet.health_score ?? 100
  const overdue = (schedules ?? []).filter((s: any) => s.status !== 'done' && new Date(s.due_date) < new Date()).length
  const upcoming = (schedules ?? []).filter((s: any) => s.status !== 'done' && new Date(s.due_date) >= new Date()).slice(0, 3)

  const [{ data: sub }] = await Promise.all([
    supabase.from('user_subscriptions').select('plan').eq('profile_id', user?.id ?? '').single(),
  ])

  return (
    <PetDetailClient
      pet={pet}
      age={age}
      score={score}
      overdue={overdue}
      upcoming={upcoming}
      schedules={schedules ?? []}
      vaccineRecords={vaccineRecords ?? []}
      diseases={diseases ?? []}
      allergies={allergies ?? []}
      medications={medications ?? []}
      growthRecords={growthRecords ?? []}
      appointments={appointments ?? []}
      nutritionLogs={nutritionLogs ?? []}
      payments={payments ?? []}
      subscription={sub}
    />
  )
}
