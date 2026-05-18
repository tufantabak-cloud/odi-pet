'use client'

import { useState } from 'react'

interface UpgradeButtonProps {
  plan: 'pro' | 'ai_plus'
  label?: string
  className?: string
}

export default function UpgradeButton({ plan, label, className }: UpgradeButtonProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' } | null>(null)

  const handleUpgrade = () => {
    setToast({ message: '✨ Çok yakında! Bekleme listesine eklendiniz.', type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  const buttonLabel = label || 'Çok Yakında — Bildirim Al →'

  return (
    <>
      <button onClick={handleUpgrade} className={className}>
        {buttonLabel}
      </button>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-[13px] font-bold border transition-all bg-emerald-50 text-emerald-800 border-emerald-200">
          {toast.message}
        </div>
      )}
    </>
  )
}
