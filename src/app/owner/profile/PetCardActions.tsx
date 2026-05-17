'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PetCardActions({ pet }: { pet: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showMenu, setShowMenu] = useState(false)

  const handleResetData = async () => {
    if (confirm(`DİKKAT: ${pet.name} adlı dostunuzun TÜM sağlık geçmişini (aşılar, ölçümler, notlar vb.) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/pets/${pet.id}/reset`, { method: 'POST' })
          if (!res.ok) throw new Error('Veriler silinemedi')
          alert('Sağlık verileri başarıyla temizlendi.')
          router.refresh()
        } catch (e: any) {
          alert('Hata: ' + e.message)
        }
      })
    }
  }

  const handleDeletePet = async () => {
    if (confirm(`DİKKAT: ${pet.name} adlı dostunuzun profilini TAMAMEN silmek üzeresiniz. Tüm fotoğraflar, veriler ve ayarlar kalıcı olarak yok edilecektir. Onaylıyor musunuz?`)) {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Profil silinemedi')
          }
          alert(`${pet.name} başarıyla silindi.`)
          window.location.reload()
        } catch (e: any) {
          alert('Hata: ' + e.message)
        }
      })
    }
  }

  return (
    <div className="relative">
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
              onClick={() => { setShowMenu(false); handleResetData(); }}
              className="w-full text-left px-4 py-2 text-[13px] font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
            >
              🧹 Sağlık Verilerini Temizle
            </button>
            <button 
              onClick={() => { setShowMenu(false); handleDeletePet(); }}
              className="w-full text-left px-4 py-2 text-[13px] font-semibold text-error hover:bg-error/5 flex items-center gap-2"
            >
              🗑️ Profili Kalıcı Olarak Sil
            </button>
          </div>
        </>
      )}
    </div>
  )
}
