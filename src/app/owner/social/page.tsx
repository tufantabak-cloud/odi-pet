import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { SocialTabs } from '@/components/social/SocialTabs'
import { Compass, MessageSquare, Trophy, ArrowLeft } from 'lucide-react'

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
      
      {/* 1. HERO BÖLÜMÜ */}
      <section className="rounded-3xl overflow-hidden relative shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] bg-white/90 backdrop-blur-md p-6 md:p-8 border border-slate-100 text-center">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-primary to-rose-500" />
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug mb-3">
            Odi.Pet Sosyal Dünyası
          </h1>
          <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
            Yeni bir can dostuna yuva olun, evcil hayvanınız için en iyi yuvayı bulun, kayıp ilanlarına göz atın veya uygun eşleştirmeleri keşfedin. Odi.Pet topluluğu her zaman yanınızda!
          </p>
        </div>
      </section>

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

      {/* Action / Back to Dashboard */}
      <div className="flex justify-center mt-2">
        <Link 
          href="/owner/dashboard" 
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white min-h-[44px] px-6 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Ana Sayfaya Dön
        </Link>
      </div>

    </div>
  )
}

