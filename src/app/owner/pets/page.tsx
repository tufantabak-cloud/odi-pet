import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calcAge } from '@/lib/pets/utils'

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <Link
          href="/owner/pets/add"
          className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary/20 whitespace-nowrap"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          Yeni Pati Ekle
        </Link>
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
                  {/* Yaş Etiketi */}
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                    age.label === 'Yavru' ? 'bg-blue-50 text-blue-600'
                    : age.label === 'Yetişkin' ? 'bg-green-50 text-green-600'
                    : age.label === 'Yaşlı' ? 'bg-amber-50 text-amber-600'
                    : 'bg-purple-50 text-purple-600'
                  }`}>
                    {age.label}
                  </span>
                </div>

                {/* Meta Bilgiler */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-main">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Yaş</span>
                    <span className="text-[14px] font-bold text-text-primary">{age.text}</span>
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
                  <span className="flex-1 text-center py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all">
                    💉 Sağlık
                  </span>
                  <span className="flex-1 text-center py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all">
                    🍽 Beslenme
                  </span>
                  <span className="flex-1 text-center py-1.5 text-[11px] font-bold text-text-secondary bg-bg-main rounded-xl border border-border-main hover:border-primary/30 hover:text-primary transition-all">
                    📋 Tedavi
                  </span>
                </div>
              </Link>
            )
          })}

          {/* Yeni Pati Ekle Kartı */}
          <Link
            href="/owner/pets/add"
            className="rounded-[20px] border-2 border-dashed border-border-main hover:border-primary/40 hover:bg-primary-soft/20 transition-all duration-200 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer group min-h-[220px]"
          >
            <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-text-secondary group-hover:text-primary transition-colors">Yeni Pati Ekle</p>
              <p className="text-[12px] text-text-secondary/60 mt-0.5">Pati ailenizi büyütün</p>
            </div>
          </Link>
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
              Odi.Pet ile pati dostlarınızın sağlık, beslenme ve aşı takibini kolayca yapın.
            </p>
          </div>
          <Link href="/owner/pets/add" className="btn-primary px-10 py-3 shadow-xl shadow-primary/20">
            İlk Patiyi Ekle →
          </Link>
        </div>
      )}
    </div>
  )
}
