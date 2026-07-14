'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useWebPush } from '@/hooks/useWebPush'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { isSubscribed, isLoading, subscribe } = useWebPush()
  const [errorMsg, setErrorMsg] = useState('')
  const [justSubscribed, setJustSubscribed] = useState(false)
  
  const [pet, setPet] = useState<any>(null)
  const supabase = createBrowserSupabaseClient()

  const petId   = params.get('id')   ?? ''
  const petName = params.get('name') ?? 'Dostunuz'

  useEffect(() => {
    if (!petId) {
      router.replace('/owner/pets/add')
      return
    }
    
    const fetchPet = async () => {
      const { data } = await supabase
        .from('pets')
        .select('birth_date, health_history_status, species, onboarding_progress')
        .eq('id', petId)
        .single()
      if (data) setPet(data)
    }
    fetchPet()
  }, [petId, router, supabase])

  const handleSubscribe = async () => {
    setErrorMsg('')
    const result = await subscribe()
    if (result.success) {
      setJustSubscribed(true)
      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/owner/pets/${petId}`)
      }, 1500)
    } else if (result.error) {
      setErrorMsg(result.error)
    } else {
      if (Notification.permission === 'denied') {
        setErrorMsg('Tarayıcınızda bildirim izinleri engellenmiş. Lütfen tarayıcı ayarlarından izni açın.')
      } else {
        setErrorMsg('Bildirimler etkinleştirilemedi. Lütfen tekrar deneyin.')
      }
    }
  }

  const isAlreadyActive = isSubscribed || justSubscribed

  const handleSkip = async () => {
    if (showHealthHistoryCard) {
      // Eğer sağlık geçmişi kartı görünüyor ve kullanıcı atlıyorsa, skipped olarak işaretle
      await supabase.from('pets').update({ health_history_status: 'skipped' }).eq('id', petId)
    }
    router.push(`/owner/pets/${petId}`)
  }

  let ageInMonths = 0
  if (pet?.birth_date) {
    const born = new Date(pet.birth_date)
    const now = new Date()
    ageInMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  }
  
  const op = pet?.onboarding_progress as any
  const isDone = pet?.health_history_status === 'completed' || pet?.health_history_status === 'skipped' || op?.vaccine_plan === true
  const showHealthHistoryCard = ageInMonths >= 6 && !isDone
  // Yavru petlerde (sağlık geçmişi kartı yokken) aşı planı oluşturmaya yönlendir
  const showVaccinePlanCard = !!pet && !showHealthHistoryCard && op?.vaccine_plan !== true

  if (!petId) return null

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

      {showHealthHistoryCard && (
        <div className="w-full bg-surface-1 border border-border rounded-[10px] p-4 mb-2 text-left animate-scaleIn">
          <div className="flex items-start gap-2.5 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div>
              <p className="text-[14px] font-bold text-text-primary">Sağlık geçmişini ekle</p>
              <p className="text-[12px] text-text-secondary mt-1">
                Yaklaşık 2 dakika sürer. <strong className="text-text-primary">Sadece bir kez yapılır</strong> — bundan sonrası otomatik.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2 text-[12px] text-text-secondary">
              <span className="text-success text-[14px]">✓</span> Geçmiş aşıları sisteme tanıtırsınız
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-secondary">
              <span className="text-success text-[14px]">✓</span> Gelecek hatırlatıcılar doğru tarihlere planlanır
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-secondary">
              <span className="text-success text-[14px]">✓</span> Bir daha sormayız — sistem otomatik takip eder
            </div>
          </div>
          
          <button
            onClick={() => router.push(`/owner/pets/${petId}/vaccines`)}
            className="w-full bg-primary text-white border-none rounded-xl py-3 text-[14px] font-bold cursor-pointer hover:bg-primary-hover transition-colors shadow-md"
          >
            Şimdi ekle (2 dk) →
          </button>
        </div>
      )}

      {showVaccinePlanCard && (
        <div className="w-full bg-surface-1 border border-border rounded-[10px] p-4 mb-2 text-left animate-scaleIn">
          <div className="flex items-start gap-2.5 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mt-0.5 shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
            <div>
              <p className="text-[14px] font-bold text-text-primary">Aşı takibini başlat</p>
              <p className="text-[12px] text-text-secondary mt-1">
                {petName} için aşı planı oluşturun; zamanı gelince <strong className="text-text-primary">biz hatırlatalım</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${petId}`)}
            className="w-full bg-primary text-white border-none rounded-xl py-3 text-[14px] font-bold cursor-pointer hover:bg-primary-hover transition-colors shadow-md"
          >
            Aşı planı oluştur →
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20 w-full animate-scaleIn">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="flex flex-col w-full gap-3 mt-2 relative">
        {isAlreadyActive ? (
          <button
            id="btn-goto-profile"
            onClick={() => router.push(`/owner/pets/${petId}`)}
            className="btn-secondary w-full py-3.5 text-[14px] font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-surface-1 transition-all rounded-[12px]"
          >
            Profile Git →
          </button>
        ) : (
          <>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="btn-secondary border-primary/20 bg-primary/5 text-primary w-full py-3.5 text-[14px] font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-all rounded-[12px]"
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
              onClick={handleSkip}
              disabled={isLoading}
              className="text-[13px] font-bold text-text-secondary hover:text-text-primary py-2 hover:underline transition-colors mt-2"
            >
              Daha Sonra Profile Git
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
