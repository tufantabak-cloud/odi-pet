'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function DeleteAccountRow() {
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setOpenModal(false)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Hesap silme işlemi başarısız oldu.')
      }

      // Başarılı silme sonrası oturum temizlenir ve login ekranına yönlendirilir
      window.location.href = '/login?message=Hesabınız başarıyla silindi.'
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenModal(true)}
        disabled={loading}
        className="w-full p-4 hover:bg-rose-50/50 transition-all cursor-pointer text-error flex justify-between items-center active:scale-[0.99] disabled:opacity-50 text-left font-semibold text-sm"
      >
        <span>{loading ? 'Hesap Siliniyor...' : 'Hesabı Sil'}</span>
        <Trash2 className="w-4 h-4 text-error" />
      </button>

      {error && (
        <div className="p-3 bg-rose-50 text-error text-xs font-semibold border-t border-rose-100">
          {error}
        </div>
      )}

      <ConfirmModal
        open={openModal}
        title="Hesabınızı Silmek İstediğinize Emin Misiniz?"
        message="DİKKAT: Hesabınızı sildiğinizde; evcil hayvanlarınız, aşı/parazit kayıtlarınız, sağlık geçmişiniz, AI sohbetleriniz ve tüm abonelik verileriniz KALICI OLARAK silinecektir. Bu işlem geri alınamaz!"
        confirmLabel={loading ? 'Siliniyor...' : 'Evet, Hesabımı Kalıcı Olarak Sil'}
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setOpenModal(false)}
      />
    </>
  )
}
