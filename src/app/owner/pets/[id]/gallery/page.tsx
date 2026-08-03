import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'
import { redirect, notFound } from 'next/navigation'
import GalleryTab from '@/components/pets/tabs/GalleryTab'
import PageHeader from '@/components/ui/primitives/PageHeader'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GalleryPage(props: PageProps) {
  const { id } = await props.params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  const serverSupabase = await createServerSupabaseClient()

  if (!isAdmin) {
    const canView = await hasPetCapability(serverSupabase, id, 'can_view_pet')
    if (!canView) redirect('/owner/dashboard')
  }

  const supabase = isAdmin ? createAdminSupabaseClient() : serverSupabase

  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  return (
    <div className="bg-bg-main min-h-screen pb-30">
      <PageHeader title="Galeri" backHref={`/owner/pets/${id}`} />
      <div className="p-4 pt-6 max-w-lg mx-auto">
        <GalleryTab pet={pet} />
      </div>
    </div>
  )
}
