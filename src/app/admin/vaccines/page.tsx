import { Suspense } from 'react'
import AdminVaccinesClient from './AdminVaccinesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Aşı Protokolleri | Admin' }

export default function AdminVaccinesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      </div>
    }>
      <AdminVaccinesClient />
    </Suspense>
  )
}
