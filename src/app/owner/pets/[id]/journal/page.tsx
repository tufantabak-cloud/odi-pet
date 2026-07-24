import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import JournalTimelineClient from './JournalTimelineClient'
import { buildNutritionTimelineEvents } from '@/lib/nutrition/nutrition-timeline-events'

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetJournalPage(props: PageProps) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { id } = await props.params
  const isAdmin = profile.role === 'admin' || profile.role === 'founder'
  
  // Use admin client for admins/founders to bypass RLS, otherwise use server client
  const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

  const { data: pet } = await supabase
    .from('pets')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!pet) redirect('/owner/dashboard')

  const [
    { data: entries },
    { data: plans },
    { data: gallery },
    { data: adoptions },
    { data: lostReports },
    { data: assignments },
    { data: weightLogs }
  ] = await Promise.all([
    supabase.from('pet_journal_entries').select('*').eq('pet_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('plans').select('*').eq('pet_id', id).order('scheduled_at', { ascending: false }).limit(100),
    supabase.from('pet_gallery').select('*').eq('pet_id', id).neq('category', 'document').order('created_at', { ascending: false }).limit(100),
    supabase.from('pet_adoptions').select('id, status, story, created_at').eq('pet_id', id).order('created_at', { ascending: false }),
    supabase.from('lost_reports').select('id, status, created_at').eq('pet_id', id).order('created_at', { ascending: false }),
    supabase.from('pet_food_assignments').select(`*, food_product_family:food_product_families (official_name, brand:food_brands(display_name))`).eq('pet_id', id),
    supabase.from('weight_logs').select('*').eq('pet_id', id).order('measured_at', { ascending: false }).limit(20)
  ])

  // Build normalized nutrition timeline events (assignments start/end and plans)
  const normNutritionEvents = buildNutritionTimelineEvents({
    petId: id,
    assignments: assignments || [],
    plans: (plans || []).filter((p: any) => p.category === 'beslenme')
  });

  // Filter out raw nutrition plans from standard plan list to prevent duplication
  const nonNutritionPlans = (plans || []).filter((p: any) => p.category !== 'beslenme');

  // Filter out daily feeding_logs entries from journal entries if any exist
  const nonFeedingEntries = (entries || []).filter((e: any) => e.entry_type !== 'nutrition' || !e.data?.amount_grams);

  // Merge and sort
  const allTimelineItems = [
    ...(nonFeedingEntries || []).map((e: any) => ({ ...e, source: 'journal', sortDate: new Date(e.created_at).getTime() })),
    ...(nonNutritionPlans || []).map((p: any) => ({ ...p, source: 'plan', sortDate: new Date(p.scheduled_at).getTime() })),
    ...(gallery || []).map((g: any) => ({ ...g, source: 'gallery', sortDate: new Date(g.taken_at || g.created_at).getTime() })),
    ...(adoptions || []).map((a: any) => ({ ...a, source: 'adoption' as const, sortDate: new Date(a.created_at).getTime() })),
    ...(lostReports || []).map((l: any) => ({ ...l, source: 'lost' as const, sortDate: new Date(l.created_at).getTime() })),
    ...(weightLogs || []).map((w: any) => ({ ...w, source: 'weight' as const, sortDate: new Date(w.measured_at).getTime() })),
    ...normNutritionEvents.map((ne) => ({
      id: ne.id,
      source: 'nutrition_norm' as const,
      category: 'beslenme' as const,
      title: ne.title,
      scheduled_at: ne.dateKey,
      status: ne.status,
      linkHref: ne.linkHref,
      sortDate: ne.sortDate,
    }))
  ].sort((a, b) => b.sortDate - a.sortDate)

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/owner/pets/${id}`} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-[24px] font-extrabold text-text-primary leading-none">Sağlık Günlüğü</h1>
        </div>
        <Link href={`/owner/pets/${id}/journal/new`} className="btn-primary py-2 px-3 text-[13px] whitespace-nowrap shadow-sm">
          + Yeni Kayıt
        </Link>
      </div>

      <JournalTimelineClient petId={pet.id} petName={pet.name} initialItems={allTimelineItems} />
    </div>
  )
}
