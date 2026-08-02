import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { getEntitlement } from '@/lib/subscription/entitlement'
import { redirect } from 'next/navigation'
import ReportsTab from '../ReportsTab'
import PageHeader from '@/components/ui/primitives/PageHeader'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportsPage(props: PageProps) {
  const { id } = await props.params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  let petQuery = supabase.from('pets').select('*').eq('id', id)
  if (!isAdmin) {
    petQuery = petQuery.eq('owner_id', profile.id)
  }
  const { data: pet } = await petQuery.single()

  if (!pet) redirect('/owner/dashboard')

  const [entitlement, { data: payments }] = await Promise.all([
    getEntitlement(pet.owner_id),
    supabase.from('payments').select('*').eq('pet_id', id).order('payment_date', { ascending: false }),
  ])

  return (
    <div className="bg-bg-main min-h-screen pb-[120px]">
      <PageHeader title="Raporlar" backHref={`/owner/pets/${id}`} />
      <div className="p-4 pt-6 max-w-lg mx-auto">
        <ReportsTab 
          petId={pet.id} 
          petName={pet.name} 
          plan={entitlement.tier} 
          payments={payments ?? []} 
        />
      </div>
    </div>
  )
}
