'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useWebPush } from '@/hooks/useWebPush'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const {
    permission,
    isSubscribed,
    isInitializing,
    isLoading,
    error: pushError,
    subscribe,
  } = useWebPush()
  const [errorMsg, setErrorMsg] = useState('')
  // Adım 5: Bildirim Onayı, Adım 6: Sağlık Geçmişi
  const [activeStep, setActiveStep] = useState<5 | 6>(5)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  
  const [pet, setPet] = useState<any>(null)
  const supabase = createBrowserSupabaseClient()

  const petId       = params.get('id') ?? ''
  const avatarParam = params.get('avatar') ?? ''
  const petName     = pet?.name || params.get('name') || 'Dostunuz'
  const displayPhoto = pet?.avatar_url || avatarParam

  useEffect(() => {
    if (!petId) {
      router.replace('/owner/pets/add')
      return
    }
    
    const fetchPet = async () => {
      const { data } = await supabase
        .from('pets')
        .select('name, birth_date, health_history_status, species, onboarding_progress, avatar_url')
        .eq('id', petId)
        .single()
      if (data) setPet(data)
    }
    fetchPet()
  }, [petId, router, supabase])

  useEffect(() => {
    if (isInitializing) return

    if (isSubscribed) {
      setErrorMsg('')
      setActiveStep(6)
      return
    }

    if (pushError) setErrorMsg(pushError)
  }, [isInitializing, isSubscribed, pushError])

  const handleSubscribe = async () => {
    setErrorMsg('')
    const result = await subscribe()
    if (result.success) {
      setActiveStep(6)
    } else if (result.error) {
      setErrorMsg(result.error)
    } else {
      if (Notification.permission === 'denied') {
        setErrorMsg('Tarayıcınızda bildirim izinleri engellenmiş. Lütfen adres çubuğundaki kilit simgesinden bildirim iznini açın.')
      } else {
        setErrorMsg('Bildirimler etkinleştirilemedi. Lütfen tekrar deneyin.')
      }
    }
  }

  const handleSkipToStep6 = () => {
    setActiveStep(6)
  }

  const handleFinalProfileGo = async () => {
    if (showHealthHistoryCard) {
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
  const showVaccinePlanCard = !!pet && !showHealthHistoryCard && op?.vaccine_plan !== true

  if (!petId) return null

  return (
    <div className="card-base p-6 sm:p-10 flex flex-col items-center gap-6 animate-fadeInUp mt-6 sm:mt-10 max-w-md mx-auto border border-primary/10 text-center relative">
      
      {/* 6 Adımlı Wizard Göstergesi */}
      <div className="w-full flex flex-col gap-2 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
            {activeStep === 5 ? 'Adım 5 / 6 • Bildirim Onayı' : 'Adım 6 / 6 • Sağlık Geçmişi'}
          </span>
          <span className="text-[11px] font-bold text-text-tertiary">
            {activeStep === 5 ? '%83 Tamamlandı' : '%100 Tamamlandı'}
          </span>
        </div>
        <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-border/40">
          <div 
            className="bg-gradient-to-r from-primary to-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: activeStep === 5 ? '83.3%' : '100%' }}
          />
        </div>
      </div>

      {/* Pet Header Profile */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group hover:scale-105 transition-transform duration-300">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white shadow-lg bg-surface-1 flex items-center justify-center">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={petName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center text-text-secondary text-3xl">
                📷
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary mb-1 leading-tight">
            {activeStep === 5 ? `Aramıza Hoş Geldin, ${petName}! 🎉` : `${petName} İçin Son Adım! 🐾`}
          </h1>
          <p className="text-[13px] text-text-secondary px-2">
            {activeStep === 5
              ? `${petName}'in aşı ve bakım zamanlarını kaçırmamanız için bildirim izni zorunludur.`
              : `${petName}'in geçmiş sağlık verilerini ve aşı takvimini oluşturalım.`}
          </p>
        </div>
      </div>

      {/* ADIM 5: BİLDİRİM ONAYI */}
      {activeStep === 5 && (
        <div className="w-full flex flex-col gap-4 animate-fadeIn text-left">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4.5">
            <div className="flex items-center gap-2 mb-2 text-amber-700 font-extrabold text-sm">
              <span className="text-lg">🔔</span>
              <span>5. Adım: Akıllı Bildirim İzni</span>
            </div>
            
            <p className="text-[13px] text-text-primary font-medium leading-relaxed mb-3">
              Odi.Pet&apos;in temel amacı <strong className="text-primary">{petName}</strong>&apos;in aşı tarihlerini, parazit damlalarını ve veteriner kontrollerini zamanı geldiğinde size anlık hatırlatmaktır.
            </p>

            <div className="p-3 bg-white/80 rounded-xl border border-amber-500/20 text-xs text-amber-900 font-semibold space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-bold">⚠️</span>
                <span>Bildirimlere izin vermezseniz zamanında uyarı alamazsınız.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-bold">⚠️</span>
                <span>Uygulama temel amacına uygun çalışamaz.</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20 w-full animate-scaleIn">
              ⚠️ {errorMsg}
            </div>
          )}

          {isSubscribed ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-success font-bold p-3 bg-success-soft/30 rounded-xl border border-success/15 text-center animate-scaleIn">
                ✓ Bildirimler başarıyla etkinleştirildi!
              </p>
              <button
                onClick={() => setActiveStep(6)}
                className="w-full bg-primary text-white py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2 hover:bg-primary-hover transition-all rounded-xl cursor-pointer"
              >
                Sonraki Adım: Sağlık Geçmişi (6/6) →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={handleSubscribe}
                disabled={isLoading || isInitializing}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 text-white py-4 text-base font-black shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl cursor-pointer"
              >
                {isLoading || isInitializing ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>
                    {isInitializing ? 'Bildirim durumu kontrol ediliyor...' : 'Etkinleştiriliyor...'}
                  </span>
                ) : (
                  <>
                    <span>
                      🔔 {permission === 'granted'
                        ? 'Cihaz Kaydını Tamamla ve Devam Et'
                        : 'Bildirimleri Etkinleştir ve Devam Et'} →
                    </span>
                  </>
                )}
              </button>

              {!showSkipWarning ? (
                <button
                  onClick={() => setShowSkipWarning(true)}
                  disabled={isLoading || isInitializing}
                  className="text-[13px] font-bold text-text-secondary hover:text-text-primary py-2 hover:underline transition-colors text-center cursor-pointer"
                >
                  Bildirim Açmadan 6. Adıma Geç
                </button>
              ) : (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-2 animate-fadeIn">
                  <p className="text-xs text-red-600 font-bold">
                    ⚠️ Bildirimleri açmazsanız aşı ve bakım zamanlarını kaçırabilirsiniz. Yine de devam etmek istiyor musunuz?
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={handleSubscribe}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                    >
                      Vazgeç, Bildirim Aç
                    </button>
                    <button
                      onClick={handleSkipToStep6}
                      className="px-3.5 py-2 bg-surface-2 text-text-secondary hover:text-text-primary text-xs font-bold rounded-lg border border-border cursor-pointer"
                    >
                      Yine de 6. Adıma Geç
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ADIM 6: SAĞLIK GEÇMİŞİNİ EKLE */}
      {activeStep === 6 && (
        <div className="w-full flex flex-col gap-4 animate-fadeIn text-left">
          
          {showHealthHistoryCard && (
            <div className="w-full bg-surface-1 border border-border rounded-input p-5 text-left shadow-xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ⏱️
                </div>
                <div>
                  <p className="text-base font-bold text-text-primary">6. Adım: Sağlık Geçmişini Ekle</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Yaklaşık 2 dakika sürer. <strong className="text-text-primary">Sadece bir kez yapılır</strong> — bundan sonrası otomatik.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-border text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-success text-sm">✓</span> Geçmiş aşıları sisteme tanıtırsınız
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-success text-sm">✓</span> Gelecek hatırlatıcılar doğru tarihlere planlanır
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-success text-sm">✓</span> Sistem otomatik takip eder
                </div>
              </div>
              
              <button
                onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${petId}&mode=log`)}
                className="w-full bg-primary text-white border-none rounded-xl py-3.5 text-sm font-bold cursor-pointer hover:bg-primary-hover transition-all shadow-md"
              >
                Şimdi Ekle (2 dk) →
              </button>
            </div>
          )}

          {showVaccinePlanCard && (
            <div className="w-full bg-surface-1 border border-border rounded-input p-5 text-left shadow-xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  🛡️
                </div>
                <div>
                  <p className="text-base font-bold text-text-primary">6. Adım: Aşı Takibini Başlat</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {petName} için aşı planı oluşturun; zamanı gelince biz hatırlatalım.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${petId}`)}
                className="w-full bg-primary text-white border-none rounded-xl py-3.5 text-sm font-bold cursor-pointer hover:bg-primary-hover transition-all shadow-md"
              >
                Aşı Planı Oluştur →
              </button>
            </div>
          )}

          {!showHealthHistoryCard && !showVaccinePlanCard && (
            <div className="p-4 bg-success-soft/30 rounded-xl border border-success/20 text-center">
              <p className="text-xs text-success font-bold">✓ Bütün adımlar başarıyla tamamlandı!</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              id="btn-goto-profile"
              onClick={handleFinalProfileGo}
              className="w-full bg-surface-2 text-text-primary border border-border hover:bg-surface-3 py-3.5 text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              Tamamla ve Profile Git →
            </button>
            
            <button
              onClick={() => setActiveStep(5)}
              className="text-xs text-text-secondary hover:text-text-primary underline text-center cursor-pointer mt-1"
            >
              ← Önceki Adıma Dön (5. Adım: Bildirim Onayı)
            </button>
          </div>
        </div>
      )}

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

