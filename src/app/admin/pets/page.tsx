import { createAdminSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
          <h1 className="text-2xl font-black text-text-primary">Evcil Hayvan Yönetimi</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Kayıtlı evcil hayvanları görüntüleyin ve yönetin. Son 100 evcil hayvan gösteriliyor.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-[13px] px-4 py-2">
          ← Panele Dön
        </Link>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-[11px]">
              <tr>
                <th className="p-4">Pet Adı / Türü</th>
                <th className="p-4">Sahibi</th>
                <th className="p-4">Irk / Yaş</th>
                <th className="p-4">Kayıt Tarihi</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {pets?.map((pet) => (
                <tr key={pet.id} className="hover:bg-bg-main/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-text-primary flex items-center gap-2">
                      {pet.species?.toLowerCase() === 'cat' || pet.species?.toLowerCase() === 'kedi' ? '🐱' : '🐶'} {pet.name || 'Unnamed'}
                    </div>
                    <div className="text-[11px] text-text-secondary font-mono mt-0.5">{pet.id}</div>
                  </td>
                  <td className="p-4">
                    {/* @ts-ignore */}
                    <div className="font-medium text-text-primary">
                      {pet.profiles ? [pet.profiles.first_name, pet.profiles.last_name].filter(Boolean).join(' ') : '—'}
                    </div>
                    {/* @ts-ignore */}
                    <div className="text-[11px] text-text-secondary">{pet.profiles?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-text-primary">{pet.breed || '—'}</div>
                    <div className="text-[11px] text-text-secondary">
                      {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">
                    {new Date(pet.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {pet.owner_id && (
                        <Link 
                          href={`/admin/users/${pet.owner_id}`}
                          className="text-[12px] font-bold text-primary bg-primary-soft hover:bg-primary-soft/80 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          Sahip Profili
                        </Link>
                      )}
                      <Link 
                        href={`/admin/pets/${pet.id}`}
                        className="text-[12px] font-bold text-text-primary bg-bg-main hover:bg-border-main/50 px-2.5 py-1.5 rounded-xl border border-border-main transition-all"
                      >
                        Pet Detayları
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!pets?.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary">
                    Evcil hayvan bulunamadı.
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
