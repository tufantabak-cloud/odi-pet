'use client'

/**
 * SocialLayout — /owner/social canonical layout primitives
 *
 * Onaylanan "11 Blok Standardı"nın tek kaynağı.
 * Üç sekme (Sahiplendirme / Kayıp İlanları / Eşleştirme) bu primitifleri
 * AYNI SIRADA kullanır. Sekmeye özgü olan yalnızca: içerik metni, CTA aksiyonu,
 * filtre kriterleri ve accent rengi.
 *
 * Kilit prensip: aynı konum + aynı genişlik + aynı görsel ağırlık + aynı spacing.
 * Yükseklik içerik gereği farklılaşabilir; blokların DIŞ container'ı sabittir.
 */

import React from 'react'
import Image from 'next/image'
import {
  Search, SlidersHorizontal, ChevronDown, ChevronRight,
  Megaphone, PawPrint,
} from 'lucide-react'
import { TURKIYE_ILLER } from '@/lib/utils/turkiyeIller'

export type SocialAccent = 'violet' | 'orange' | 'pink'

/* Tailwind sınıfları statik olmalı — dinamik string birleştirme yok. */
const ACCENT: Record<SocialAccent, {
  cardBorder: string
  cardFade: string
  labelPill: string
  divider: string
  focus: string
  toggleOn: string
  chipOn: string
  solid: string
  outline: string
  link: string
  icon: string
}> = {
  violet: {
    cardBorder: 'border-violet-100',
    cardFade: 'bg-gradient-to-bl from-violet-50 to-transparent',
    labelPill: 'bg-violet-50 text-violet-700 border-violet-100',
    divider: 'border-violet-100',
    focus: 'focus:ring-violet-500/20 focus:border-violet-500',
    toggleOn: 'bg-violet-50 border-violet-200 text-violet-700',
    chipOn: 'bg-violet-600 text-white border-violet-600 shadow-sm',
    solid: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/20',
    outline: 'bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 shadow-sm',
    link: 'text-violet-600 hover:text-violet-700',
    icon: 'text-violet-600',
  },
  /* Kayıp İlanları. orange-500/600 beyaz metinle WCAG AA'yı geçmiyor
     (2.80:1 / 3.56:1); solid yüzeylerde orange-700 kullanılıyor (5.18:1). */
  orange: {
    cardBorder: 'border-orange-200',
    cardFade: 'bg-gradient-to-bl from-orange-50 to-transparent',
    labelPill: 'bg-orange-50 text-orange-800 border-orange-200',
    divider: 'border-orange-100',
    focus: 'focus:ring-orange-500/20 focus:border-orange-500',
    toggleOn: 'bg-orange-50 border-orange-200 text-orange-800',
    chipOn: 'bg-orange-700 text-white border-orange-700 shadow-sm',
    solid: 'bg-orange-700 hover:bg-orange-800 text-white shadow-sm shadow-orange-700/20',
    outline: 'bg-white hover:bg-orange-50 text-orange-800 border border-orange-300 shadow-sm',
    link: 'text-orange-700 hover:text-orange-800',
    icon: 'text-orange-700',
  },
  pink: {
    cardBorder: 'border-pink-100',
    cardFade: 'bg-gradient-to-bl from-pink-50 to-transparent',
    labelPill: 'bg-pink-50 text-pink-700 border-pink-100',
    divider: 'border-pink-100',
    focus: 'focus:ring-pink-500/20 focus:border-pink-500',
    toggleOn: 'bg-pink-50 border-pink-200 text-pink-700',
    chipOn: 'bg-pink-600 text-white border-pink-600 shadow-sm',
    solid: 'bg-pink-600 hover:bg-pink-700 text-white shadow-sm shadow-pink-600/20',
    outline: 'bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 shadow-sm',
    link: 'text-pink-600 hover:text-pink-700',
    icon: 'text-pink-600',
  },
}

export const accentOf = (a: SocialAccent) => ACCENT[a]

/* ────────────────────────────────────────────────────────────
 * BLOK 3 — Sekme açıklaması
 * ──────────────────────────────────────────────────────────── */
export function TabDescription({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center px-4 min-h-[40px] flex items-center justify-center animate-fadeIn">
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{children}</p>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 4 — Aktif İlanınız (yalnızca ilan varsa render edilir)
 * Üç sekmede AYNI skeleton; değişen: accent, meta satırı, ekstra rozetler, aksiyon.
 * ──────────────────────────────────────────────────────────── */
export function ActiveListingCard({
  accent,
  label = 'Aktif İlanınız',
  avatarUrl,
  title,
  titleSuffix,
  meta,
  extras,
  action,
}: {
  accent: SocialAccent
  label?: string
  avatarUrl?: string | null
  title?: string
  titleSuffix?: React.ReactNode
  meta?: React.ReactNode
  extras?: React.ReactNode
  action: React.ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <div className={`bg-white border ${a.cardBorder} p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${a.cardFade} rounded-bl-full opacity-60 -z-10`} />

      <div className="flex justify-between items-start mb-3">
        <span className={`inline-flex items-center gap-1.5 ${a.labelPill} border text-2xs font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wide`}>
          <Megaphone className="w-3 h-3 stroke-[2]" /> {label}
        </span>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={title || 'Pet'} fill sizes="56px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-slate-900 text-base truncate">{title}</h4>
            {titleSuffix}
          </div>
          <p className="text-xs text-slate-500 font-normal truncate flex items-center gap-1.5 mt-0.5">
            {meta}
          </p>
        </div>
      </div>

      {extras}

      <div className={`flex gap-2 mt-4 pt-3.5 border-t ${a.divider}`}>
        {action}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 5 — CTA alanı
 * Dış container üç sekmede sabit; iç buton sayısı 1 veya 2 olabilir.
 * ──────────────────────────────────────────────────────────── */
export function CtaBar({ children, twoUp = false }: { children: React.ReactNode; twoUp?: boolean }) {
  return (
    <div className={twoUp ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'}>
      {children}
    </div>
  )
}

export const CTA_BUTTON_BASE =
  'flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs min-h-[48px] active:scale-[0.98] transition-all w-full text-center'

export function CtaSolid({ accent, ...rest }: { accent: SocialAccent } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const a = ACCENT[accent]
  const { className = '', ...props } = rest
  return <button type="button" {...props} className={`${CTA_BUTTON_BASE} ${a.solid} ${className}`} />
}

/* ────────────────────────────────────────────────────────────
 * BLOK 6 — Arama çubuğu + filtre butonu
 * ──────────────────────────────────────────────────────────── */
export function SearchBar({
  accent, value, onChange, placeholder, filtersOpen, onToggleFilters, activeCount = 0,
}: {
  accent: SocialAccent
  value: string
  onChange: (v: string) => void
  placeholder: string
  filtersOpen: boolean
  onToggleFilters: () => void
  activeCount?: number
}) {
  const a = ACCENT[accent]
  const hasFilters = activeCount > 0
  const ariaLabel = hasFilters ? `Filtreleri aç/kapat, ${activeCount} filtre aktif` : 'Filtreleri aç/kapat'
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2]" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 ${a.focus} transition-all placeholder:text-slate-400 shadow-sm`}
        />
      </div>
      <button
        type="button"
        onClick={onToggleFilters}
        aria-expanded={filtersOpen}
        aria-controls="social-filter-panel"
        aria-label={ariaLabel}
        className={`flex items-center justify-center gap-1.5 px-3.5 min-w-[44px] min-h-[44px] rounded-2xl border text-xs font-semibold transition-all shadow-sm shrink-0 relative ${
          filtersOpen ? a.toggleOn : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
        {hasFilters && (
          <span className="sm:hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold px-1 border-2 border-white">
            {activeCount}
          </span>
        )}
        <span className="hidden sm:inline">Filtrele {hasFilters ? `· ${activeCount}` : ''}</span>
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 7 — Filtre paneli (başlık satırı her sekmede daima görünür)
 * ──────────────────────────────────────────────────────────── */
export function FilterPanel({
  accent, open, onToggle, activeCount, children,
}: {
  accent: SocialAccent
  open: boolean
  onToggle: () => void
  activeCount: number
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div id="social-filter-panel" className="px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-wrap items-center gap-3 animate-fadeIn">
      {children}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 8 — Hızlı filtre chip'leri
 * ──────────────────────────────────────────────────────────── */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scroll-px-1">
        {children}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
    </div>
  )
}

export function FilterChip({
  accent, active, onClick, children,
}: {
  accent: SocialAccent
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 min-h-[40px] rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
        active ? a.chipOn : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 9 — Konum seçimi (+ sağ slot: yalnızca Kayıp'ta Liste/Harita)
 * ──────────────────────────────────────────────────────────── */
export function LocationRow({
  accent, value, onChange, allLabel = 'Konum (Tüm Türkiye)', right,
}: {
  accent: SocialAccent
  value: string
  onChange: (v: string) => void
  allLabel?: string
  right?: React.ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[40px]">
      <div className="relative inline-block">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label="Konum filtresi"
          className={`appearance-none px-4 py-2 pr-9 min-h-[40px] bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 ${a.focus} transition-all shadow-sm`}
        >
          <option value="">📍 {allLabel}</option>
          {Object.keys(TURKIYE_ILLER).sort().map(city => (
            <option key={city} value={city}>📍 {city}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
      </div>
      {right}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 10 — Sonuç alanı
 * ──────────────────────────────────────────────────────────── */
export function SectionHeading({
  accent, icon, children, onSeeAll,
}: {
  accent: SocialAccent
  icon?: React.ReactNode
  children: React.ReactNode
  onSeeAll?: () => void
}) {
  const a = ACCENT[accent]
  return (
    <div className="flex justify-between items-center px-1 min-h-[28px]">
      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
        {icon}
        {children}
      </h3>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className={`text-xs font-bold ${a.link} flex items-center gap-0.5`}
        >
          Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}

export function FeaturedRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-1 px-1">
      {children}
    </div>
  )
}

export function ResultsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}

export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * BLOK 11 — Boş durum
 * ──────────────────────────────────────────────────────────── */
export function EmptyState({
  title,
  hint = 'Filtreleri değiştirerek tekrar deneyebilirsiniz.',
  icon,
  action,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
        {icon ?? <PawPrint className="w-6 h-6 stroke-[1.75]" />}
      </div>
      <p className="text-sm font-semibold text-slate-900 text-center">{title}</p>
      <p className="text-xs text-slate-500 text-center font-normal">{hint}</p>
      {action}
    </div>
  )
}

/* Sekmeye özel ek bölümler (ör. Eşleştirme'de Aday Keşfet / Başvurularım)
   için ortak başlık stili — canonical blokların dışında kalır. */
export function SubSectionHeading({
  icon, children,
}: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 px-1">
      {icon}
      {children}
    </h3>
  )
}
