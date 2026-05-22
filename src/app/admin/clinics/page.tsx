import { Suspense } from 'react'
import AdminClinicsClient from './AdminClinicsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Klinik Yönetimi — Odi Admin',
}

export default function AdminClinicsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-secondary">Yükleniyor…</div>}>
      <AdminClinicsClient />
    </Suspense>
  )
}
