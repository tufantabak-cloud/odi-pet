'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useWebPush } from '@/hooks/useWebPush'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  Camera,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ShieldCheck,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'

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

  const petId = params.get('id') ?? ''
  const avatarParam = params.get('avatar') ?? ''
  const petName = pet?.name || params.get('name') || 'Dostunuz'
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
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setErrorMsg(
          'Tarayıcınızda bildirim izinleri engellenmiş. Lütfen adres çubuğundaki kilit simgesinden bildirim iznini açın.'
        )
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
  const isDone =
    pet?.health_history_status === 'completed' ||
    pet?.health_history_status === 'skipped' ||
    op?.vaccine_plan === true
  const showHealthHistoryCard = ageInMonths >= 6 && !isDone
  const showVaccinePlanCard = !!pet && !showHealthHistoryCard && op?.vaccine_plan !== true

  if (!petId) return null

  return (
    <div className="card-base p-6 sm:p-10 flex flex-col items-center gap-6 animate-fadeInUp mt-6 sm:mt-8 max-w-md mx-auto rounded-3xl border border-primary/15 text-center relative shadow-sm">
      {/* 6 Adımlı Wizard Göstergesi */}
      <div className="w-full flex flex-col gap-2 pb-3 border-b border-border-main">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
            {activeStep === 5 ? 'Adım 5 / 6 • Bildirim Onayı' : 'Adım 6 / 6 • Sağlık Takvimi'}
          </span>
          <span className="text-2xs font-extrabold text-text-tertiary bg-surface-2 px-2.5 py-0.5 rounded-full border border-border/40">
            {activeStep === 5 ? '%83 Tamamlandı' : '%100 Tamamlandı'}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-border-main/50">
          <div
            className="bg-gradient-to-r from-primary to-indigo-600 h-full rounded-full transition-all duration-500 shadow-2xs"
            style={{ width: activeStep === 5 ? '83.3%' : '100%' }}
          />
        </div>
      </div>

      {/* Pet Header Profile */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group hover:scale-105 transition-transform duration-300">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white shadow-md bg-surface-1 flex items-center justify-center">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={petName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center text-text-secondary">
                <Camera size={28} className="w-7 h-7 text-text-secondary" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary mb-1 leading-tight flex items-center justify-center gap-2">
            <CheckCircle2 size={24} className="w-6 h-6 text-success shrink-0" aria-hidden="true" />
            <span>{activeStep === 5 ? `Aramıza Hoş Geldin, ${petName}!` : `${petName} İçin Son Adım!`}</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary px-2">
            {activeStep === 5
              ? `${petName}'in aşı ve bakım zamanlarını kaçırmamanız için bildirim izni önerilir.`
              : `${petName}'in geçmiş sağlık verilerini ve aşı takvimini tamamlayalım.`}
          </p>
        </div>
      </div>

      {/* ADIM 5: BİLDİRİM ONAYI */}
      {activeStep === 5 && (
        <div className="w-full flex flex-col gap-4 animate-fadeIn text-left">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-extrabold text-xs sm:text-sm">
              <Bell size={18} className="w-4.5 h-4.5 text-amber-800 shrink-0" aria-hidden="true" />
              <span>5. Adım: Akıllı Bildirim İzni</span>
            </div>

            <p className="text-xs sm:text-sm text-text-primary font-medium leading-relaxed mb-3">
              Odi&apos;nin temel amacı <strong className="text-primary">{petName}</strong>&apos;in aşı tarihlerini, parazit uygulamalarını ve veteriner kontrollerini zamanı geldiğinde size anlık hatırlatmaktır.
            </p>

            <div className="p-3 bg-white/90 rounded-xl border border-amber-500/20 text-xs text-amber-900 font-semibold space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                <span>Bildirimlere izin vererek aşı ve kontrol zamanlarını kaçırmazsınız.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>İstediğiniz zaman profil ayarlarından bildirimleri yönetebilirsiniz.</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 w-full animate-scaleIn flex items-center gap-2">
              <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSubscribed ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs sm:text-sm text-success font-bold p-3 bg-success-soft/30 rounded-2xl border border-success/20 text-center animate-scaleIn flex items-center justify-center gap-1.5">
                <Check size={16} className="w-4 h-4 text-success" aria-hidden="true" />
                <span>Bildirimler başarıyla etkinleştirildi!</span>
              </p>
              <button
                type="button"
                onClick={() => setActiveStep(6)}
                className="w-full btn-primary py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2 rounded-2xl cursor-pointer"
              >
                <span>Sonraki Adım: Sağlık Takvimi (6/6)</span>
                <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading || isInitializing}
                className="w-full btn-primary py-3.5 text-sm sm:text-base font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all rounded-2xl cursor-pointer"
              >
                {isLoading || isInitializing ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 size={18} className="w-4.5 h-4.5 animate-spin" aria-hidden="true" />
                    <span>{isInitializing ? 'Kontrol ediliyor...' : 'Etkinleştiriliyor...'}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Bell size={16} className="w-4 h-4 text-white" aria-hidden="true" />
                    <span>
                      {permission === 'granted'
                        ? 'Cihaz Kaydını Tamamla ve Devam Et'
                        : 'Bildirimleri Etkinleştir ve Devam Et'}
                    </span>
                    <ChevronRight size={16} className="w-4 h-4 text-white" aria-hidden="true" />
                  </span>
                )}
              </button>

              {!showSkipWarning ? (
                <button
                  type="button"
                  onClick={() => setShowSkipWarning(true)}
                  disabled={isLoading || isInitializing}
                  className="text-xs font-bold text-text-secondary hover:text-text-primary py-2 hover:underline transition-colors text-center cursor-pointer"
                >
                  Bildirim Açmadan 6. Adıma Geç
                </button>
              ) : (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2 animate-fadeIn">
                  <p className="text-xs text-rose-700 font-bold flex items-center justify-center gap-1.5">
                    <AlertTriangle size={14} className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
                    <span>Bildirimleri açmazsanız aşı zamanlarını kaçırabilirsiniz. Yine de devam etmek istiyor musunuz?</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSubscribe}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-[0.97]"
                    >
                      Vazgeç, Bildirim Aç
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipToStep6}
                      className="px-3.5 py-2 bg-surface-2 text-text-secondary hover:text-text-primary text-xs font-bold rounded-xl border border-border cursor-pointer active:scale-[0.97]"
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
            <div className="w-full bg-surface-1 border border-border-main rounded-2xl p-5 text-left shadow-2xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Clock size={16} className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-extrabold text-text-primary">
                    6. Adım: Sağlık Geçmişini Ekle
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Yaklaşık 2 dakika sürer. <strong className="text-text-primary">Sadece bir kez yapılır</strong> — bundan sonrası otomatik takip edilir.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-border-main text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <Check size={14} className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  <span>Geçmiş aşıları sisteme tanıtırsınız</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  <span>Gelecek hatırlatıcılar doğru tarihlere planlanır</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  <span>Sistem aşı döngülerini otomatik takip eder</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${petId}&mode=log`)}
                className="w-full btn-primary py-3.5 text-sm font-bold cursor-pointer transition-all shadow-md rounded-2xl flex items-center justify-center gap-2"
              >
                <span>Şimdi Ekle (2 dk)</span>
                <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {showVaccinePlanCard && (
            <div className="w-full bg-surface-1 border border-border-main rounded-2xl p-5 text-left shadow-2xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <ShieldCheck size={16} className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-extrabold text-text-primary">
                    6. Adım: Aşı Takibini Başlat
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {petName} için aşı planı oluşturun; zamanı gelince biz hatırlatalım.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${petId}`)}
                className="w-full btn-primary py-3.5 text-sm font-bold cursor-pointer transition-all shadow-md rounded-2xl flex items-center justify-center gap-2"
              >
                <span>Aşı Planı Oluştur</span>
                <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {!showHealthHistoryCard && !showVaccinePlanCard && (
            <div className="p-4 bg-success-soft/30 rounded-2xl border border-success/20 text-center">
              <p className="text-xs text-success font-bold flex items-center justify-center gap-1.5">
                <Check size={14} className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                <span>Bütün adımlar başarıyla tamamlandı!</span>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              id="btn-goto-profile"
              type="button"
              onClick={handleFinalProfileGo}
              className="w-full bg-surface-2 text-text-primary border border-border hover:bg-surface-3 py-3.5 text-sm font-bold rounded-2xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Tamamla ve Profile Git</span>
              <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
            </button>

            <button
              type="button"
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
