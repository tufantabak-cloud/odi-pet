'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useWebPush } from '@/hooks/useWebPush'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { isSubscribed, isLoading, subscribe } = useWebPush()
  const [errorMsg, setErrorMsg] = useState('')
  const [justSubscribed, setJustSubscribed] = useState(false)

  const petId   = params.get('id')   ?? ''
  const petName = params.get('name') ?? 'Dostunuz'

  if (!petId) {
    router.replace('/owner/pets/add')
    return null
  }

  const handleSubscribe = async () => {
    setErrorMsg('')
    const success = await subscribe()
    if (success) {
      setJustSubscribed(true)
      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/owner/pets/${petId}`)
      }, 1500)
    } else {
      if (Notification.permission === 'denied') {
        setErrorMsg('Tarayıcınızda bildirim izinleri engellenmiş. Lütfen tarayıcı ayarlarından izni açın.')
      } else {
        setErrorMsg('Bildirimler etkinleştirilemedi. Lütfen tekrar deneyin.')
      }
    }
  }

  const isAlreadyActive = isSubscribed || justSubscribed

  return (
    <div className="card-base p-8 sm:p-10 flex flex-col items-center gap-6 animate-fadeInUp mt-10 max-w-md mx-auto border border-primary/10 text-center">
      {/* 3D gradient pet-centric bell collar icon */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-soft to-indigo-50/30 flex items-center justify-center shadow-md relative hover:scale-105 transition-transform duration-300 group">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
          <defs>
            <linearGradient id="collarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4F46E5" floodOpacity="0.25" />
            </filter>
            <filter id="bellShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#D97706" floodOpacity="0.3" />
            </filter>
          </defs>
          <path d="M12 24C12 24 24 28 32 28C40 28 52 24 52 24C52 24 48 34 32 34C16 34 12 24 12 24Z" fill="url(#collarGrad)" filter="url(#softShadow)" />
          <circle cx="32" cy="35" r="4" stroke="#F59E0B" strokeWidth="2" fill="none" />
          <circle cx="32" cy="44" r="10" fill="url(#bellGrad)" filter="url(#bellShadow)" className="group-hover:rotate-12 origin-[32px_35px] transition-transform duration-300" />
          <path d="M26 46C26 46 29 49 32 49C35 49 38 46 38 46" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="42" r="2.5" fill="#78350F" />
        </svg>
      </div>

      <div>
        <h1 className="text-[26px] font-black text-text-primary mb-2 leading-tight">
          Aramıza Hoş Geldin, {petName}! 🎉
        </h1>
        
        {isAlreadyActive ? (
          <p className="text-[14px] text-success font-bold mt-2 flex items-center justify-center gap-1.5 bg-success-soft/30 py-2 px-4 rounded-xl border border-success/15 animate-scaleIn">
            <span>✓</span> Hatırlatıcı bildirimleriniz aktif edildi!
          </p>
        ) : (
          <p className="text-[14px] text-text-secondary leading-relaxed px-2">
            {petName}&apos;in aşı, parazit kontrolü ve bakım zamanlarını kaçırmamak için akıllı hatırlatıcı bildirimlerini etkinleştirin.
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20 w-full animate-scaleIn">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="flex flex-col w-full gap-3 mt-4 relative">
        {isAlreadyActive ? (
          <button
            id="btn-goto-profile"
            onClick={() => router.push(`/owner/pets/${petId}`)}
            className="btn-primary w-full py-4 text-[15px] font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.03] transition-all rounded-[14px]"
          >
            Profile Git →
          </button>
        ) : (
          <>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="btn-primary w-full py-4 text-[15px] font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.03] transition-all rounded-[14px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>
                  Etkinleştiriliyor...
                </span>
              ) : (
                'Bildirimleri Etkinleştir (Önerilen)'
              )}
            </button>
            
            <button
              onClick={() => router.push(`/owner/pets/${petId}`)}
              disabled={isLoading}
              className="text-[13px] font-bold text-text-secondary hover:text-text-primary py-2 hover:underline transition-colors"
            >
              Şimdi Değil, Profile Git
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PetAddSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
