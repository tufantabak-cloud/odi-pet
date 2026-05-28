import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calcAge } from '@/lib/pets/utils'
import { VaccineIcon, BowlIcon, PillIcon } from '@/components/icons/PetIcons'

export const metadata = {
  title: 'Can Dostlarım | Odi.Pet',
  description: 'Tüm can dostlarınızı görüntüleyin ve yönetin.',
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
            Can Dostlarım
          </h1>
          <p className="text-text-secondary font-medium mt-1">
            {pets && pets.length > 0
              ? `${pets.length} can dostu kaydı bulunuyor`
              : 'Henüz can dostu eklemediniz'}
          </p>
        </div>
        <Link
          href="/owner/pets/add"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-sm whitespace-nowrap mt-1"
        >
          <span className="text-[16px] leading-none">+</span> Can Dost Ekle
        </Link>
      </div>

      {/* İçerik */}
      {pets && pets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map(pet => {
            const age = calcAge(pet.birth_date)
            return (
              <div
                key={pet.id}
                data-testid="pet-card"
                className="card-base overflow-hidden p-5 group hover:shadow-lg hover:border-primary/30 transition-all duration-200 relative"
              >
                {/* Main Link overlay */}
                <Link href={`/owner/pets/${pet.id}`} className="absolute inset-0 z-20" aria-label={`${pet.name} profiline git`} />

                {/* Top Gradient Ribbon */}
                <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover w-full absolute top-0 left-0" />

                {/* Edit Pen Decoration */}
                <div className="absolute top-5 right-5 text-text-secondary hover:text-primary transition-colors duration-200 z-30">
                  <Link href={`/owner/pets/${pet.id}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </Link>
                </div>

                {/* Horizontal Content */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-row gap-4 items-start">
                    {/* Avatar */}
                    <div className="relative w-20 h-20 rounded-[20px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[32px] font-black shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden border border-border-main shadow-sm">
                      {pet.avatar_url
                        ? <Image src={pet.avatar_url} alt={pet.name} fill={true} className="object-cover" />
                        : (pet.name || '?').charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h2 className="text-[18px] font-extrabold text-text-primary truncate group-hover:text-primary transition-colors leading-tight">
                        {pet.name}
                      </h2>
                      <p className="text-[13px] text-text-secondary font-semibold">
                        {pet.species === 'dog' ? 'Köpek' : pet.species === 'cat' ? 'Kedi' : pet.species} • {pet.breed || 'Irk Bilinmiyor'}
                      </p>

                      {/* Age Badge */}
                      {pet.birth_date && (
                        <div className="flex mt-0.5">
                          <span className="text-[11.5px] bg-bg-main border border-border-main px-2.5 py-0.5 rounded-lg font-semibold text-text-secondary flex items-center gap-1 shadow-sm">
                            🎂 {age.text}
                          </span>
                        </div>
                      )}

                      {/* Weight & Gender */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                        {pet.weight && (
                          <span className="text-[11.5px] bg-bg-main border border-border-main px-2.5 py-0.5 rounded-lg font-semibold text-text-secondary flex items-center gap-1 shadow-sm">
                            ⚖️ {pet.weight} kg
                          </span>
                        )}
                        {pet.gender && (
                          <span className="text-text-secondary font-bold text-[12.5px] flex items-center gap-1 ml-0.5">
                            • {pet.gender === 'male' ? 'Erkek' : pet.gender === 'female' ? 'Dişi' : 'Bilinmiyor'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kamera & TAG Quick Action Buttons */}
                  <div className="flex gap-2.5 z-30 mt-1">
                    <Link
                      href={`/owner/devices/camera?petId=${pet.id}`}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-center py-2.5 px-2 rounded-xl text-[12px] font-black tracking-wider uppercase shadow-sm active:scale-95 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <span className="animate-pulse">🟢</span> Canlı İzle
                    </Link>
                    <Link
                      href={`/owner/devices/setup?petId=${pet.id}&type=tag`}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-center py-2.5 px-2 rounded-xl text-[12px] font-black tracking-wider uppercase shadow-md active:scale-95 hover:scale-[1.02] transition-all duration-200"
                    >
                      Akıllı Künye (TAG)
                    </Link>
                  </div>
                </div>
              </div>
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
            <h2 className="text-[22px] font-extrabold text-text-primary mb-2">Henüz Can Dostu Eklemediniz</h2>
            <p className="text-text-secondary font-medium max-w-sm">
              Odi.Pet ile can dostlarınızın sağlık, beslenme ve aşı takibini kolayca yapın. Alttaki <strong>+</strong> butonuna dokunarak ilk can dostunuzu ekleyebilirsiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
