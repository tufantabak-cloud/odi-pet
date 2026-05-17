import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClinicPetsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user?.id)
  const clinicId = memberships?.[0]?.clinic_id ?? null

  const { data: appointments } = clinicId
    ? await supabase
        .from('appointments')
        .select('pet_id, pets(id, name, species, breed, birth_date, avatar_url)')
        .eq('clinic_id', clinicId)
    : { data: [] }

  // Unique pets
  const seen = new Set<string>()
  const pets = (appointments ?? [])
    .map((a: any) => a.pets)
    .filter((p: any): p is NonNullable<typeof p> => {
      if (!p || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Hasta Kaydı</h1>
        <p className="text-text-secondary mt-1 font-medium">
          {pets.length} aktif hasta — klinike randevusu olan tüm hayvanlar
        </p>
      </div>

      {pets.length === 0 ? (
        <div className="card-base p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-soft rounded-[18px] flex items-center justify-center text-primary mb-4 rotate-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5c2.8 0 5 2.2 5 5 0 3-4 8-5 10-1-2-5-7-5-10 0-2.8 2.2-5 5-5z"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Henüz hasta kaydı yok</h3>
          <p className="text-text-secondary text-[14px] mt-2">Pet sahipleri bu klinike randevu aldığında hasta listesi oluşur.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map((pet: any) => {
            const born = pet.birth_date ? new Date(pet.birth_date) : null
            const ageMonths = born ? Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 30)) : null
            const ageLabel = ageMonths === null ? '—' : ageMonths < 12 ? `${ageMonths} ay` : `${Math.floor(ageMonths / 12)} yıl`

            return (
              <Link key={pet.id} href={`/clinic/pets/${pet.id}`}
                className="card-base p-6 group cursor-pointer hover:border-primary/20 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border-main/60">
                  <div className="w-14 h-14 rounded-[16px] bg-gradient-to-tr from-primary-soft to-white flex items-center justify-center text-primary text-[22px] font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden shrink-0">
                    {pet.avatar_url
                      ? <img src={pet.avatar_url} className="w-full h-full object-cover" alt={pet.name}/>
                      : pet.name.charAt(0)
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-text-primary text-[17px] truncate">{pet.name}</p>
                    <p className="text-[13px] text-text-secondary">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="badge-success text-[11px]">Aktif</span>
                    {ageMonths !== null && (
                      <span className="text-[11px] bg-bg-main text-text-secondary border border-border-main px-2 py-1 rounded-full font-semibold">{ageLabel}</span>
                    )}
                  </div>
                  <span className="text-[12px] font-bold text-primary flex items-center gap-1 group-hover:underline">
                    Hasta Dosyası
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
