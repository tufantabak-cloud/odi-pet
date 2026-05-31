'use client'
import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

export default function AiVetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ai-vet error boundary]:', error)
  }, [error])

  return (
    <ErrorState
      title="Bir sorun oluştu."
      message="AI Vet'e ulaşılırken bir aksaklık oldu. Lütfen tekrar deneyin."
      onRetry={reset}
    />
  )
}
