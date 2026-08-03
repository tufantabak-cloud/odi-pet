'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PendingInviteModalProps {
  pendingInvites?: Array<{
    id: string
    token: string
    role: string
    created_at: string
    expires_at: string
    pets?: {
      id: string
      name: string
      species: string
      breed?: string
      avatar_url?: string
      profiles?: {
        first_name?: string
        last_name?: string
      }
    }
  }>
}

const ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  admin: { label: 'Admin', desc: 'Sağlık & veteriner yönetimi', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  editor: { label: 'Editör', desc: 'Günlük bakım & beslenme kayıtları', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  viewer: { label: 'Görüntüleyici', desc: 'Salt okunur erişim', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  co_owner: { label: 'Ortak Sahip', desc: 'Tam sahiplik & bakım yetkisi', color: 'bg-amber-100 text-amber-800 border-amber-200' },
}

export default function PendingInviteModal({ pendingInvites }: PendingInviteModalProps) {
  const [currentInvite, setCurrentInvite] = useState<any>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successState, setSuccessState] = useState<{ petName: string; petId: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!pendingInvites || pendingInvites.length === 0) return

    // Dismissed listesinden olmayan ilk daveti bul
    const active = pendingInvites.find(inv => {
      if (!inv.token) return false
      const dismissed = typeof window !== 'undefined' && sessionStorage.getItem(`dismiss_invite_${inv.token}`)
      return !dismissed
    })

    if (active) {
      setCurrentInvite(active)
    }
  }, [pendingInvites])

  if (!currentInvite && !successState) return null

  const handleDismiss = () => {
    if (currentInvite?.token) {
      sessionStorage.setItem(`dismiss_invite_${currentInvite.token}`, 'true')
    }
    setCurrentInvite(null)
  }

  const handleAccept = async () => {
    if (!currentInvite?.token) return
    setIsAccepting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentInvite.token }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'ALREADY_MEMBER') {
          handleDismiss()
          router.push(`/owner/pets/${data.petId ?? currentInvite.pets?.id}`)
          return
        }
        setErrorMsg(data.error || 'Davet kabul edilirken bir sorun oluştu.')
        setIsAccepting(false)
        return
      }

      const petName = data.pet?.name || currentInvite.pets?.name || 'Can Dostu'
      const petId = data.pet?.id || currentInvite.pets?.id

      setSuccessState({ petName, petId })
      setCurrentInvite(null)
    } catch {
      setErrorMsg('Bağlantı hatası oluştu.')
    } finally {
      setIsAccepting(false)
    }
  }

  // ── Success State ──
  if (successState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-modal max-w-md w-full p-6 text-center shadow-2xl border border-primary/20 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl shadow-inner">
            🎉
          </div>
          <div>
            <span className="text-[12px] font-black text-emerald-600 uppercase tracking-widest">Tebrikler!</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {successState.petName}'nin Ekibine Katıldın!
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Artık {successState.petName}'nin tüm bakım ve sağlık geçmişini ortaklaşa yönetebilirsin.
            </p>
          </div>

          <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2">
            <span>⭐️</span> +25 Care Point hesabına tanımlandı!
          </div>

          <button
            onClick={() => {
              setSuccessState(null)
              router.push(`/owner/pets/${successState.petId}`)
              router.refresh()
            }}
            className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            {successState.petName}'nin Sayfasına Git →
          </button>
        </div>
      </div>
    )
  }

  // ── Invite Preview State ──
  const pet = currentInvite.pets
  const inviter = pet?.profiles
  const inviterName = inviter ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() : 'Bir kullanıcı'
  const roleInfo = ROLE_LABELS[currentInvite.role] ?? ROLE_LABELS.viewer

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-modal max-w-md w-full overflow-hidden shadow-2xl border border-purple-100 animate-scale-up">
        {/* Top Decorative Gradient */}
        <div className="h-2 bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500" />

        <div className="p-7 flex flex-col items-center text-center gap-5">
          {/* Avatar / Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-sheet bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center text-primary text-4xl font-black shadow-md border border-purple-200">
              {pet?.avatar_url ? (
                <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover rounded-sheet" />
              ) : (
                pet?.name?.charAt(0) ?? '🐾'
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-xs px-2 py-0.5 rounded-full font-black shadow-sm">
              YENİ!
            </span>
          </div>

          <div>
            <span className="text-[12px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
              Bakım Ekibi Daveti
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {pet?.name ?? 'Can Dostu'}'nun Ekibine Davet Edildiniz!
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              <strong className="text-slate-800">{inviterName}</strong> sizi <span className="font-semibold text-purple-700">{pet?.name}</span> ({pet?.species}{pet?.breed ? ` • ${pet.breed}` : ''}) için ekibe davet etti.
            </p>
          </div>

          {/* Role Card */}
          <div className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 ${roleInfo.color}`}>
            <div className="text-xl">🛡️</div>
            <div className="flex-1">
              <span className="font-black text-sm block">{roleInfo.label} Yetkisi</span>
              <span className="text-xs opacity-90 block mt-0.5">{roleInfo.desc}</span>
            </div>
          </div>

          {/* Reward Teaser */}
          <div className="w-full p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
            <span className="text-base">🎁</span> Kabul edince +25 Care Point kazanacaksın!
          </div>

          {errorMsg && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="w-full flex flex-col gap-2.5 mt-1">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm"
            >
              {isAccepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Kabul Ediliyor...
                </>
              ) : (
                `Daveti Kabul Et (+25 CP)`
              )}
            </button>

            <button
              onClick={handleDismiss}
              disabled={isAccepting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Daha Sonra Karar Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
