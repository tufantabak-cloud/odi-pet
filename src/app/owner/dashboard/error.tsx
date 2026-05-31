'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]:', error)
  }, [error])

  return (
    <ErrorState
      title="Bir sorun oluştu."
      message="Dashboard bilgileri yüklenirken bir aksaklık oldu. Lütfen tekrar deneyin."
      onRetry={reset}
    />
  )
}
