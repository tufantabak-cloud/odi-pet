'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import DeviceNotificationSettings from '../../../../components/DeviceNotificationSettings'

function DeviceSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('petId')
  const type = searchParams.get('type') || 'tag'

  const handleSave = async (settings: { motionAlerts: boolean; sensitivity: string }) => {
    if (petId) {
      try {
        const savedWifi = localStorage.getItem(`odi_device_wifi_${petId}_${type}`) || ''
        const res = await fetch(`/api/pets/${petId}/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            name: `${type === 'camera' ? 'Kamera' : 'TAG'} Cihazı`,
            status: 'online',
            wifi_name: savedWifi,
            motion_alerts_enabled: settings.motionAlerts,
            sensitivity_level: settings.sensitivity
          })
        })
        if (!res.ok) {
          throw new Error('Ayarlar kaydedilemedi')
        }
      } catch (err) {
        console.error('API Error:', err)
      }
    }

    localStorage.setItem(`odi_device_motion_alerts_${petId}_${type}`, JSON.stringify(settings.motionAlerts))
    localStorage.setItem(`odi_device_sensitivity_${petId}_${type}`, settings.sensitivity)
    alert('Bildirim ayarlarınız başarıyla kaydedildi!')
    router.push('/owner/dashboard')
  }

  return (
    <DeviceNotificationSettings 
      onSave={handleSave} 
      onCancel={() => router.push('/owner/dashboard')} 
    />
  )
}

export default function DeviceSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-text-secondary font-bold">Yükleniyor...</div>}>
          <DeviceSettingsContent />
        </Suspense>
      </div>
    </div>
  )
}
