'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'

const SEGMENT_CONFIG = {
  HIGH_ELIGIBILITY: {
    label: 'Yüksek Uygunluk',
    emoji: '🟢',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    barColor: 'bg-green-500',
    cta: 'Teklif Al →',
    ctaStyle: 'bg-green-600 hover:bg-green-700 text-white',
    ctaDesc: 'Petiniz koruma planı için uygun görünüyor.',
  },
  REVIEW_NEEDED: {
    label: 'İnceleme Gerekli',
    emoji: '🟡',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    barColor: 'bg-amber-400',
    cta: 'Uygunluğu İyileştir →',
    ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
    ctaDesc: 'Birkaç adımla uygunluk skorunuzu artırabilirsiniz.',
  },
  HIGH_RISK: {
    label: 'Ek Değerlendirme',
    emoji: '🔴',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    barColor: 'bg-red-400',
    cta: 'Bakım Planı Oluştur →',
    ctaStyle: 'bg-red-500 hover:bg-red-600 text-white',
    ctaDesc: 'Sigorta seçenekleri ek değerlendirme gerektirebilir.',
  },
}

export default function InsuranceWidget({ petId, plan }: { petId: string; plan: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showToast, setShowToast] = useState(false)

  async function load(force = false) {
    force ? setRefreshing(true) : setLoading(true)
    const res = await fetch(`/api/insurance/${petId}${force ? '?force=true' : ''}`)
    const json = await res.json()
    setData(json)
    force ? setRefreshing(false) : setLoading(false)
  }

  useEffect(() => { load() }, [petId])

  // Fire viewed event once data is loaded (and not locked/free-tier)
  useEffect(() => {
    if (data && !data.locked) {
      trackEvent('insurance_widget_viewed', { petId, segment: data.segment })
    }
  }, [data])

  if (loading) return (
    <div className="card-base p-5 animate-pulse">
      <div className="h-4 bg-bg-main rounded w-1/3 mb-3"/>
      <div className="h-16 bg-bg-main rounded"/>
    </div>
  )

  // ── Free teaser ──
  if (data?.locked) return (
    <div className="card-base p-5 border border-dashed border-border-main">
      <div className="flex items-center gap-3">
        <span className="text-[28px]">🛡️</span>
        <div className="flex-1">
          <p className="font-bold text-text-primary text-[14px]">Sigorta Uygunluğu</p>
          <p className="text-[12px] text-text-secondary mt-0.5">Petinizin sigorta hazırlık skorunu görün</p>
        </div>
        <Link href="/owner/profile/subscription"
          className="text-[12px] font-black px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shrink-0">
          Pro ile Aç
        </Link>
      </div>
    </div>
  )

  if (!data) return null

  const seg = SEGMENT_CONFIG[data.segment as keyof typeof SEGMENT_CONFIG] ?? SEGMENT_CONFIG.REVIEW_NEEDED
  const score = data.insuranceScore ?? 0
  const barWidth = `${score}%`

  return (
    <div className={`card-base overflow-hidden border ${seg.border}`}>
      {/* Header */}
      <div className={`px-5 py-4 ${seg.bg} border-b ${seg.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[28px]">🛡️</span>
            <div>
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Sigorta Uygunluğu</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px]">{seg.emoji}</span>
                <span className={`text-[13px] font-black ${seg.color}`}>{seg.label}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-[36px] font-black leading-none ${seg.color}`}>{score}</p>
            <p className="text-[10px] font-bold text-text-secondary">/100</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${seg.barColor}`} style={{ width: barWidth }}/>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">{seg.ctaDesc}</p>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">

        {/* Hard flags */}
        {data.hardFlags?.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-[11px] font-black text-red-700 uppercase tracking-wide mb-1.5">⚠️ Zorunlu İnceleme</p>
            {data.hardFlags.map((f: string, i: number) => (
              <p key={i} className="text-[12px] text-red-700 flex items-center gap-1.5">
                <span>•</span>{f}
              </p>
            ))}
          </div>
        )}

        {/* Positives */}
        {data.positives?.length > 0 && (
          <div>
            <p className="text-[11px] font-black text-green-700 uppercase tracking-wide mb-1.5">✓ Güçlü Yanlar</p>
            <div className="flex flex-col gap-1">
              {data.positives.map((p: string, i: number) => (
                <p key={i} className="text-[12px] text-text-primary flex items-center gap-1.5">
                  <span className="text-green-500">✓</span>{p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Negative reasons */}
        {data.reasons?.length > 0 && (
          <div>
            <p className="text-[11px] font-black text-text-secondary uppercase tracking-wide mb-1.5">
              {expanded ? '⚠ İyileştirme Alanları' : '⚠ İyileştirme Alanları'}
            </p>
            <div className="flex flex-col gap-1">
              {(expanded ? data.reasons : data.reasons.slice(0, 2)).map((r: string, i: number) => (
                <p key={i} className="text-[12px] text-text-secondary flex items-center gap-1.5">
                  <span className="text-amber-500">!</span>{r}
                </p>
              ))}
              {data.reasons.length > 2 && (
                <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-primary font-bold mt-1 text-left hover:underline">
                  {expanded ? 'Daha az göster' : `+${data.reasons.length - 2} daha`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Next actions */}
        {data.nextActions?.length > 0 && (
          <div className="p-3 rounded-xl bg-bg-main border border-border-main">
            <p className="text-[11px] font-black text-text-secondary uppercase tracking-wide mb-2">📋 Sıradaki Adımlar</p>
            <div className="flex flex-col gap-1.5">
              {data.nextActions.map((a: string, i: number) => (
                <p key={i} className="text-[12px] text-text-primary flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-border-main shrink-0"/>
                  {a}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="relative">
          <button
            className={`w-full py-3 rounded-xl font-bold text-[14px] transition-colors ${seg.ctaStyle}`}
            onClick={() => {
              trackEvent('insurance_cta_clicked', { petId, segment: data.segment })
              setShowToast(true)
              setTimeout(() => setShowToast(false), 3000)
            }}
          >
            🛡️ {seg.cta}
          </button>
          
          {showToast && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[90%] bg-text-primary text-white text-[12px] font-bold py-2.5 px-3 rounded-lg text-center animate-in fade-in zoom-in duration-300 shadow-xl z-10 whitespace-nowrap">
              Sizi bilgilendireceğiz! 🚀 Yakında...
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] text-text-secondary">
          <span>
            {data.cached ? '📦 Önbellekten' : '🔄 Yeni hesaplandı'} ·{' '}
            {data.computedAt ? new Date(data.computedAt).toLocaleDateString('tr-TR') : ''}
          </span>
          <button onClick={() => load(true)} disabled={refreshing}
            className="text-primary font-bold hover:underline">
            {refreshing ? 'Hesaplanıyor...' : 'Yenile'}
          </button>
        </div>
      </div>
    </div>
  )
}
