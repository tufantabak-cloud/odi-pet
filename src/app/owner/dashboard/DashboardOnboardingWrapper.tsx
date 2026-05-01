'use client'

import dynamic from 'next/dynamic'

// Lazy load to avoid hydration mismatch — only runs on client
const OnboardingGate = dynamic(() => import('@/components/onboarding/OnboardingGate'), { ssr: false })

export default function DashboardOnboardingWrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingGate>{children}</OnboardingGate>
}
