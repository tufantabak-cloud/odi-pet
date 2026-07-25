'use client'

import { useState } from 'react'

interface UpgradeButtonProps {
  plan: 'pro' | 'ai_plus'
  interval?: 'monthly' | 'yearly'
  label?: string
  className?: string
  disabled?: boolean
}

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Devam etmek için yeniden giriş yap.',
  PLAN_NOT_AVAILABLE: 'Bu plan şu anda kullanılamıyor.',
  PLAN_PRICE_NOT_CONFIGURED: 'Bu planın ödeme ayarı henüz tamamlanmamış.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'Güvenli ödeme sistemi henüz yapılandırılmamış.',
  SUBSCRIPTION_ALREADY_EXISTS: 'Mevcut aboneliğini “Aboneliği Yönet” alanından değiştirebilirsin.',
}

export default function UpgradeButton({
  plan,
  interval = 'monthly',
  label,
  className,
  disabled = false,
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, interval }),
      })
      const result = (await response.json()) as {
        url?: string
        error?: string
      }

      if (!response.ok || !result.url) {
        setError(
          ERROR_MESSAGES[result.error ?? ''] ??
            'Ödeme sayfası açılamadı. Lütfen tekrar dene.'
        )
        return
      }

      window.location.assign(result.url)
    } catch {
      setError('Bağlantı kurulamadı. Lütfen internetini kontrol edip tekrar dene.')
    } finally {
      setIsLoading(false)
    }
  }

  const buttonLabel = label || 'Güvenli Ödemeye Geç →'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleUpgrade}
        className={className}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Ödeme sayfası hazırlanıyor…' : buttonLabel}
      </button>

      {error && (
        <p role="alert" className="text-[12px] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
