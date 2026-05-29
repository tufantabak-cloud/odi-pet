import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import JournalFormClient from './JournalFormClient'

type PageProps = {
  params: Promise<{ id: string, category: string }>;
};

export default async function JournalCategoryFormPage(props: PageProps) {
  const user = await getSessionUser()
  const { id, category } = await props.params
  if (!user) redirect('/login')

  const validCategories = ['appetite', 'mood', 'nutrition', 'activity', 'note']
  if (!validCategories.includes(category)) redirect(`/owner/pets/${id}/journal/new`)

  let title = ''
  switch (category) {
    case 'appetite': title = 'İştah Kaydı'; break;
    case 'mood': title = 'Ruh Hali Kaydı'; break;
    case 'nutrition': title = 'Beslenme Kaydı'; break;
    case 'activity': title = 'Aktivite Kaydı'; break;
    case 'note': title = 'Genel Not'; break;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/owner/pets/${id}/journal/new`} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h1 className="text-[24px] font-extrabold text-text-primary leading-none">{title}</h1>
      </div>

      <JournalFormClient petId={id} category={category} />
    </div>
  )
}
