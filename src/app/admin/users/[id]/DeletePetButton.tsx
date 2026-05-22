'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function DeletePetButton({ petId, petName }: { petId: string, petName: string }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setShowConfirm(false)
    setError(null)
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
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title="Evcil Hayvanı Sil"
        className="p-2 ml-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
      >
        {loading ? '⏳' : '🗑️'}
      </button>

      {error && <p className="text-xs text-rose-500 ml-2 mt-1">{error}</p>}

      <ConfirmModal
        open={showConfirm}
        title="Evcil Hayvanı Sil"
        message={`DİKKAT: ${petName} isimli evcil hayvanı kalıcı olarak silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
