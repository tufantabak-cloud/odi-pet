'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'
import SpotlightTour, { TourStep } from './SpotlightTour'

const Semi3DIcon = ({ svgPath, className }: { svgPath: React.ReactNode, className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <defs>
      <filter id="semi-3d-shadow-onboarding" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="currentColor" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#semi-3d-shadow-onboarding)">
      {svgPath}
    </g>
  </svg>
);

const HouseWithPaw = (
  <>
    <path d="M3 9L12 2L21 9V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="url(#grad-home)" fillOpacity="0.8"/>
    <path d="M12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16Z" fill="white"/>
    <path d="M9.5 13C10.0523 13 10.5 12.5523 10.5 12C10.5 11.4477 10.0523 11 9.5 11C8.9477 11 8.5 11.4477 8.5 12C8.5 12.5523 8.9477 13 9.5 13Z" fill="white"/>
    <path d="M14.5 13C15.0523 13 15.5 12.5523 15.5 12C15.5 11.4477 15.0523 11 14.5 11C13.9477 11 13.5 11.4477 13.5 12C13.5 12.5523 13.9477 13 14.5 13Z" fill="white"/>
    <path d="M12 19C13.6569 19 15 17.6569 15 16H9C9 17.6569 10.3431 19 12 19Z" fill="white"/>
    <defs>
      <linearGradient id="grad-home" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
  </>
);

const PlusWithPaw = (
  <>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="url(#grad-plus)" fillOpacity="0.8"/>
    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="grad-plus" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f43f5e" />
        <stop offset="1" stopColor="#fb923c" />
      </linearGradient>
    </defs>
  </>
);

const PetTagIcon = (
  <>
    <path d="M12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2Z" fill="url(#grad-tag)" />
    <path d="M12 6L18 10V18C18 19.1046 17.1046 20 16 20H8C6.89543 20 6 19.1046 6 18V10L12 6Z" fill="url(#grad-tag)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="12" cy="14" r="3" fill="white" fillOpacity="0.9"/>
    <defs>
      <linearGradient id="grad-tag" x1="6" y1="2" x2="18" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0ea5e9" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  </>
);

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'nav-action-btn',
    title: 'İlk Adım',
    message: 'Yeni bir giriş yapmak için navigasyondaki + butonuna basınız.',
    icon: <Semi3DIcon svgPath={PlusWithPaw} className="w-10 h-10 text-rose-500" />,
    position: 'top'
  },
  {
    targetId: 'action-btn-plan-yap',
    title: 'Rutin Planla',
    message: 'Örneğin; dostunuzun ilk kilosunu kaydederek başlayabilirsiniz. "Plan Yap" diyerek ilerleyin.',
    icon: <Semi3DIcon svgPath={HouseWithPaw} className="w-10 h-10 text-indigo-500" />,
    position: 'top'
  }
]

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleTourComplete = useCallback(async () => {
    setSaving(true)
    await trackEvent('onboarding_completed')
    
    // Mark wizard as completed in backend DB
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizard_completed: true, wizard_step: 3 }),
    })
    
    onComplete()
    // Redirect user to add pet form as Katman 1 (Onboarding) primary action
    router.replace('/owner/pets/add')
  }, [onComplete, router])

  return (
    <SpotlightTour 
      steps={TOUR_STEPS} 
      onComplete={handleTourComplete} 
    />
  )
}
