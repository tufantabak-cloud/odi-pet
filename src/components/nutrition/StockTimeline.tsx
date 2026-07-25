'use client'

/**
 * StockTimeline
 * Mama stok takibi için görsel timeline/progress bar bileşeni.
 *
 * Uyarı seviyeleri:
 *   > 7 gün   → Normal   (yeşil)
 *   ≤ 7 gün   → Azalıyor (turuncu)
 *   ≤ 3 gün   → Bitiyor  (kırmızı-turuncu)
 *   ≤ 1 gün   → Bitti!   (kırmızı, pulse)
 *
 * Dinamik kapasite: maxDays = ilk stok eklendiğindeki toplam gün sayısı.
 * Prop olarak geçilmezse estimatedRemainingGrams / dailyUsage ile hesaplanır;
 * gerçekçi baz değer NutritionClient'tan inventory.initial_total_days olarak gelir.
 */

import { estimateNextRefillDate } from '@/lib/nutrition/refill-engine'

interface StockTimelineProps {
  /** Tahminen kalan stok (gram) */
  estimatedRemainingGrams: number
  /** Günlük kullanım (gram) */
  dailyUsage: number
  /** Hesaplanmış kalan gün sayısı (refillStatus.daysLeft) */
  daysLeft: number | null
  /** Stok durumu */
  stockStatus: 'unknown' | 'available' | 'depleted' | 'paused'
  /**
   * Timeline %100 referans değeri (gün).
   * Dinamik: stok ilk eklendiğinde hesaplanan toplam gün.
   * Geçilmezse component, estimatedRemainingGrams + geçen gün toplamından türetir.
   */
  maxDays?: number
}

// ─── Yardımcı: durum konfigürasyonu ────────────────────────────────────────

interface StatusConfig {
  label: string
  icon: string
  barColor: string
  bgColor: string
  textColor: string
  badgeBg: string
  pulse: boolean
}

function getStatusConfig(daysLeft: number | null, stockStatus: StockTimelineProps['stockStatus']): StatusConfig {
  if (stockStatus === 'depleted' || daysLeft === 0) {
    return {
      label: 'Mama Bitti!',
      icon: '🚨',
      barColor: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      badgeBg: 'bg-red-100 text-red-700 border-red-200',
      pulse: true,
    }
  }
  if (daysLeft !== null && daysLeft <= 1) {
    return {
      label: 'Mama Bitti!',
      icon: '🚨',
      barColor: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      badgeBg: 'bg-red-100 text-red-700 border-red-200',
      pulse: true,
    }
  }
  if (daysLeft !== null && daysLeft <= 3) {
    return {
      label: 'Bitiyor',
      icon: '🔴',
      barColor: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
      pulse: false,
    }
  }
  if (daysLeft !== null && daysLeft <= 7) {
    return {
      label: 'Azalıyor',
      icon: '🟠',
      barColor: 'bg-amber-400',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
      pulse: false,
    }
  }
  return {
    label: 'Normal',
    icon: '🟢',
    barColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pulse: false,
  }
}

// ─── Yardımcı: gram → kg/g formatı ────────────────────────────────────────

function formatGrams(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${Math.round(grams)} g`
}

// ─── Yardımcı: tarih formatı ───────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Bileşen ───────────────────────────────────────────────────────────────

export default function StockTimeline({
  estimatedRemainingGrams,
  dailyUsage,
  daysLeft,
  stockStatus,
  maxDays,
}: StockTimelineProps) {
  // Bileşeni sadece stok bilgisi varken göster
  if (stockStatus === 'unknown' || stockStatus === 'paused') return null
  if (dailyUsage <= 0) return null

  // Dinamik maksimum: prop gelmediyse kalan gramı günlük kullanıma böl
  // (Gerçek başlangıç stocku yoksa en kötü durumda mevcut stok referans alınır)
  const resolvedMaxDays = maxDays && maxDays > 0 ? maxDays : Math.max(daysLeft ?? 0, 1)

  // Bar doluluk yüzdesi (0–100)
  const fillPercent = daysLeft !== null
    ? Math.min(100, Math.max(0, (daysLeft / resolvedMaxDays) * 100))
    : (stockStatus === 'depleted' ? 0 : 100)

  const config = getStatusConfig(daysLeft, stockStatus)

  // Tahmini bitiş tarihi
  const refillDate = dailyUsage > 0
    ? estimateNextRefillDate({ stockGrams: estimatedRemainingGrams, dailyUsage })
    : null

  return (
    <div className={`rounded-2xl border px-4 pt-4 pb-3 flex flex-col gap-2.5 transition-all ${config.bgColor} border-transparent`}>

      {/* Başlık satırı */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
            Stok Tahmini
          </span>
        </div>
        {/* Durum badge */}
        <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border ${config.badgeBg} ${config.pulse ? 'animate-pulse' : ''}`}>
          <span>{config.icon}</span>
          {config.label}
        </span>
      </div>

      {/* Gram + gün bilgisi */}
      <div className="flex items-end justify-between gap-1">
        <p className={`text-[22px] font-black leading-none ${config.textColor}`}>
          {stockStatus === 'depleted' ? '0 g' : formatGrams(estimatedRemainingGrams)}
        </p>
        <p className="text-[13px] font-bold text-text-secondary leading-none pb-0.5">
          {daysLeft !== null && daysLeft > 0
            ? `≈ ${Math.floor(daysLeft)} gün kaldı`
            : '0 gün kaldı'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-white/70 rounded-full overflow-hidden border border-white/40 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${config.barColor} ${config.pulse ? 'animate-pulse' : ''}`}
          style={{ width: `${fillPercent}%` }}
          role="progressbar"
          aria-valuenow={Math.round(fillPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Mama stoku: %${Math.round(fillPercent)}`}
        />
      </div>

      {/* Tahmini bitiş tarihi + timeline etiketleri */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Sol: Bugün */}
        <span className="text-[10px] font-bold text-text-secondary/70">Bugün</span>

        {/* Sağ: Tahmini bitiş */}
        {refillDate && daysLeft !== null && daysLeft > 0 ? (
          <span className={`text-[11px] font-bold ${config.textColor}`}>
            🏁 Tahmini Bitiş: {formatDate(refillDate)}
          </span>
        ) : stockStatus === 'depleted' || (daysLeft !== null && daysLeft <= 0) ? (
          <span className="text-[11px] font-bold text-red-600">
            🚨 Mama tükendi — Stok güncelleyin
          </span>
        ) : null}
      </div>
    </div>
  )
}
