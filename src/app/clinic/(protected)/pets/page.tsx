import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

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
          <div className="w-20 h-20 bg-primary-soft rounded-sheet flex items-center justify-center mb-5 rotate-3 shadow-sm border border-primary/20">
            <svg viewBox="0 0 32 32" className="w-12 h-12 drop-shadow-md"><circle cx="16" cy="16" r="14" fill="url(#clinic-grad)"/><path d="M16 8v16M8 16h16" stroke="#fff" strokeWidth="4" strokeLinecap="round"/><defs><linearGradient id="clinic-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#1E3A8A"/></linearGradient></defs></svg>
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
                className="card-base p-6 group cursor-pointer hover:border-primary/20 hover:shadow-medium hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border-main/60">
                  <div className="relative w-14 h-14 rounded-card bg-gradient-to-tr from-primary-soft to-white flex items-center justify-center text-primary text-[22px] font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden shrink-0">
                    {pet.avatar_url
                      ? <Image src={pet.avatar_url} fill={true} className="object-cover" alt={pet.name}/>
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
