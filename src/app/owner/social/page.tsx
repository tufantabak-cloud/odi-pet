import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { SocialTabs } from '@/components/social/SocialTabs'

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
    <div className="flex flex-col gap-8 pb-32 pb-safe w-full mx-auto font-sans animate-fadeInUp">
      
      {/* 1. HERO BÖLÜMÜ */}
      <section className="card-base overflow-hidden relative shadow-lg shadow-primary/5 bg-white p-8 md:p-10 border border-border-main text-center">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-primary to-violet-600" />
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
          <h1 className="text-[28px] md:text-[36px] font-black text-text-primary tracking-tight leading-none mb-4">
            Odi.Pet Sosyal Dünyası
          </h1>
          <p className="text-text-secondary text-[15px] md:text-[16px] font-medium leading-relaxed mb-6">
            Yeni bir can dostuna yuva olun, evcil hayvanınız için en iyi yuvayı bulun, kayıp ilanlarına göz atın veya uygun eşleştirmeleri keşfedin. Odi.Pet topluluğu her zaman yanınızda!
          </p>
        </div>
      </section>

      {/* 2. AKTİF ÖZELLİKLER (Client Component Tabs) */}
      <SocialTabs adoptions={adoptions} lostPets={lostPets} matches={matches} />

      {/* 3. YAKINDA GELİYOR */}
      <div className="w-full flex items-center justify-center my-2">
        <div className="h-px bg-border-main w-full max-w-[200px]" />
      </div>
      
      <section className="flex flex-col gap-4 opacity-80">
        <h2 className="text-[20px] font-black text-text-primary px-2 text-center">Neler Planlıyoruz?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-base p-6 text-center bg-white border border-border-main relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">Çok Yakında</div>
            <div className="text-[32px] mb-2 grayscale">🐾</div>
            <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Playdate Bulucu</h3>
            <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
              Yakındaki uyumlu köpek veya kedilerle güvenli oyun buluşmaları planlayın.
            </p>
          </div>
          <div className="card-base p-6 text-center bg-white border border-border-main relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">Çok Yakında</div>
            <div className="text-[32px] mb-2 grayscale">💬</div>
            <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Can Dostu Forumları</h3>
            <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
              Beslenme, eğitim ve sağlık konularında deneyimli sahiplerin tecrübelerinden faydalanın.
            </p>
          </div>
          <div className="card-base p-6 text-center bg-white border border-border-main relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">Çok Yakında</div>
            <div className="text-[32px] mb-2 grayscale">🏆</div>
            <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Etkinlikler</h3>
            <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
              Şehrinizdeki evcil hayvan şenlikleri, eğitim seminerleri ve buluşmalardan haberdar olun.
            </p>
          </div>
        </div>
      </section>

      {/* Action / Back to Dashboard */}
      <div className="flex justify-center mt-2">
        <Link href="/owner/dashboard" className="btn-primary min-h-[50px] flex items-center justify-center px-6 gap-2 text-[14px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ana Sayfaya Dön
        </Link>
      </div>

    </div>
  )
}
