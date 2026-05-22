'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteUserButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm('DİKKAT: Bu kullanıcıyı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Silme işlemi başarısız oldu')
      }

      alert('Kullanıcı başarıyla silindi.')
      router.push('/admin/users')
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
      className="w-full py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
    >
      {loading ? 'Siliniyor...' : 'Kullanıcıyı Sistemden Sil'}
    </button>
  )
}
