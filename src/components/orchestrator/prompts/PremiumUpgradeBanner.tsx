'use client'

import React from 'react'
import SmartCardBanner from '@/components/profiling/SmartCardBanner'

interface PremiumUpgradeBannerProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
}

export default function PremiumUpgradeBanner({
  open,
  onClose,
  onSubmit,
  uiConfig,
}: PremiumUpgradeBannerProps) {
  if (!open) return null

  const handleClick = async () => {
    await onSubmit({ action: 'navigate_to_premium' })
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4 animate-in slide-in-from-bottom-8 duration-500">
      <SmartCardBanner
        title={(uiConfig?.title as string) || 'Odi.Pet Premium'}
        message={(uiConfig?.message as string) || 'AI destekli sağlık önerileri, öncelikli destek ve daha fazlası.'}
        ctaText={(uiConfig?.ctaText as string) || 'Premium\'a Geç'}
        icon="✨"
        gradient="from-amber-50 to-orange-50"
        iconBg="bg-amber-100 text-amber-700"
        onClick={handleClick}
        onDismiss={onClose}
      />
    </div>
  )
}
