import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'
import { redirect, notFound } from 'next/navigation'
import BreedingListingManager from '@/components/pets/BreedingListingManager'
import PageHeader from '@/components/ui/primitives/PageHeader'
import Link from 'next/link'
import { Heart } from 'lucide-react'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage(props: PageProps) {
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

  const { data: initialListing } = await supabase
    .from('breeding_listings')
    .select('*')
    .eq('pet_id', id)
    .eq('status', 'active')
    .maybeSingle()

  return (
    <div className="bg-bg-main min-h-screen pb-[120px]">
      <PageHeader title="Eşleştirme" backHref={`/owner/pets/${id}`} />
      <div className="p-4 pt-6 max-w-lg mx-auto">
        <BreedingListingManager pet={pet} initialListing={initialListing !== undefined ? initialListing : null} />
        
        <div className="mt-4 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center animate-fadeInUp">
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
            <Heart size={20} className="w-5 h-5 text-rose-500" aria-hidden="true" />
          </div>
          
          <h3 className="font-bold text-text-primary text-base mb-1">
            Eşleşme Adaylarını Keşfet
          </h3>
          
          <p className="text-[13px] text-text-secondary mb-4 leading-relaxed">
            Diğer ilanları incelemek, başvuru yapmak ve adayları keşfetmek için Sosyal sekmesini ziyaret edin.
          </p>
          
          <Link 
            href="/owner/social?tab=eslestirme"
            className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3 rounded-xl text-sm font-bold w-full sm:w-auto"
          >
            <Heart size={16} className="w-4 h-4 text-white" aria-hidden="true" /> Eşleştirme Alanına Git →
          </Link>
          
          <p className="text-[11px] text-text-muted mt-3 font-medium">
            İlanınız yayındayken başvurular otomatik olarak buraya gelecek.
          </p>
        </div>
      </div>
    </div>
  )
}
