'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CameraSetupWizard from '../../../../../components/camera/CameraSetupWizard'

function CameraSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('petId')

  const handleComplete = async (brand: string, name: string, data: string) => {
    if (petId) {
      try {
        const res = await fetch(`/api/pets/${petId}/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'camera',
            name: name,
            status: 'online',
            wifi_name: data // MVP süresince veritabanını değiştirmemek için burada tutuyoruz, "brand:xiaomi|token:123" gibi
          })
        })
        if (!res.ok) {
          throw new Error('Kamera kaydedilemedi')
        }
      } catch (err) {
        console.error('API Error:', err)
      }
    }

    // Başarıyla tamamlanınca kamerayı izleme sayfasına yönlendir
    router.push(`/owner/devices/camera?petId=${petId}`)
  }

  return (
    <CameraSetupWizard 
      onComplete={handleComplete} 
      onCancel={() => router.push(petId ? `/owner/pets/${petId}` : '/owner/dashboard')} 
    />
  )
}

export default function CameraSetupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-text-secondary font-bold">Yükleniyor...</div>}>
          <CameraSetupContent />
        </Suspense>
      </div>
    </div>
  )
}
