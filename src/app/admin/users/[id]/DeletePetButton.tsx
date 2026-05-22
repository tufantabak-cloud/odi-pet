'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeletePetButton({ petId, petName }: { petId: string, petName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm(`DİKKAT: ${petName} isimli evcil hayvanı kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/pets/${petId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Evcil hayvan silinirken hata oluştu')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Evcil Hayvanı Sil"
      className="p-2 ml-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
    >
      {loading ? '⏳' : '🗑️'}
    </button>
  )
}
