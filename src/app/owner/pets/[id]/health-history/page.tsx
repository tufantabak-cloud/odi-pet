import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import HealthHistoryWizard from '@/components/pets/HealthHistoryWizard'

export default async function HealthHistoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Sahiplik ve Pet Kontrolü
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('*, pet_owners!inner(profile_id)')
    .eq('id', id)
    .single()

  if (petError || !pet) {
    redirect('/owner/dashboard')
  }

  // Sahiplik doğrulaması (Admin/Founder harici)
  if (profile.role !== 'admin' && profile.role !== 'founder') {
    const isOwner = pet.pet_owners.some((owner: any) => owner.profile_id === profile.id)
    if (!isOwner) {
      redirect('/owner/dashboard')
    }
  }

  // Eğer yaş 6 aydan küçükse direkt profile yönlendir (Faz 1'e tabi, sihirbaza gerek yok)
  if (pet.birth_date) {
    const born = new Date(pet.birth_date)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    if (ageInMonths < 6) {
      redirect(`/owner/pets/${id}`)
    }
  }

  // Zaten tamamlandıysa profile yönlendir
  if (pet.health_history_status === 'completed') {
    redirect(`/owner/pets/${id}`)
  }

  // 2. Core Aşıları Getir (Parazit Hariç)
  const { data: templates, error: templateError } = await supabase
    .from('vaccine_templates')
    .select('*')
    .eq('species', pet.species)
    .eq('is_active', true)
    .eq('mandatory_level', 'core')
    .neq('category', 'parasite')
    .order('vaccine_name', { ascending: true })

  if (templateError || !templates) {
    console.error('Vaccine templates fetch error:', JSON.stringify(templateError))
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)] text-[var(--color-text-primary)] pb-24">
      {/* Header */}
      <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-[520px] mx-auto px-4 h-14 flex items-center gap-3">
          <a 
            href={`/owner/pets/${id}`}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] transition-colors"
          >
            <i className="ti ti-arrow-left text-[22px]" />
          </a>
          <div className="flex-1">
            <h1 className="text-[16px] font-900 text-[var(--color-text-primary)] leading-tight">
              Sağlık Geçmişi
            </h1>
            <p className="text-[12px] font-600 text-[var(--color-text-secondary)]">
              {pet.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto pt-6 px-4">
        <Suspense fallback={<div className="p-8 text-center"><i className="ti ti-loader animate-spin text-[24px] text-[var(--color-primary)]"></i></div>}>
          <HealthHistoryWizard pet={pet} templates={templates || []} />
        </Suspense>
      </div>
    </div>
  )
}
