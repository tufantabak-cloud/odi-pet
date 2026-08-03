'use client'

import React from 'react'

interface SmartCardBannerProps {
  title: string
  message: string
  ctaText: string
  icon?: React.ReactNode
  onClick: () => void
  onDismiss?: () => void
  gradient?: string
  iconBg?: string
}

export default function SmartCardBanner({
  title,
  message,
  ctaText,
  icon = '🐾',
  onClick,
  onDismiss,
  gradient = 'from-violet-50 to-purple-50',
  iconBg = 'bg-violet-100 text-violet-700',
}: SmartCardBannerProps) {
  return (
    <div className={`relative w-full rounded-[20px] border border-primary/10 bg-gradient-to-br ${gradient} p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition-all duration-300 group`}>
      <div className={`w-12 h-12 shrink-0 rounded-2xl ${iconBg} flex items-center justify-center text-[24px] shadow-sm group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        <h4 className="text-base font-extrabold text-text-primary">{title}</h4>
        <p className="text-[13px] text-text-secondary font-medium leading-snug">{message}</p>
      </div>

      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
        <button 
          onClick={onClick}
          className="flex-1 sm:flex-none px-5 py-3 bg-primary text-white text-[13px] font-bold rounded-xl shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {ctaText}
        </button>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="px-4 py-3 text-[13px] font-bold text-text-secondary border border-border-main rounded-xl hover:bg-white hover:text-text-primary active:scale-[0.98] transition-all"
            aria-label="Kapat"
          >
            Atla
          </button>
        )}
      </div>
    </div>
  )
}
