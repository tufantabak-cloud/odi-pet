'use client'

import dynamic from 'next/dynamic'

const PushNotificationPrompt = dynamic(() => import('@/components/notifications/PushNotificationPrompt'), { ssr: false })

export default function DashboardOnboardingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PushNotificationPrompt />
      {children}
    </>
  )
}
