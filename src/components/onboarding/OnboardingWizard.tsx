'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'
import { VaccineIcon, VetIcon, BowlIcon } from '@/components/icons/PetIcons'

const WIZARD_STEPS = [
  { id: 1, title: 'Ne yapıyor?' },
  { id: 2, title: 'Can Dostu Ekle' },
  { id: 3, title: 'İlk kurulum' }
]

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleStart() {
    setSaving(true)
    await trackEvent('onboarding_started')
    
    // Mark wizard as completed since we delegate pet creation to the main flow
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizard_completed: true, wizard_step: 3 }),
    })
    
    onComplete()
    router.push('/owner/pets/add')
  }

  async function handleDemo() {
    setSaving(true)
    await trackEvent('demo_enabled')
    await fetch('/api/onboarding', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ action: 'enable_demo' }) 
    })
    onComplete()
    router.refresh()
  }


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-y-auto max-h-[90dvh] animate-fadeInUp">
        
        <div className="px-8 pt-10 pb-8">
          
          {/* Stepper Header */}
          <div className="flex items-start justify-between mb-10 relative px-2">
            <div className="absolute left-10 right-10 top-4 -translate-y-1/2 h-[2px] bg-gray-100 -z-10" />
            <div 
              className="absolute left-10 top-4 -translate-y-1/2 h-[2px] bg-primary -z-10 transition-all duration-500 ease-in-out" 
              style={{ width: `calc(${(step - 1) * 50}% - ${step === 1 ? '0px' : '20px'})` }}
            />
            
            {WIZARD_STEPS.map((s) => {
              const isActive = step >= s.id;
              const isCurrent = step === s.id;
              const isCompleted = step > s.id;

              return (
                <div key={s.id} className="flex flex-col items-center gap-2 w-20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    isActive ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : 'scale-100'}`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span className={`text-[11px] font-bold text-center leading-tight transition-colors duration-300 ${
                    isCurrent ? 'text-text-primary' : isActive ? 'text-primary' : 'text-gray-400'
                  }`}>
                    {s.title}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Content */}
          <div className="min-h-[280px] flex flex-col justify-center">
            {step === 1 && (
              <div className="flex flex-col animate-fadeIn">
                <h2 className="text-[24px] font-black text-text-primary tracking-tight mb-6 text-center">
                  Can dostun için akıllı asistan
                </h2>
                <div className="flex flex-col gap-3 mb-2">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                      <VaccineIcon width={24} height={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-text-primary text-[15px]">Aşı & Parazit</h3>
                      <p className="text-text-secondary text-[13px] leading-tight mt-0.5">Aşı süreçlerini kolayca takip et</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                      <VetIcon width={24} height={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-text-primary text-[15px]">AI Vet</h3>
                      <p className="text-text-secondary text-[13px] leading-tight mt-0.5">7/24 soru sor anında yanıt al</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                      <BowlIcon width={24} height={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-text-primary text-[15px]">Beslenme</h3>
                      <p className="text-text-secondary text-[13px] leading-tight mt-0.5">Maması bitmeden seni biz hatırlatalım</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col animate-fadeIn">
                <h2 className="text-[24px] font-black text-text-primary tracking-tight mb-6 text-center">
                  30 saniyede kurulum
                </h2>
                
                <div className="flex flex-col gap-4 relative py-2">
                  {/* Mockup 1 */}
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 transform -rotate-2 relative z-10 mx-2 transition-transform hover:rotate-0">
                    <div className="flex items-center gap-2 mb-3">
                      <VaccineIcon width={20} height={20} />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sonraki Aşı</span>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-bold text-text-primary">Kuduz</span>
                      <span className="text-sm font-semibold text-primary">3 gün sonra</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[80%] rounded-full"></div>
                    </div>
                  </div>

                  {/* Mockup 2 */}
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 transform rotate-1 relative z-20 mx-2 -mt-4 transition-transform hover:rotate-0">
                    <div className="flex items-center gap-2 mb-3">
                      <VetIcon width={20} height={20} />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Vet</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="bg-gray-50 rounded-lg p-2.5 rounded-tl-sm text-sm text-text-secondary w-3/4">
                        "3 gündür yemiyor"
                      </div>
                      <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 rounded-tr-sm text-sm text-text-primary font-medium w-[85%] self-end ml-auto">
                        Yanıt: Olası neden…
                      </div>
                    </div>
                  </div>
                  
                  {/* Decoration line */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent -z-10 rounded-full blur-2xl"></div>
                </div>

                <p className="text-center text-text-secondary text-[14px] mt-6 font-medium px-4">
                  Aşı tarihlerini artık aklında tutmak zorunda değilsin ✨
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center animate-fadeIn text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                  🎉
                </div>
                <h2 className="text-[24px] font-black text-text-primary tracking-tight mb-8">
                  Hazır — şimdi CAN Dostun kim?
                </h2>
                
                <div className="flex flex-col gap-4 w-full px-4 text-left">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="font-semibold text-[15px] text-text-primary">Aşılarını düzenli takip edebileceksin</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="font-semibold text-[15px] text-text-primary">AI Vet'e bağlanacaksın</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="font-semibold text-[15px] text-text-primary">Hatırlatmalar aktif olacak</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-8">
            {step < 3 ? (
              <>
                <button 
                  onClick={() => setStep(step + 1)} 
                  className="btn-primary py-4 text-[15px] font-bold shadow-lg shadow-primary/20 w-full"
                >
                  Devam Et →
                </button>
                <button
                  onClick={handleDemo}
                  disabled={saving}
                  className="mt-1 py-3 text-[14px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 rounded-[14px] disabled:opacity-50 w-full transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-[16px]">🐾</span> Demo ile Keşfet
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleStart} 
                  disabled={saving}
                  className="btn-primary py-4 text-[15px] font-bold shadow-lg shadow-primary/20 disabled:opacity-50 w-full flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Yönlendiriliyor...
                    </>
                  ) : 'Hadi Başlayalım →'}
                </button>
                <button
                  onClick={handleDemo}
                  disabled={saving}
                  className="mt-1 py-3 text-[14px] font-bold text-text-secondary hover:text-text-primary disabled:opacity-50 w-full transition-colors"
                >
                  Veya Demo Moduna Geç
                </button>
              </>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
