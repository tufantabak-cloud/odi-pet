'use client'

import React from 'react'
import SmartCardBanner from '@/components/profiling/SmartCardBanner'

interface SmartVaccineReminderProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
}

export default function SmartVaccineReminder({
  open,
  onClose,
  onSubmit,
  uiConfig,
}: SmartVaccineReminderProps) {
  if (!open) return null

  const handleClick = async () => {
    await onSubmit({ action: 'navigate_to_vaccines' })
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4 animate-in slide-in-from-bottom-8 duration-500">
      <SmartCardBanner
        title={(uiConfig?.title as string) || 'Aşı Hatırlatma'}
        message={(uiConfig?.message as string) || 'Evcil hayvanınızın yaklaşan aşılarını kontrol edin.'}
        ctaText={(uiConfig?.ctaText as string) || 'Aşıları Gör'}
        icon="💉"
        gradient="from-blue-50 to-indigo-50"
        iconBg="bg-blue-100 text-blue-700"
        onClick={handleClick}
        onDismiss={onClose}
      />
    </div>
  )
}
