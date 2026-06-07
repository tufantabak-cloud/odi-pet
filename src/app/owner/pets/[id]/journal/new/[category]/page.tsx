import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import JournalFormClient from './JournalFormClient'
import SmartBackButton from '@/components/ui/SmartBackButton'

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
        <SmartBackButton fallbackHref={`/owner/pets/${id}/journal`} />
        <h1 className="text-[24px] font-extrabold text-text-primary leading-none">{title}</h1>
      </div>

      <JournalFormClient petId={id} category={category} />
    </div>
  )
}
