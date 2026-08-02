import { createAdminSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PawPrint, Cat, Dog, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPetsPage() {
  const supabase = createAdminSupabaseClient()

  const { data: pets, error } = await supabase
    .from('pets')
    .select('*, profiles(email, first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching pets:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
            <PawPrint className="w-6 h-6 text-primary" />
            <span>Evcil Hayvan Yönetimi</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Kayıtlı evcil hayvanları görüntüleyin ve yönetin. Son 100 evcil hayvan gösteriliyor.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 active:scale-[0.98]">
          <ArrowLeft className="w-4 h-4" />
          <span>Panele Dön</span>
        </Link>
      </div>

      <div className="card-base rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-2xs">
              <tr>
                <th className="p-4">Pet Adı / Türü</th>
                <th className="p-4">Sahibi</th>
                <th className="p-4">Irk / Yaş</th>
                <th className="p-4">Kayıt Tarihi</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {pets?.map((pet) => {
                const isCat = pet.species?.toLowerCase() === 'cat' || pet.species?.toLowerCase() === 'kedi'
                const SpeciesIcon = isCat ? Cat : Dog
                return (
                  <tr key={pet.id} className="hover:bg-bg-main/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCat ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                          <SpeciesIcon className="w-4 h-4" />
                        </div>
                        <span>{pet.name || 'Unnamed'}</span>
                      </div>
                      <div className="text-2xs text-text-secondary font-mono mt-1">{pet.id}</div>
                    </td>
                    <td className="p-4">
                      {/* @ts-ignore */}
                      <div className="font-semibold text-text-primary text-xs">
                        {pet.profiles ? [pet.profiles.first_name, pet.profiles.last_name].filter(Boolean).join(' ') : '—'}
                      </div>
                      {/* @ts-ignore */}
                      <div className="text-2xs text-text-secondary">{pet.profiles?.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-text-primary font-medium">{pet.breed || '—'}</div>
                      <div className="text-2xs text-text-secondary">
                        {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString('tr-TR') : '—'}
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {new Date(pet.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pet.owner_id && (
                          <Link 
                            href={`/admin/users/${pet.owner_id}`}
                            className="text-xs font-bold text-primary bg-primary-soft hover:bg-primary-soft/80 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98]"
                          >
                            Sahip Profili
                          </Link>
                        )}
                        <Link 
                          href={`/owner/pets/${pet.id}`}
                          className="text-xs font-bold text-text-primary bg-bg-main hover:bg-border-main/50 px-3 py-1.5 rounded-xl border border-border-main transition-all active:scale-[0.98]"
                        >
                          Pet Detayları
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!pets?.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary">
                    <PawPrint className="w-8 h-8 mx-auto mb-2 text-text-secondary opacity-50" />
                    <p className="font-semibold text-sm">Evcil hayvan bulunamadı.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
