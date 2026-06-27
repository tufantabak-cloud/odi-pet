import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BudgetTab from '@/components/pets/tabs/BudgetTab'
import PageHeader from '@/components/ui/primitives/PageHeader'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BudgetPage(props: PageProps) {
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

  return (
    <div className="bg-bg-main min-h-screen pb-[120px]">
      <PageHeader title="Bütçe Yönetimi" backHref={`/owner/pets/${id}`} />
      <div className="p-4 pt-6 max-w-lg mx-auto">
        <BudgetTab pet={pet} />
      </div>
    </div>
  )
}
