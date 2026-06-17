'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useSubmitPendingReferral } from '@/hooks/useReferralCapture'

/**
 * DashboardPendingReferral
 *
 * Owner layout içine gömülür. Kullanıcı oturum açtıktan sonra
 * localStorage'daki pending_referral kodunu /api/referral/use'a gönderir.
 */
export default function DashboardPendingReferral() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useSubmitPendingReferral(userId)

  return null
}
