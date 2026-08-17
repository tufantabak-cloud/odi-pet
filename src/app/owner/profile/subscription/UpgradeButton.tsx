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
    // Payment is disabled for launch
    return
  }

  const buttonLabel = 'Yakında';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleUpgrade}
        className={className}
        disabled={true}
        aria-busy={false}
        title="Ödeme altyapısı lansman sonrası aktif edilecektir."
      >
        {buttonLabel}
      </button>

      {error && (
        <p role="alert" className="text-[12px] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
