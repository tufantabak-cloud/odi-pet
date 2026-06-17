'use client'

import dynamic from 'next/dynamic'

const OnboardingGate = dynamic(() => import('@/components/onboarding/OnboardingGate'), { ssr: false })
const PushNotificationPrompt = dynamic(() => import('@/components/notifications/PushNotificationPrompt'), { ssr: false })

export default function DashboardOnboardingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <PushNotificationPrompt />
      {children}
    </OnboardingGate>
  )
}
