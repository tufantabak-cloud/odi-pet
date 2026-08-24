'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * useReferralCapture
 *
 * Kullanım:
 * 1) Kayıt/login sayfasında: ?ref=ODI-XXXXX parametresini yakalar → localStorage'a yazar.
 * 2) Dashboard veya auth callback sonrası layout içinde: localStorage'dan okur,
 *    /api/referral/use'a POST eder ve temizler.
 */

// ── Adım 1: Parametreyi yakala ve sakla ─────────────────────────
export function useCaptureReferralParam() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams?.get('ref')
    if (ref) {
      localStorage.setItem('pending_referral', ref.toUpperCase())
    }
  }, [searchParams])
}

// ── Adım 2: Saklanan kodu gönder (oturum açıldıktan sonra çağrılır) ─
export function useSubmitPendingReferral(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return

    const pendingCode = localStorage.getItem('pending_referral')
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('odipet_ref=')
    
    if (!pendingCode && !hasCookie) return

    if (pendingCode) {
      localStorage.removeItem('pending_referral')
    }

    fetch('/api/referral/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingCode ? { referralCode: pendingCode } : {}),
    }).catch(() => {
      // Sessiz hata - kritik değil
    })
  }, [userId])
}
