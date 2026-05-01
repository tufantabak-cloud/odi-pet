import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient'

export const metadata = { title: 'Household Takvimi — Odi' }

export default async function CalendarPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <CalendarClient />
}
