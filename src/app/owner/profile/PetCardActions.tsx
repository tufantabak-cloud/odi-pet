'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Edit3, MoreVertical, Eraser, Trash2, X } from 'lucide-react'

type ConfirmState = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

export default function PetCardActions({ pet }: { pet: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showMenu, setShowMenu] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  function openConfirm(cfg: Omit<ConfirmState, 'open'>) {
    setConfirmState({ open: true, ...cfg })
  }
  function closeConfirm() {
    setConfirmState(prev => ({ ...prev, open: false }))
  }

  const handleResetData = () => {
    setShowMenu(false)
    openConfirm({
      title: 'Sağlık Verilerini Temizle',
      message: `DİKKAT: ${pet.name} adlı dostunuzun TÜM sağlık geçmişini (aşılar, ölçümler, notlar vb.) temizlemek istediğinizden emin misiniz? Bu işlem arşivlenecek/arındırılacaktır.`,
      confirmLabel: 'Evet, Temizle',
      onConfirm: () =>
        startTransition(async () => {
          try {
            const res = await fetch(`/api/pets/${pet.id}/reset`, { method: 'POST' })
            if (!res.ok) throw new Error('Veriler silinemedi')
            setStatusMessage({ type: 'ok', text: 'Sağlık verileri başarıyla temizlendi.' })
            router.refresh()
          } catch (e: any) {
            setStatusMessage({ type: 'err', text: 'Hata: ' + e.message })
          }
        }),
    })
  }

  const handleDeletePet = () => {
    setShowMenu(false)
    openConfirm({
      title: 'Profili Kalıcı Olarak Sil',
      message: `DİKKAT: ${pet.name} adlı dostunuzun profilini silmek üzeresiniz. Onaylıyor musunuz?`,
      confirmLabel: 'Evet, Sil',
      onConfirm: () =>
        startTransition(async () => {
          try {
            const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Profil silinemedi')
            router.push('/owner/dashboard')
            router.refresh()
          } catch (e: any) {
            setStatusMessage({ type: 'err', text: 'Hata: ' + e.message })
          }
        }),
    })
  }

  return (
    <div className="relative">
      {statusMessage && (
        <div
          className={`mb-2 px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 ${
            statusMessage.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-error border-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold opacity-60 hover:opacity-100 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link
          href={`/owner/pets/${pet.id}/edit`}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bg-main text-text-secondary hover:text-primary transition-all active:scale-[0.95]"
          title="Düzenle"
        >
          <Edit3 className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bg-main text-text-secondary transition-all active:scale-[0.95]"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 origin-bottom-right">
            <button
              onClick={handleResetData}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
            >
              <Eraser className="w-4 h-4 text-amber-600" /> Sağlık Verilerini Temizle
            </button>
            <button
              onClick={handleDeletePet}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-error hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-error" /> Profili Kalıcı Olarak Sil
            </button>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel || 'Onayla'}
        cancelLabel="İptal"
        variant="danger"
        onConfirm={() => {
          closeConfirm()
          confirmState.onConfirm()
        }}
        onCancel={closeConfirm}
      />
    </div>
  )
}
