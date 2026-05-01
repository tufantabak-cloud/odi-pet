"use no memo"
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export default async function OwnerPetsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', user?.id)
    .order('created_at', { ascending: false })

  const calcAge = (birthDate: string | null) => {
    if (!birthDate) return null
    const ageMonths = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    return ageMonths < 12 ? `${ageMonths} ay` : `${Math.floor(ageMonths / 12)} yıl`
  }

  const speciesEmoji: Record<string, string> = {
    'Kedi': '🐱', 'Köpek': '🐶'
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-10">
      <div className="flex sm:items-end justify-between flex-col sm:flex-row gap-4 border-b border-border-main pb-4">
        <div>
          <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Pati Dostlarım</h1>
          <p className="text-text-secondary mt-1 font-medium">{pets?.length ?? 0} kayıtlı can dostu</p>
        </div>
        <Link href="/owner/pets/add" className="btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 sm:w-auto w-full">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Yeni Pati Ekle
        </Link>
      </div>

      {(!pets || pets.length === 0) ? (
        <div className="card-base p-16 text-center border-2 border-dashed flex flex-col items-center">
          <div className="text-[64px] mb-4">🐾</div>
          <h3 className="text-[20px] font-bold text-text-primary">Henüz pati eklemediniz</h3>
          <p className="text-text-secondary mt-2 text-[15px] max-w-sm">İlk pati dostunuzu ekleyerek sağlık takibine başlayın.</p>
          <Link href="/owner/pets/add" className="btn-primary mt-6 px-10 shadow-lg shadow-primary/20">
            İlk Patiyi Ekle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {pets.map(pet => {
            const age = calcAge(pet.birth_date)
            const emoji = speciesEmoji[pet.species] ?? '🐾'
            return (
              <div key={pet.id} className="card-base p-6 group block animate-fadeInUp">
                <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-4 mb-5 pb-5 border-b border-border-main/60">
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-gradient-to-tr from-primary-soft to-white flex items-center justify-center text-primary text-[28px] font-black group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm overflow-hidden shrink-0">
                    {pet.avatar_url
                      ? <img src={pet.avatar_url} className="w-full h-full object-cover" alt={pet.name}/>
                      : <span>{emoji}</span>}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h2 className="text-[18px] font-extrabold text-text-primary truncate">{pet.name}</h2>
                    <p className="text-[13px] font-semibold text-text-secondary">
                      {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                    </p>
                    {age && <p className="text-[12px] text-text-secondary/70 font-medium">{age}</p>}
                  </div>
                </Link>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <span className="badge-success text-[11px]">Sağlıklı</span>
                    {pet.microchip_no && (
                      <span className="text-[11px] bg-bg-main border border-border-main text-text-secondary px-2 py-1 rounded-full font-semibold">📡 Çipli</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/owner/pets/${pet.id}`}
                      className="text-[12px] font-bold text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
                      Profil
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                    <Link href={`/owner/pets/${pet.id}/edit`}
                      className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
                      Düzenle
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
