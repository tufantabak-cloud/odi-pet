import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import HealthClient from '@/components/health/HealthClient'
import Link from 'next/link'

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ pet?: string }> }) {
  const user = await getSessionUser()
  const { pet: petId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: pets } = await supabase.from('pets').select('id, name').eq('owner_id', user?.id)

  const activePetId = petId ?? pets?.[0]?.id

  return (
    <div className="flex flex-col gap-8 pb-10 w-full mx-auto">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Sağlık Merkezi</h1>
        <p className="text-text-secondary mt-1 text-[16px] font-medium">Aşı, hastalık, alerji ve ilaç takip modülü</p>
      </div>

      {/* Vet Finder Promo Card */}
      <Link href="/vets" className="card-base p-6 bg-gradient-to-r from-primary to-indigo-600 text-white flex items-center justify-between group hover:shadow-medium transition-all animate-fadeInUp">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
             <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Veteriner Bul</h3>
            <p className="text-white/80 text-[14px] font-medium">Çevrendeki en yakın kliniklere anında ulaş.</p>
          </div>
        </div>
        <div className="bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-black shadow-sm group-hover:bg-primary-soft transition-colors">
          KEŞFET
        </div>
      </Link>

      {/* Pet Switcher */}
      {pets && pets.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {pets.map(p => (
            <Link key={p.id} href={`/owner/health?pet=${p.id}`}
              className={`px-4 py-2 rounded-full text-[13px] font-bold shrink-0 border transition-colors
                ${p.id === activePetId ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface border-border-main text-text-secondary hover:border-primary/30'}`}>
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {activePetId ? (
        <HealthClient petId={activePetId} />
      ) : (
        <div className="bg-bg-main border border-border-main rounded-[20px] p-10 text-center">
          <p className="font-bold text-text-primary mb-2">Henüz kayıtlı bir patiniz yok.</p>
          <a href="/owner/pets" className="text-primary text-[14px] font-bold hover:underline">Şimdi ekleyin →</a>
        </div>
      )}
    </div>
  )
}
