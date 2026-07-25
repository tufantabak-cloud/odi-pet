'use client'

import { useState } from 'react'

interface ManageSubscriptionButtonProps {
  label?: string
  className?: string
}

export default function ManageSubscriptionButton({
  label = 'Aboneliği Yönet',
  className,
}: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPortal = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/portal', { method: 'POST' })
      const result = (await response.json()) as {
        url?: string
        error?: string
      }

      if (!response.ok || !result.url) {
        setError(
          result.error === 'BILLING_ACCOUNT_NOT_FOUND'
            ? 'Bu hesap için henüz bir ödeme profili bulunmuyor.'
            : 'Abonelik yönetimi açılamadı. Lütfen tekrar dene.'
        )
        return
      }

      window.location.assign(result.url)
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar dene.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={openPortal}
        className={className}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Güvenli alan açılıyor…' : label}
      </button>
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
