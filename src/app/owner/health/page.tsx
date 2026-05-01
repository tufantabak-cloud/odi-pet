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
    <div className="flex flex-col gap-8 pb-10 w-full max-w-3xl mx-auto">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Sağlık Merkezi</h1>
        <p className="text-text-secondary mt-1 text-[16px] font-medium">Aşı, hastalık, alerji ve ilaç takip modülü</p>
      </div>

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
