'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type InviteState =
  | { phase: 'loading' }
  | { phase: 'invalid'; error: string }
  | { phase: 'preview'; invite: any }
  | { phase: 'needsAuth' }
  | { phase: 'accepting' }
  | { phase: 'success'; pet: any; role: string; rewards: any }
  | { phase: 'error'; error: string; code?: string }

const ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  admin:  { label: 'Admin',        desc: 'Sağlık & veteriner yönetimi',      color: 'bg-blue-100 text-blue-700' },
  editor: { label: 'Editör',       desc: 'Günlük bakım görevleri',           color: 'bg-green-100 text-green-700' },
  viewer: { label: 'Görüntüleyici', desc: 'Salt okunur erişim',              color: 'bg-gray-100 text-gray-600' },
}

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const [state, setState] = useState<InviteState>({ phase: 'loading' })
  const router = useRouter()
  const { token } = use(params)

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/invite/accept?token=${token}`)
        const data = await res.json()
        if (!data.valid) {
          setState({ phase: 'invalid', error: data.error })
          return
        }
        setState({ phase: 'preview', invite: data.invite })
      } catch {
        setState({ phase: 'invalid', error: 'Bağlantı hatası oluştu' })
      }
    }
    validateToken()
  }, [token])

  async function handleAccept() {
    setState({ phase: 'accepting' })
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (res.status === 401 && data.requiresAuth) {
        // Preserve token through login redirect
        router.push(`/login?redirect=/invite/${token}`)
        return
      }
      if (!res.ok) {
        if (data.code === 'ALREADY_MEMBER') {
          router.push(`/owner/pets/${data.petId}`)
          return
        }
        setState({ phase: 'error', error: data.error, code: data.code })
        return
      }

      setState({ phase: 'success', pet: data.pet, role: data.role, rewards: data.rewards })
    } catch {
      setState({ phase: 'error', error: 'Beklenmeyen bir hata oluştu' })
    }
  }

  // ── Loading ──
  if (state.phase === 'loading') return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4 text-text-secondary">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        <p className="font-semibold">Davet doğrulanıyor...</p>
      </div>
    </div>
  )

  // ── Invalid ──
  if (state.phase === 'invalid') return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-main p-6">
      <div className="card-base max-w-sm w-full p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-[32px]">❌</div>
        <h1 className="text-[22px] font-extrabold text-text-primary">Geçersiz Davet</h1>
        <p className="text-text-secondary text-[14px]">{state.error}</p>
        <Link href="/owner/dashboard" className="btn-secondary w-full py-3">Ana Sayfaya Dön</Link>
      </div>
    </div>
  )

  // ── Error ──
  if (state.phase === 'error') return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-main p-6">
      <div className="card-base max-w-sm w-full p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-[32px]">⚠️</div>
        <h1 className="text-[22px] font-extrabold text-text-primary">Hata Oluştu</h1>
        <p className="text-text-secondary text-[14px]">{state.error}</p>
        {state.code === 'EXPIRED' && (
          <p className="text-[12px] text-text-secondary">Sahipten yeni bir davet göndermesini isteyin.</p>
        )}
        <Link href="/owner/dashboard" className="btn-primary w-full py-3">Ana Sayfaya Dön</Link>
      </div>
    </div>
  )

  // ── Success ──
  if (state.phase === 'success') {
    const roleInfo = ROLE_LABELS[state.role] ?? ROLE_LABELS.viewer
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-main p-6">
        <div className="card-base max-w-md w-full overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
          <div className="p-8 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[40px] font-black shadow-md">
              {state.pet?.name?.charAt(0) ?? '🐾'}
            </div>
            <div>
              <p className="text-[13px] font-bold text-primary uppercase tracking-widest mb-2">Hoş Geldin!</p>
              <h1 className="text-[26px] font-extrabold text-text-primary">
                {state.pet?.name}'nin Bakım Ekibindesin
              </h1>
              <p className="text-text-secondary text-[14px] mt-2">{state.pet?.species}{state.pet?.breed ? ` • ${state.pet.breed}` : ''}</p>
            </div>
            <span className={`text-[12px] font-black px-4 py-1.5 rounded-full ${roleInfo.color}`}>
              {roleInfo.label} — {roleInfo.desc}
            </span>

            {/* Reward Banner */}
            <div className="w-full p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <span className="text-[28px]">⭐️</span>
              <div className="text-left">
                <p className="font-bold text-amber-800 text-[14px]">+{state.rewards?.invited} Care Point Kazandın!</p>
                <p className="text-[12px] text-amber-700">Davet eden kişi de +{state.rewards?.inviter} CP aldı</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/owner/pets/${state.pet?.id}`)}
              className="btn-primary w-full py-3.5 text-[15px] font-bold"
            >
              {state.pet?.name}'nin Sayfasına Git →
            </button>
            <Link href="/owner/dashboard" className="text-[13px] text-text-secondary hover:text-primary transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview & Accepting ──
  const invite = state.phase === 'preview' ? state.invite : null
  const isAccepting = state.phase === 'accepting'
  const roleInfo = ROLE_LABELS[invite?.role ?? 'viewer'] ?? ROLE_LABELS.viewer
  const ownerName = invite?.pets?.profiles ? `${invite.pets.profiles.first_name ?? ''} ${invite.pets.profiles.last_name ?? ''}`.trim() : 'Bir kullanıcı'

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-main p-6">
      <div className="card-base max-w-md w-full overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
        <div className="p-8 flex flex-col items-center text-center gap-5">
          {/* Pet Avatar */}
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[48px] font-black shadow-md ring-2 ring-border-main">
            {invite?.pets?.name?.charAt(0) ?? '🐾'}
          </div>

          <div>
            <p className="text-[13px] font-bold text-text-secondary uppercase tracking-widest mb-2">
              {ownerName} sizi davet etti
            </p>
            <h1 className="text-[26px] font-extrabold text-text-primary leading-tight">
              {invite?.pets?.name}'nin Bakım Ekibine Katıl
            </h1>
            <p className="text-text-secondary text-[14px] mt-2">
              {invite?.pets?.species}{invite?.pets?.breed ? ` • ${invite.pets.breed}` : ''}
            </p>
          </div>

          {/* Role badge */}
          <div className={`w-full p-4 rounded-xl border flex items-center gap-3 ${roleInfo.color} border-current/20`}>
            <div className="flex-1 text-left">
              <p className="font-bold text-[14px]">Rolün: {roleInfo.label}</p>
              <p className="text-[12px] opacity-80 mt-0.5">{roleInfo.desc}</p>
            </div>
          </div>

          {/* Reward teaser */}
          <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <p className="text-[13px] font-bold text-amber-800">🎁 Katılınca +25 Care Point kazanırsın!</p>
          </div>

          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="btn-primary w-full py-3.5 text-[15px] font-bold"
          >
            {isAccepting
              ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Kabul Ediliyor...</span>
              : `${invite?.pets?.name}'nin Ekibine Katıl`
            }
          </button>

          <p className="text-[11px] text-text-secondary">
            Kabul ederek{' '}
            <Link href="/terms" className="underline hover:text-primary">Kullanım Koşulları</Link>'nı onaylamış olursunuz
          </p>
        </div>
      </div>
    </div>
  )
}
