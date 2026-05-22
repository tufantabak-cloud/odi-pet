'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function DeleteUserButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setShowConfirm(false)
    setError(null)
    setSuccess(null)
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Silme işlemi başarısız oldu')
      }

      setSuccess('Kullanıcı başarıyla silindi.')
      setTimeout(() => {
        router.push('/admin/users')
        router.refresh()
      }, 3000)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="w-full py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
      >
        {loading ? 'Siliniyor...' : 'Kullanıcıyı Sistemden Sil'}
      </button>

      {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
      {success && <p className="text-sm text-green-600 text-center">{success}</p>}

      <ConfirmModal
        open={showConfirm}
        title="Kullanıcıyı Sil"
        message="DİKKAT: Bu kullanıcıyı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!"
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
