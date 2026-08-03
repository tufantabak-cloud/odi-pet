import { Suspense } from 'react'
import AdminUsersClient from './AdminUsersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Kullanıcı Yönetimi — Odi Admin',
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-secondary">Yükleniyor…</div>}>
      <AdminUsersClient />
    </Suspense>
  )
}
