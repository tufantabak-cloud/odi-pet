'use client'

import { useSubmitPendingReferral } from '@/hooks/useReferralCapture'

/**
 * DashboardPendingReferral
 *
 * Owner layout içine gömülür. Kullanıcı oturum açtıktan sonra
 * localStorage'daki pending_referral kodunu /api/referral/use'a gönderir.
 */
export default function DashboardPendingReferral({ currentUserId }: { currentUserId?: string }) {
  useSubmitPendingReferral(currentUserId || null)

  return null
}
