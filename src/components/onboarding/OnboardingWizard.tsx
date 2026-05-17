'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Ne yapıyor?',
    heading: 'Her Şey Tek Yerde',
    description: 'Aşılar, kilo takibi, beslenme düzeni ve daha fazlası. Odi.Pet ile can dostunun tüm ihtiyaçları her an elinin altında.',
    icon: '✨'
  },
  {
    id: 2,
    title: 'Pet ekle',
    heading: 'Saniyeler İçinde Başla',
    description: 'Evcil hayvanının profilini oluşturmak çok kolay. Temel bilgileri girerek kişisel asistanını hemen kullanmaya başlayabilirsin.',
    icon: '🐾'
  },
  {
    id: 3,
    title: 'İlk kurulum',
    heading: 'Kurulumu Tamamla',
    description: 'İlk evcil hayvanını ekleyerek Odi.Pet dünyasına adım at. Her şey hazır, hazırsan başlayalım!',
    icon: '🚀'
  }
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

  const currentStep = WIZARD_STEPS[step - 1]

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
          <div className="text-center min-h-[220px] flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center transition-all duration-500 transform hover:scale-105">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm border border-primary/10 z-10">
                {currentStep.icon}
              </div>
            </div>
            <h2 className="text-[26px] font-black text-text-primary tracking-tight mb-3">
              {currentStep.heading}
            </h2>
            <p className="text-text-secondary leading-relaxed text-[15px] px-2">
              {currentStep.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-8">
            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)} 
                className="btn-primary py-4 text-[15px] font-bold shadow-lg shadow-primary/20 w-full"
              >
                Devam Et →
              </button>
            ) : (
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
            )}

            {step === 1 && (
              <button
                onClick={handleDemo}
                disabled={saving}
                className="btn-secondary py-3 text-[14px] font-semibold text-text-secondary disabled:opacity-50 w-full hover:bg-gray-50 transition-colors"
              >
                🐾 Demo ile Keşfet
              </button>
            )}
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep(3)}
                disabled={saving}
                className="btn-secondary py-3 text-[14px] font-semibold text-text-secondary disabled:opacity-50 w-full hover:bg-gray-50 transition-colors"
              >
                Atla
              </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
