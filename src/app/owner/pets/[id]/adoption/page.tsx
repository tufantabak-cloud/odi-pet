import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect, notFound } from 'next/navigation'
import AdoptionTab from '@/components/pets/tabs/AdoptionTab'
import PageHeader from '@/components/ui/primitives/PageHeader'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdoptionPage(props: PageProps) {
  const { id } = await props.params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  if (!isAdmin) {
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership) notFound()
  }

  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  return (
    <div className="bg-bg-main min-h-screen pb-[120px]">
      <PageHeader title="Sahiplendir" backHref={`/owner/pets/${id}`} />
      <div className="p-4 pt-6 max-w-lg mx-auto">
        <AdoptionTab pet={pet} />
      </div>
    </div>
  )
}
