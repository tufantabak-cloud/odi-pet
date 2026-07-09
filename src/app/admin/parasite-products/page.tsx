import { Suspense } from 'react'
import AdminParasiteProductsClient from './AdminParasiteProductsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Parazit Ürünleri | Admin' }

export default function AdminParasiteProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      </div>
    }>
      <AdminParasiteProductsClient />
    </Suspense>
  )
}
