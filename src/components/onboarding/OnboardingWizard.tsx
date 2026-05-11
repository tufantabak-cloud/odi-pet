'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
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
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeInUp">
        
        <div className="px-8 py-10 text-center">
          <div className="text-[64px] mb-4">👋</div>
          <h2 className="text-[24px] font-black text-text-primary">ODI'ye Hoş Geldin!</h2>
          <p className="text-text-secondary mt-2 leading-relaxed">
            Evcil hayvanının sağlığını ve bakımını tek yerden yönet.
          </p>
          <p className="text-[13px] text-text-secondary mt-1">
            Kurulum sadece birkaç dakika sürer. Hadi başlayalım.
          </p>

          <div className="flex flex-col gap-3 mt-8">
            <button 
              onClick={handleStart} 
              disabled={saving}
              className="btn-primary py-3.5 text-[15px] font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {saving ? 'Yönlendiriliyor...' : 'Hadi Başlayalım →'}
            </button>
            <button
              onClick={handleDemo}
              disabled={saving}
              className="btn-secondary py-3 text-[14px] font-semibold text-text-secondary disabled:opacity-50"
            >
              🐾 Demo ile Keşfet
            </button>
          </div>
        </div>
        
      </div>
    </div>
  )
}
