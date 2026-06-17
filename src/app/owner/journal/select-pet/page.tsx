import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const REDIRECT_MAP: Record<string, (id: string) => string> = {
  journal:   (id) => `/owner/pets/${id}/journal`,
  new:       (id) => `/owner/pets/${id}/journal/new`,
  nutrition: (id) => `/owner/pets/${id}/nutrition`,
  care:      (id) => `/owner/pets/${id}/care`,
  health:    (id) => `/owner/pets/${id}/treatments`,
}

const REDIRECT_LABELS: Record<string, string> = {
  journal:   'günlük işlemi',
  new:       'yeni günlük kaydı',
  nutrition: 'beslenme modülü',
  care:      'bakım modülü',
  health:    'sağlık & aşı modülü',
}

export default async function SelectPetPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const redirectKey = params.redirect ?? 'journal'
  const resolveTarget = REDIRECT_MAP[redirectKey] ?? REDIRECT_MAP.journal

  const supabase = await createServerSupabaseClient()
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, avatar_url, species, breed')
    .eq('owner_id', user.id)

  if (!pets || pets.length === 0) redirect('/owner/dashboard')
  if (pets.length === 1) redirect(resolveTarget(pets[0].id))

  const actionLabel = REDIRECT_LABELS[redirectKey] ?? 'işlemi'

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/owner/dashboard"
          className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <h1 className="text-[24px] font-extrabold text-text-primary leading-none">Can Dostu Seç</h1>
      </div>

      <p className="text-[14px] text-text-secondary">
        Hangi can dostunuz için{' '}
        <span className="font-bold text-text-primary">{actionLabel}</span>{' '}
        yapmak istiyorsunuz?
      </p>

      <div className="flex flex-col gap-3">
        {pets.map(pet => (
          <Link
            key={pet.id}
            href={resolveTarget(pet.id)}
            className="card-base p-4 flex items-center gap-4 bg-surface border border-border-main hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 relative rounded-2xl overflow-hidden shrink-0 bg-bg-main flex items-center justify-center">
              {pet.avatar_url ? (
                <Image
                  src={pet.avatar_url}
                  alt={pet.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <span className="text-[24px] font-black text-primary/40">{pet.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-extrabold text-text-primary group-hover:text-primary transition-colors truncate">{pet.name}</h2>
              <p className="text-[12px] font-medium text-text-secondary">
                {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
              </p>
            </div>
            <div className="text-text-secondary group-hover:text-primary transition-colors shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
