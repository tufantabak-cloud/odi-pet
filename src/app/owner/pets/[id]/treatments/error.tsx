'use client'
import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

export default function TreatmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[treatments error boundary]:', error)
  }, [error])

  return (
    <ErrorState
      title="Bir sorun oluştu."
      message="Tedavi kayıtları yüklenirken bir aksaklık oldu. Lütfen tekrar deneyin."
      onRetry={reset}
    />
  )
}
