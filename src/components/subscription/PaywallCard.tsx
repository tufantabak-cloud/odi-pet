'use client'

import Link from 'next/link'
import { Sparkles, Users, Lock, ChevronRight, ShieldCheck } from 'lucide-react'

interface PaywallCardProps {
  title?: string
  description?: string
  featureName?: string
  daysLeft?: number
}

export default function PaywallCard({
  title = 'Odi Pro Özelliği',
  description = 'Bu özellikten faydalanmak ve can dostunun bakımını üst seviyeye taşımak için Odi Pro aktif olmalıdır.',
  featureName,
  daysLeft,
}: PaywallCardProps) {
  return (
    <div className="card-base p-6 sm:p-8 rounded-3xl border border-primary/20 bg-gradient-to-b from-primary-soft/40 via-white to-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center flex flex-col items-center gap-5 max-w-lg mx-auto my-4 animate-fadeInUp">
      {/* Icon & Days Left Badge */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        {daysLeft !== undefined && daysLeft > 0 && (
          <span className="absolute -top-2 -right-3 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-extrabold shadow-sm">
            {daysLeft} gün kaldı
          </span>
        )}
      </div>

      {/* Header & Feature Context */}
      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
          {title}
        </h3>
        {featureName && (
          <span className="inline-block px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
            {featureName}
          </span>
        )}
        <p className="text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {/* Dual Equal-Weight CTAs (Product Growth Motor) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
        <Link
          href="/owner/profile/subscription"
          className="btn-primary py-3.5 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          <ShieldCheck className="w-4 h-4" />
          Odi Pro'ya Geç
        </Link>
        <Link
          href="/owner/referral"
          className="px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Users className="w-4 h-4 text-amber-700" />
          Arkadaş Davet Et (+30 Gün)
        </Link>
      </div>

      {/* Trust note */}
      <p className="text-xs text-text-secondary/70 font-medium">
        Kredi bittiğinde verilerin silinmez, yalnızca yeni ekleme kısıtlanır.
      </p>
    </div>
  )
}
