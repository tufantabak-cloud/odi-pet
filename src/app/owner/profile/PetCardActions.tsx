'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ConfirmModal from '@/components/ui/ConfirmModal'

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
      message: `DİKKAT: ${pet.name} adlı dostunuzun TÜM sağlık geçmişini (aşılar, ölçümler, notlar vb.) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      confirmLabel: 'Evet, Temizle',
      onConfirm: () => startTransition(async () => {
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
      message: `DİKKAT: ${pet.name} adlı dostunuzun profilini TAMAMEN silmek üzeresiniz. Tüm fotoğraflar, veriler ve ayarlar kalıcı olarak yok edilecektir. Onayluyor musunuz?`,
      confirmLabel: 'Evet, Sil',
      onConfirm: () => startTransition(async () => {
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
        <div className={`mb-2 px-3 py-2 rounded-xl text-[12px] font-semibold border ${
          statusMessage.type === 'ok'
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-error/10 text-error border-error/20'
        }`}>
          {statusMessage.text}
          <button onClick={() => setStatusMessage(null)} className="ml-2 font-bold opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link 
          href={`/owner/pets/${pet.id}/edit`} 
          className="text-[12px] text-primary font-bold hover:underline"
        >
          Düzenle
        </Link>
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-main text-text-secondary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-border-main rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 origin-bottom-right">
            <button 
              onClick={handleResetData}
              className="w-full text-left px-4 py-2 text-[13px] font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
            >
              🧹 Sağlık Verilerini Temizle
            </button>
            <button 
              onClick={handleDeletePet}
              className="w-full text-left px-4 py-2 text-[13px] font-semibold text-error hover:bg-error/5 flex items-center gap-2"
            >
              🗑️ Profili Kalıcı Olarak Sil
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
        onConfirm={() => { closeConfirm(); confirmState.onConfirm() }}
        onCancel={closeConfirm}
      />
    </div>
  )
}
