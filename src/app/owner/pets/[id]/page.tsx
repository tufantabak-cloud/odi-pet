export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calcAge } from '@/lib/pets/utils'
import { getNowTR } from '@/lib/utils'
import PetDetailClient from './PetDetailClient'
import { getPlanDisplayTitle } from '@/lib/plans/utils'
import { hasPetCapability } from '@/lib/pets/access'
import { defaultRepository } from '@/lib/features/entitlement/repository'
import OnboardingGate from '@/components/onboarding/OnboardingGate'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetDetailPage(props: PageProps) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await props.params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'

  const serverSupabase = await createServerSupabaseClient()
  if (!isAdmin) {
    const canViewPet = await hasPetCapability(
      serverSupabase,
      id,
      'can_view_pet'
    )
    if (!canViewPet) redirect('/owner/dashboard')
  }

  const supabase = isAdmin ? createAdminSupabaseClient() : serverSupabase
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single()

  if (!pet) redirect('/owner/dashboard')

  const [
    { data: schedules },
    { data: plans },
    { data: diseases },
    { data: allergies },
    { data: medications },
    { data: growthRecords },
    { data: appointments },
    { data: nutritionProfile },
    { data: payments },
    { data: activeLostReport },
    { data: inventory },
    { data: feedingLogs },
    { data: assignments },
    { data: lastVaccineRecord }
  ] = await Promise.all([
    supabase.from('health_schedules').select('*').eq('pet_id', id).order('due_date').limit(100),
    supabase.from('plans').select('*').eq('pet_id', id).order('scheduled_at').limit(100),
    supabase.from('health_diseases').select('*').eq('pet_id', id).order('diagnosis_date', { ascending: false }).limit(5),
    supabase.from('health_allergies').select('*').eq('pet_id', id).limit(5),
    supabase.from('health_medications').select('*').eq('pet_id', id).limit(5),
    supabase.from('weight_logs').select('*').eq('pet_id', id).order('measured_at', { ascending: false }).limit(20),
    supabase.from('appointments').select('*, clinics(name)').eq('pet_id', id).order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('pet_nutrition_profiles').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('payments').select('*').eq('pet_id', id).order('payment_date', { ascending: false }).limit(5),
    supabase.from('lost_reports').select('*').eq('pet_id', id).eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('food_inventory').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('feeding_logs').select('*').eq('pet_id', id).order('meal_time', { ascending: false }).limit(30),
    supabase.from('pet_food_assignments').select(`
      *,
      food_product_family:food_product_families (
        id,
        official_name,
        food_form,
        life_stage,
        species,
        brand:food_brands (
          id,
          display_name
        )
      ),
      food_sku:food_skus (
        id,
        gtin,
        package_size_grams,
        package_type
      )
    `).eq('pet_id', id).order('started_at', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('vaccine_records_v2').select('vaccine_name, administered_at, status').eq('pet_id', id).not('administered_at', 'is', null).in('status', ['completed', 'done']).order('administered_at', { ascending: false }).limit(1).maybeSingle()
  ])

  const PLAN_CATEGORY_MAP: Record<string, string> = {
    saglik: 'Saglik',
    asi: 'Asi',
    parazit: 'Parazit',
    bakim: 'Bakım',
    beslenme: 'Beslenme',
    hijyen: 'Hijyen',
    aktivite: 'Aktiviteler',
  }

  const plansAsSchedules = (plans ?? []).map((p: any) => {
    let dueTime = '12:00:00'
    let dueDate = p.scheduled_at ? p.scheduled_at.split('T')[0] : ''
    if (p.scheduled_at) {
      const d = new Date(p.scheduled_at)
      if (!isNaN(d.getTime())) {
        dueDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
        dueTime = d.toLocaleTimeString('tr-TR', { 
          timeZone: 'Europe/Istanbul', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        })
      }
    }
    return {
      id: `plan_${p.id}`,
      _plan_id: p.id,
      _source: 'plans',
      _plan_category: p.category,
      pet_id: p.pet_id,
      title: getPlanDisplayTitle(p),
      due_date: dueDate,
      due_time: dueTime,
      status: p.status === 'completed' ? 'done' : p.status === 'cancelled' ? 'done' : 'upcoming',
      category: PLAN_CATEGORY_MAP[p.category] || p.category,
      sub_category: p.extra_data?.record_type === 'medication' ? 'İlaç Kullanımı' : p.sub_type,
      plan_type: p.repeat_rule || 'once',
      notes: p.note,
      vaccines: p.extra_data?.vaccine ? { name: p.extra_data.vaccine.name } : null,
      repeat_rule: p.repeat_rule,
      extra_data: p.extra_data,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }
  })

  const existingPlanIds = new Set(
    (schedules ?? [])
      .map((s: any) => s.plan_id)
      .filter(Boolean)
  )

  const existingSubCategoryDateKeys = new Set(
    (schedules ?? [])
      .filter((s: any) => s.sub_category && s.due_date)
      .map((s: any) => `${s.sub_category}__${s.due_date}`)
  )

  const uniquePlansAsSchedules = plansAsSchedules.filter((plan: any) => {
    if (existingPlanIds.has(plan._plan_id)) return false
    const compositeKey = `${plan.sub_category}__${plan.due_date}`
    if (plan.sub_category && plan.due_date && existingSubCategoryDateKeys.has(compositeKey)) return false
    return true
  })

  const allSchedules = [...(schedules ?? []), ...uniquePlansAsSchedules]

  const medicationPlans = (plans ?? [])
    .filter((p: any) => p.extra_data?.record_type === 'medication' && p.extra_data?.medication)
    .map((p: any) => {
      const med = p.extra_data.medication;
      return {
        id: `plan_${p.id}`,
        _plan_id: p.id,
        _source: 'plans',
        pet_id: p.pet_id,
        medication_name: med.name,
        dose: med.dosage_string || `${med.dose} ${med.unit}`,
        usage_duration: p.ends_at ? `${new Date(p.ends_at).toLocaleDateString('tr-TR')} tarihine kadar` : 'Sürekli',
        is_active: p.status !== 'completed' && p.status !== 'cancelled',
        photo_url: med.photo_url,
        purpose: med.purpose,
        freq_type: med.freq_type,
        stock_enabled: med.stock_enabled,
        stock: med.stock,
        alert_threshold: med.alert_threshold,
        extra_data: p.extra_data,
        created_at: p.created_at
      };
    });

  const allMedications = [...(medications ?? []), ...medicationPlans];

  const age = calcAge(pet.birth_date)
  
  const now = getNowTR()
  const overdue = allSchedules.filter((s: any) => s.status !== 'done' && new Date(s.due_date) < now).length
  
  let score = pet.health_score ?? 100
  if (overdue > 0) {
    score = Math.max(0, score - (overdue * 25))
  }

  const [tier, { count: passkeyCount }] = await Promise.all([
    defaultRepository.getUserTier(pet.owner_id),
    supabase.from('passkeys').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
  ])
  const sub = { plan: tier }

  return (
    <OnboardingGate>
      <PetDetailClient
        pet={pet}
        age={age}
        score={score}
        overdue={overdue}
        schedules={allSchedules}
        diseases={diseases ?? []}
        allergies={allergies ?? []}
        medications={allMedications}
        growthRecords={growthRecords ?? []}
        appointments={appointments ?? []}
        nutritionLogs={nutritionProfile ? [nutritionProfile] : []}
        inventory={inventory ?? null}
        feedingLogs={feedingLogs ?? []}
        weightLogs={growthRecords ?? []}
        assignments={assignments ?? []}
        payments={payments ?? []}
        subscription={sub}
        activeLostReport={activeLostReport || null}
        hasPasskey={(passkeyCount ?? 0) > 0}
        isAdminView={isAdmin}
        lastVaccineRecord={lastVaccineRecord ?? null}
      />
    </OnboardingGate>
  )
}
