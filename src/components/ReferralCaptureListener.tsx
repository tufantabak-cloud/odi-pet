'use client'

import { Suspense } from 'react'
import { useCaptureReferralParam } from '@/hooks/useReferralCapture'

/**
 * Kayıt / login sayfalarına gömülür.
 * URL'deki ?ref= parametresini yakalar ve localStorage'a yazar.
 * Suspense ile sarılı — useSearchParams() için Next.js gerekliliği.
 */
function ReferralCaptureInner() {
  useCaptureReferralParam()
  return null
}

export default function ReferralCaptureListener() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  )
}
