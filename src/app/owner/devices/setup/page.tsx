'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import DeviceSetupWizard from '../../../../components/DeviceSetupWizard'
import TagSetupWizard, { TagBrand } from '../../../../components/TagSetupWizard'

function DeviceSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('petId')
  const type = searchParams.get('type') || 'tag'

  const handleCameraComplete = async (wifi: string) => {
    if (petId) {
      try {
        const res = await fetch(`/api/pets/${petId}/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'camera',
            name: 'Kamera Cihazı',
            status: 'online',
            wifi_name: wifi
          })
        })
        if (!res.ok) {
          throw new Error('Cihaz kaydedilemedi')
        }
      } catch (err) {
        console.error('API Error:', err)
      }
    }

    localStorage.setItem(`odi_device_wifi_${petId}_camera`, wifi)
    localStorage.setItem(`odi_device_status_${petId}_camera`, 'online')
    router.push(`/owner/devices/settings?petId=${petId}&type=camera`)
  }

  const handleTagComplete = async (brand: TagBrand) => {
    if (petId) {
      localStorage.setItem(`odi_device_brand_${petId}_tag`, brand)
      localStorage.setItem(`odi_device_status_${petId}_tag`, 'online')
    }
    router.push(`/owner/pets/${petId}`)
  }

  if (type === 'tag') {
    return (
      <TagSetupWizard 
        onComplete={handleTagComplete} 
        onCancel={() => router.push('/owner/dashboard')} 
      />
    )
  }

  return (
    <DeviceSetupWizard 
      type={type as any}
      onComplete={handleCameraComplete} 
      onCancel={() => router.push('/owner/dashboard')} 
    />
  )
}

export default function DeviceSetupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-text-secondary font-bold">Yükleniyor...</div>}>
          <DeviceSetupContent />
        </Suspense>
      </div>
    </div>
  )
}
