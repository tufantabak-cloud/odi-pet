import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { SocialTabs } from '@/components/social/SocialTabs'
import { Compass, MessageSquare, Trophy } from 'lucide-react'

export default async function SocialPage() {
  const supabase = createAdminSupabaseClient()
  
  // Paralel veri çekimi (Promise.all)
  const [adoptionsRes, lostRes, matchesRes] = await Promise.all([
    supabase
      .from('pet_adoptions')
      .select(`
        id, pet_id, story, requirements, created_at,
        pet:pets (id, name, species, breed, avatar_url, city, birth_date)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
      
    supabase
      .from('lost_reports')
      .select(`
        id, last_seen_location, last_seen_at, contact_phone, created_at, pet_id, status,
        pet:pets (id, name, species, avatar_url, city, breed, birth_date)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
      
    supabase
      .from('breeding_listings')
      .select('*, pets(id, name, species, breed, avatar_url, city, birth_date, gender)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  const adoptions = adoptionsRes.data || []
  const lostPets = lostRes.data || []
  const matches = matchesRes.data || []

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto font-sans animate-fadeInUp">
      

      {/* 2. AKTİF ÖZELLİKLER (Client Component Tabs) */}
      <SocialTabs adoptions={adoptions} lostPets={lostPets} matches={matches} />

      {/* 3. YAKINDA GELİYOR */}
      <div className="w-full flex items-center justify-center my-2">
        <div className="h-px bg-slate-200/80 w-full max-w-[200px]" />
      </div>
      
      <section className="flex flex-col gap-4 opacity-90">
        <h2 className="text-xl font-bold text-slate-900 px-2 text-center">Neler Planlıyoruz?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl p-6 text-center bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-2xs font-semibold px-2 py-0.5 rounded-lg">Çok Yakında</div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <Compass className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Playdate Bulucu</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Yakındaki uyumlu köpek veya kedilerle güvenli oyun buluşmaları planlayın.
            </p>
          </div>

          <div className="rounded-3xl p-6 text-center bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-2xs font-semibold px-2 py-0.5 rounded-lg">Çok Yakında</div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Can Dostu Forumları</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Beslenme, eğitim ve sağlık konularında deneyimli sahiplerin tecrübelerinden faydalanın.
            </p>
          </div>

          <div className="rounded-3xl p-6 text-center bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-2xs font-semibold px-2 py-0.5 rounded-lg">Çok Yakında</div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Etkinlikler</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Şehrinizdeki evcil hayvan şenlikleri, eğitim seminerleri ve buluşmalardan haberdar olun.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}

