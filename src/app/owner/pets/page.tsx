import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calcAge } from '@/lib/pets/utils'
import { VaccineIcon, BowlIcon, PillIcon } from '@/components/icons/PetIcons'

export const metadata = {
  title: 'Pati Dostlarım | Odi.Pet',
  description: 'Tüm pati dostlarınızı görüntüleyin ve yönetin.',
}

export default async function PetsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Başlık */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
          Pati Dostlarım
        </h1>
        <p className="text-text-secondary font-medium mt-1">
          {pets && pets.length > 0
            ? `${pets.length} pati kaydı bulunuyor`
            : 'Henüz pati eklemediniz'}
        </p>
      </div>

      {/* İçerik */}
      {pets && pets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map(pet => {
            const age = calcAge(pet.birth_date)
            return (
              <Link
                key={pet.id}
                href={`/owner/pets/${pet.id}`}
                data-testid="pet-card"
                className="card-base p-5 flex flex-col gap-4 group hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer"
              >
                {/* Avatar + İsim */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-primary-soft to-primary/10 flex items-center justify-center text-primary text-[28px] font-black shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden border border-border-main">
                    {pet.avatar_url
                      ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      : (pet.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[18px] font-extrabold text-text-primary truncate group-hover:text-primary transition-colors">
                      {pet.name}
                    </h2>
                    <p className="text-[13px] text-text-secondary font-medium">
                      {pet.species === 'dog' ? '🐶 Köpek' : pet.species === 'cat' ? '🐱 Kedi' : pet.species} • {pet.breed || 'Irk Bilinmiyor'}
                    </p>
                  </div>
                </div>

                {/* Meta Bilgiler */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-main">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Yaş</span>
                    <span className="text-[14px] font-bold text-text-primary">{age.text} ({age.label})</span>
                  </div>
                  {pet.weight && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Ağırlık</span>
                      <span className="text-[14px] font-bold text-text-primary">{pet.weight} kg</span>
                    </div>
                  )}
                </div>

                {/* Kısayollar */}
                <div className="flex gap-2">
                  <span className="flex-1 py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-1">
                    <VaccineIcon width={14} height={14} /> Sağlık
                  </span>
                  <span className="flex-1 py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-1">
                    <BowlIcon width={14} height={14} /> Beslenme
                  </span>
                  <span className="flex-1 py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-1">
                    <PillIcon width={14} height={14} /> Tedavi
                  </span>
                </div>
              </Link>
            )
          })}


        </div>
      ) : (
        // Boş Durum
        <div className="card-base p-12 flex flex-col items-center text-center gap-6 border-dashed border-2 border-border-main">
          <div className="w-20 h-20 rounded-[24px] bg-primary-soft flex items-center justify-center text-[40px]">
            🐾
          </div>
          <div>
            <h2 className="text-[22px] font-extrabold text-text-primary mb-2">Henüz Pati Eklemediniz</h2>
            <p className="text-text-secondary font-medium max-w-sm">
              Odi.Pet ile pati dostlarınızın sağlık, beslenme ve aşı takibini kolayca yapın. Alttaki <strong>+</strong> butonuna dokunarak ilk patiyi ekleyebilirsiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
