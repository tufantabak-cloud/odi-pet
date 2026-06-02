export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calcAge } from '@/lib/pets/utils'
import { getNowTR } from '@/lib/utils'
import PetDetailClient from './PetDetailClient'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetDetailPage(props: PageProps) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await props.params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  let petQuery = supabase.from('pets').select('*').eq('id', id)
  if (!isAdmin) {
    petQuery = petQuery.eq('owner_id', profile.id)
  }
  const { data: pet } = await petQuery.single()

  if (!pet) redirect('/owner/dashboard')

  const [
    { data: schedules },
    { data: diseases },
    { data: allergies },
    { data: medications },
    { data: growthRecords },
    { data: appointments },
    { data: nutritionLogs },
    { data: payments },
    { data: activeLostReport },
  ] = await Promise.all([
    supabase.from('health_schedules').select('*, vaccines(name)').eq('pet_id', id).order('due_date').limit(100),
    supabase.from('health_diseases').select('*').eq('pet_id', id).order('diagnosis_date', { ascending: false }).limit(5),
    supabase.from('health_allergies').select('*').eq('pet_id', id).limit(5),
    supabase.from('health_medications').select('*').eq('pet_id', id).limit(5),
    supabase.from('growth_records').select('*').eq('pet_id', id).order('recorded_at', { ascending: false }).limit(15),
    supabase.from('appointments').select('*, clinics(name)').eq('pet_id', id).order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('nutrition_logs').select('*').eq('pet_id', id).order('date', { ascending: false }).limit(7),
    supabase.from('payments').select('*').eq('pet_id', id).order('payment_date', { ascending: false }).limit(5),
    supabase.from('lost_reports').select('*').eq('pet_id', id).eq('status', 'active').limit(1).maybeSingle(),
  ])

  const age = calcAge(pet.birth_date)
  
  const now = getNowTR()
  const overdue = (schedules ?? []).filter((s: any) => s.status !== 'done' && new Date(s.due_date) < now).length
  
  let score = pet.health_score ?? 100
  if (overdue > 0) {
    score = Math.max(0, score - (overdue * 25))
  }

  const [{ data: sub }, { count: passkeyCount }] = await Promise.all([
    supabase.from('user_subscriptions').select('plan').eq('profile_id', pet.owner_id).single(),
    supabase.from('passkeys').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
  ])

  return (
    <PetDetailClient
      pet={pet}
      age={age}
      score={score}
      overdue={overdue}
      schedules={schedules ?? []}
      diseases={diseases ?? []}
      allergies={allergies ?? []}
      medications={medications ?? []}
      growthRecords={growthRecords ?? []}
      appointments={appointments ?? []}
      nutritionLogs={nutritionLogs ?? []}
      payments={payments ?? []}
      subscription={sub}
      activeLostReport={activeLostReport || null}
      hasPasskey={(passkeyCount ?? 0) > 0}
      isAdminView={isAdmin}
    />
  )
}
