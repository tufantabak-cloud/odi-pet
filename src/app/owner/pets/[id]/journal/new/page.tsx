import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'appetite', label: 'İştah', icon: '🥣', desc: 'İştahını nasıl buldunuz?' },
  { id: 'mood', label: 'Ruh Hali', icon: '🎭', desc: 'Genel durumu nasıl?' },
  { id: 'nutrition', label: 'Beslenme', icon: '🥩', desc: 'Öğün detayları' },
  { id: 'activity', label: 'Aktivite', icon: '🎾', desc: 'Egzersiz ve oyun' },
  { id: 'note', label: 'Genel Not', icon: '📝', desc: 'Serbest metin' }
]

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewJournalEntryPage(props: PageProps) {
  const user = await getSessionUser()
  const { id } = await props.params
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/owner/pets/${id}/journal`} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h1 className="text-[24px] font-extrabold text-text-primary leading-none">Yeni Kayıt</h1>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-text-secondary mb-2">Hangi durumu kaydetmek istiyorsunuz?</p>
        
        {CATEGORIES.map(cat => (
          <Link key={cat.id} href={`/owner/pets/${id}/journal/new/${cat.id}`} className="card-base p-4 flex items-center gap-4 border border-border-main hover:border-primary/40 hover:shadow-md transition-all group bg-surface">
            <div className="w-12 h-12 rounded-2xl bg-bg-main flex items-center justify-center shrink-0 text-[24px] shadow-sm group-hover:scale-105 transition-transform">
              {cat.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-extrabold text-text-primary group-hover:text-primary transition-colors">{cat.label}</h2>
              <p className="text-[13px] text-text-secondary">{cat.desc}</p>
            </div>
            <div className="text-text-secondary group-hover:text-primary transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
