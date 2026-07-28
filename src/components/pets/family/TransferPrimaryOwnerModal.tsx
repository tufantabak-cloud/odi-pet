'use client'

import { useState } from 'react'

interface TransferTarget {
  profile_id: string
  first_name?: string
  last_name?: string
  email?: string
}

interface TransferPrimaryOwnerModalProps {
  isOpen: boolean
  onClose: () => void
  petId: string
  petName: string
  targetMember: TransferTarget | null
  onSuccess: () => void
}

export default function TransferPrimaryOwnerModal({
  isOpen,
  onClose,
  petId,
  petName,
  targetMember,
  onSuccess,
}: TransferPrimaryOwnerModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !targetMember) return null

  const targetName =
    [targetMember.first_name, targetMember.last_name].filter(Boolean).join(' ')
    || targetMember.email
    || 'Seçilen Üye'

  const isConfirmed =
    confirmationInput.trim().toLowerCase() === petName.trim().toLowerCase()

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!isConfirmed || loading || !targetMember) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/pets/family', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_primary_owner',
          pet_id: petId,
          profile_id: targetMember.profile_id,
          confirmation_text: confirmationInput,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Sahiplik devri başarısız oldu.')
        return
      }

      setConfirmationInput('')
      onSuccess()
      onClose()
    } catch {
      setErrorMsg('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-all">
        <div className="flex items-center space-x-3 text-purple-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700">
            👑
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Birincil Sahipliği Devret
          </h2>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-amber-50 p-4 border border-amber-200 text-sm text-amber-900">
          <p className="font-semibold text-amber-950">
            ⚠️ Kritik Sahiplik Devri Uyarısı
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>
              <strong>{petName}</strong> isimli evcil hayvanın birincil sahipliği{' '}
              <strong>{targetName}</strong> kullanıcısına devredilecektir.
            </li>
            <li>
              Devir sonrası sizin rolünüz kesin olarak{' '}
              <strong>Ortak Sahip (co_owner)</strong> olarak güncellenecektir.
            </li>
            <li>
              Bu işlem sonrası birincil sahiplik haklarınız sona erer; tekrar birincil sahip olmak için yeni sahibin size devretmesi gerekir.
            </li>
          </ul>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleTransfer} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Devri onaylamak için evcil hayvanın adını (<strong>{petName}</strong>) yazın:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={petName}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={!isConfirmed || loading}
              className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                isConfirmed && !loading
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Devrediliyor...' : 'Sahipliği Devret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
