import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminPetDetailClient from './AdminPetDetailClient'
import { calcAge } from '@/lib/pets/utils'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminPetDetailPage(props: PageProps) {
  const { id } = await props.params
  const supabase = createAdminSupabaseClient()

  // 1. Fetch Core Pet Data + Owner Profile
  const { data: pet, error } = await supabase
    .from('pets')
    .select('*, profiles(*)')
    .eq('id', id)
    .single()

  if (error || !pet) {
    console.error('Error fetching pet:', error)
    redirect('/admin/pets')
  }

  // 2. Fetch all related data in parallel
  const [
    { data: schedules },
    { data: diseases },
    { data: allergies },
    { data: medications },
    { data: growthRecords },
    { data: appointments },
    { data: nutritionLogs },
    { data: payments }
  ] = await Promise.all([
    supabase.from('health_schedules').select('*, vaccines(name)').eq('pet_id', id).order('due_date'),
    supabase.from('health_diseases').select('*').eq('pet_id', id).order('diagnosis_date', { ascending: false }),
    supabase.from('health_allergies').select('*').eq('pet_id', id),
    supabase.from('health_medications').select('*').eq('pet_id', id),
    supabase.from('growth_records').select('*').eq('pet_id', id).order('recorded_at', { ascending: false }),
    supabase.from('appointments').select('*, clinics(name)').eq('pet_id', id).order('scheduled_at', { ascending: false }),
    supabase.from('nutrition_logs').select('*').eq('pet_id', id).order('date', { ascending: false }),
    supabase.from('payments').select('*').eq('pet_id', id).order('payment_date', { ascending: false })
  ])

  // Calculate some summary metrics
  const age = calcAge(pet.birth_date)
  
  const now = new Date()
  const overdueVaccines = (schedules ?? []).filter((s: any) => s.status !== 'done' && new Date(s.due_date) < now).length
  
  // Base health score logic
  let healthScore = pet.health_score ?? 100
  if (overdueVaccines > 0) {
    healthScore = Math.max(0, healthScore - (overdueVaccines * 25))
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/pets" className="w-10 h-10 rounded-xl bg-surface border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-colors shadow-sm">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-text-primary">Evcil Hayvan Detayı</h1>
            <p className="text-[13px] text-text-secondary mt-1">
              Pet kimlik kartı ve tüm tıbbi/sosyal geçmişi.
            </p>
          </div>
        </div>
      </div>

      <AdminPetDetailClient
        pet={pet}
        age={age}
        healthScore={healthScore}
        overdueVaccines={overdueVaccines}
        schedules={schedules ?? []}
        diseases={diseases ?? []}
        allergies={allergies ?? []}
        medications={medications ?? []}
        growthRecords={growthRecords ?? []}
        appointments={appointments ?? []}
        nutritionLogs={nutritionLogs ?? []}
        payments={payments ?? []}
      />
    </div>
  )
}
