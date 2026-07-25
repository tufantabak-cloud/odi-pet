'use client'

import React, { useState, useMemo } from 'react'
import { ScaleIcon } from '@/components/icons/PetIcons'

interface WeightLog {
  id: string
  weight_kg: number | null
  measured_at: string | null
  created_at?: string | null
  notes?: string | null
  [key: string]: any
}

interface WeightChangeChartProps {
  weightLogs: WeightLog[]
  onAddRecord?: () => void
}

interface ProcessedPoint {
  id: string
  index: number
  weightKg: number
  measuredAt: Date
  dateLabel: string
  fullDateLabel: string
  timeLabel: string
  prevWeightKg: number | null
  diffKg: number
  diffGrams: number
  isFirst: boolean
  isGain: boolean
  isLoss: boolean
  isNeutral: boolean
  daysPassed: number
}

export default function WeightChangeChart({ weightLogs, onAddRecord }: WeightChangeChartProps) {
  // Parse and sort records chronologically (oldest first)
  const sortedLogs = useMemo(() => {
    return [...weightLogs]
      .filter((r) => r.weight_kg != null && Number(r.weight_kg) > 0 && (r.measured_at || r.created_at))
      .sort((a, b) => {
        const dA = new Date(a.measured_at || a.created_at || '').getTime()
        const dB = new Date(b.measured_at || b.created_at || '').getTime()
        return dA - dB
      })
  }, [weightLogs])

  // Process ALL measurement points (mapping 1-to-1 with history list)
  const points: ProcessedPoint[] = useMemo(() => {
    if (sortedLogs.length === 0) return []

    // Count occurrences per date string to handle same-day entries
    const dateCounts: Record<string, number> = {}
    const dateIndices: Record<string, number> = {}

    sortedLogs.forEach((log) => {
      const d = new Date(log.measured_at || log.created_at || '')
      const key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      dateCounts[key] = (dateCounts[key] || 0) + 1
    })

    return sortedLogs.map((curr, idx) => {
      const weightKg = Number(curr.weight_kg)
      const measuredAt = new Date(curr.measured_at || curr.created_at || '')
      const isFirst = idx === 0

      const prev = isFirst ? null : sortedLogs[idx - 1]
      const prevWeightKg = prev ? Number(prev.weight_kg) : null

      const diffKg = prevWeightKg !== null ? weightKg - prevWeightKg : 0
      const diffGrams = Math.round(diffKg * 1000)

      let daysPassed = 0
      if (prev) {
        const prevDate = new Date(prev.measured_at || prev.created_at || '')
        const timeDiff = measuredAt.getTime() - prevDate.getTime()
        daysPassed = Math.max(0, Math.round(timeDiff / (1000 * 60 * 60 * 24)))
      }

      const rawDateLabel = measuredAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      let dateLabel = rawDateLabel

      // If multiple logs exist on the same date, add counter or time
      if (dateCounts[rawDateLabel] > 1) {
        dateIndices[rawDateLabel] = (dateIndices[rawDateLabel] || 0) + 1
        const hasTime = measuredAt.getHours() !== 0 || measuredAt.getMinutes() !== 0
        if (hasTime) {
          const timeStr = measuredAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          dateLabel = `${rawDateLabel} ${timeStr}`
        } else {
          dateLabel = `${rawDateLabel} (#${dateIndices[rawDateLabel]})`
        }
      }

      const fullDateLabel = measuredAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
      const timeLabel = measuredAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

      return {
        id: curr.id || `point-${idx}`,
        index: idx,
        weightKg,
        measuredAt,
        dateLabel,
        fullDateLabel,
        timeLabel,
        prevWeightKg,
        diffKg,
        diffGrams,
        isFirst,
        isGain: !isFirst && diffGrams > 0,
        isLoss: !isFirst && diffGrams < 0,
        isNeutral: isFirst || diffGrams === 0,
        daysPassed
      }
    })
  }, [sortedLogs])

  // Currently selected point index (defaults to latest measurement)
  const [selectedIndex, setSelectedIndex] = useState<number>(() => Math.max(0, points.length - 1))
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Keep selected index in bounds when points change
  const activeIndex = useMemo(() => {
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length) {
      return hoveredIndex
    }
    if (selectedIndex >= points.length) {
      return Math.max(0, points.length - 1)
    }
    return selectedIndex
  }, [hoveredIndex, selectedIndex, points.length])

  // Statistics
  const stats = useMemo(() => {
    if (points.length === 0) return { totalGain: 0, totalLoss: 0, netGrams: 0, lastDelta: 0 }

    let totalGain = 0
    let totalLoss = 0

    points.forEach((p) => {
      if (!p.isFirst) {
        if (p.diffGrams > 0) totalGain += p.diffGrams
        else if (p.diffGrams < 0) totalLoss += Math.abs(p.diffGrams)
      }
    })

    const firstKg = points[0].weightKg
    const lastKg = points[points.length - 1].weightKg
    const netGrams = Math.round((lastKg - firstKg) * 1000)
    const lastPoint = points[points.length - 1]
    const lastDelta = lastPoint.isFirst ? 0 : lastPoint.diffGrams

    return { totalGain, totalLoss, netGrams, lastDelta }
  }, [points])

  // Max absolute gram delta for scaling SVG chart height
  const maxAbsGram = useMemo(() => {
    if (points.length <= 1) return 500
    const nonFirstDeltas = points.filter(p => !p.isFirst).map(p => Math.abs(p.diffGrams))
    const maxVal = nonFirstDeltas.length > 0 ? Math.max(...nonFirstDeltas) : 200
    return Math.max(maxVal * 1.25, 100) // minimum scale of 100g
  }, [points])

  // SVG Chart Layout dimensions
  const chartHeight = 220
  const padding = { top: 38, bottom: 44, left: 40, right: 40 }
  const innerWidth = 1000 - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  const baselineY = 140 // Y position of 0g line

  // X coordinate calculation helper for 100% exact SVG <-> HTML alignment
  const getCenterX = (index: number) => {
    if (points.length <= 1) return 500
    const step = innerWidth / points.length
    return padding.left + step * index + step / 2
  }

  // Weight Trend Line math (min/max weight)
  const weightMinMax = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 1 }
    const kgs = points.map(p => p.weightKg)
    const min = Math.min(...kgs)
    const max = Math.max(...kgs)
    return { min, max: max === min ? min + 1 : max }
  }, [points])

  // Path string for Weight Trajectory Line
  const trendLinePath = useMemo(() => {
    if (points.length < 2) return ''
    const coords = points.map((p, i) => {
      const x = getCenterX(i)
      const ratio = (p.weightKg - weightMinMax.min) / (weightMinMax.max - weightMinMax.min)
      const y = padding.top + 16 - ratio * 14
      return { x, y }
    })

    return coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`
    }, '')
  }, [points, weightMinMax])

  const activePoint = points[activeIndex] || null

  return (
    <div className="card-base p-4 sm:p-5 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col gap-4 relative overflow-hidden animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex items-center justify-between z-10 relative flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <ScaleIcon badgeSize="md" size={20} />
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-black text-text-primary flex items-center gap-2 flex-wrap">
              Kilo Değişim Grafiği
              <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#EEECFE] text-[#5955D8] border border-[#5955D8]/20">
                {points.length} Ölçüm
              </span>
            </h3>
            <p className="text-[11px] text-text-secondary font-semibold">Tüm ölçümler arası eksilen (-) ve artan (+) gram değişimleri</p>
          </div>
        </div>
      </div>

      {/* ── Empty State ── */}
      {points.length === 0 ? (
        <div className="w-full py-8 px-4 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-b from-[#EEECFE]/40 to-bg-main/50 rounded-2xl border border-dashed border-[#5955D8]/30">
          <ScaleIcon badgeSize="lg" size={26} />
          <div className="max-w-md">
            <p className="text-[13px] font-extrabold text-text-primary">
              Kilo Değişim Grafiği İçin Henüz Ölçüm Yok
            </p>
            <p className="text-[12px] text-text-secondary font-medium mt-1">
              Henüz kilo kaydı bulunmuyor. Yeni bir kilo kaydı ekleyerek evcil dostunuzun gelişimini takip edebilirsiniz.
            </p>
          </div>
          {onAddRecord && (
            <button
              onClick={onAddRecord}
              className="btn-primary text-[12px] font-bold py-2 px-5 min-h-[40px] shadow-sm flex items-center gap-1.5 mt-1"
            >
              <span>+</span> Yeni Kilo Kaydı Ekle
            </button>
          )}
        </div>
      ) : points.length === 1 ? (
        <div className="w-full py-6 px-4 flex flex-col items-center justify-center text-center gap-2.5 bg-amber-50/40 rounded-2xl border border-amber-200/80">
          <span className="text-[28px]">⚖️</span>
          <p className="text-[13px] font-extrabold text-text-primary">
            İlk Kilo Kaydı Alındı: <span className="text-amber-700 font-black">{points[0].weightKg} kg</span> ({points[0].dateLabel})
          </p>
          <p className="text-[12px] text-text-secondary font-medium max-w-md">
            Gram bazlı kilo değişimini (artan/eksilen) görebilmek için en az 2 ölçüm gereklidir. İkinci ölçümü eklediğinizde grafik burada görünecektir.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary Stats Pills ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 z-10 relative">
            {/* Toplam Artış */}
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Toplam Artış</span>
                <span className="text-[13px] sm:text-[14px] font-black text-emerald-800 flex items-center gap-0.5">
                  <span className="text-[11px]">▲</span> +{stats.totalGain} gr
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 font-bold text-[12px] shrink-0">
                ↑
              </div>
            </div>

            {/* Toplam Eksilme */}
            <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Toplam Eksilme</span>
                <span className="text-[13px] sm:text-[14px] font-black text-rose-800 flex items-center gap-0.5">
                  <span className="text-[11px]">▼</span> {stats.totalLoss === 0 ? '0 gr' : `-${stats.totalLoss} gr`}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-600 font-bold text-[12px] shrink-0">
                ↓
              </div>
            </div>

            {/* Net Değişim */}
            <div className={`border rounded-xl p-2.5 flex items-center justify-between ${
              stats.netGrams > 0
                ? 'bg-emerald-50/50 border-emerald-200/60'
                : stats.netGrams < 0
                ? 'bg-rose-50/50 border-rose-200/60'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Net Değişim</span>
                <span className={`text-[13px] sm:text-[14px] font-black ${
                  stats.netGrams > 0 ? 'text-emerald-700' : stats.netGrams < 0 ? 'text-rose-700' : 'text-text-primary'
                }`}>
                  {stats.netGrams > 0 ? `+${stats.netGrams}` : stats.netGrams} gr
                </span>
              </div>
              <div className="text-[15px] shrink-0">
                {stats.netGrams > 0 ? '📈' : stats.netGrams < 0 ? '📉' : '⚖️'}
              </div>
            </div>

            {/* Son Ölçüm */}
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Son Ölçüm</span>
                <span className={`text-[13px] sm:text-[14px] font-black ${
                  stats.lastDelta > 0 ? 'text-emerald-700' : stats.lastDelta < 0 ? 'text-rose-700' : 'text-text-primary'
                }`}>
                  {stats.lastDelta > 0 ? `+${stats.lastDelta}` : `${stats.lastDelta}`} gr
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700/90 bg-white/90 px-1.5 py-0.5 rounded-md border border-amber-200/60 shrink-0">
                {points[points.length - 1].dateLabel}
              </span>
            </div>
          </div>

          {/* ── Interactive SVG Chart ── */}
          <div className="relative w-full overflow-x-auto pt-2 pb-2 scrollbar-thin">
            <div className="min-w-[340px] w-full relative" style={{ height: `${chartHeight}px` }}>
              <svg
                viewBox={`0 0 1000 ${chartHeight}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible drop-shadow-sm select-none"
              >
                <defs>
                  {/* Gradient for Positive Gain (+gr) */}
                  <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.75" />
                  </linearGradient>

                  {/* Gradient for Negative Loss (-gr) */}
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.95" />
                  </linearGradient>

                  {/* Glow Filters */}
                  <filter id="gainShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
                  </filter>
                  <filter id="lossShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Top Gridline */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={1000 - padding.right}
                  y2={padding.top}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Center Baseline 0g */}
                <line
                  x1={padding.left}
                  y1={baselineY}
                  x2={1000 - padding.right}
                  y2={baselineY}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* Baseline Label */}
                <text
                  x={padding.left + 4}
                  y={baselineY - 6}
                  textAnchor="start"
                  fontSize="10"
                  fontWeight="800"
                  fill="#94a3b8"
                >
                  0 gr (Nötr)
                </text>

                {/* Weight Trajectory Curve (Top line) */}
                {trendLinePath && (
                  <path
                    d={trendLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.6"
                  />
                )}

                {/* ── Render Delta Bars for ALL Points ── */}
                {points.map((p, i) => {
                  const centerX = getCenterX(i)
                  const stepWidth = innerWidth / points.length
                  const barWidth = Math.min(stepWidth * 0.4, 52)

                  // Height calculation relative to baseline
                  const maxBarSpan = 52 // Max pixel height for bars above/below baseline
                  const barH = (Math.abs(p.diffGrams) / maxAbsGram) * maxBarSpan
                  let barY = baselineY
                  if (p.isGain) {
                    barY = baselineY - barH
                  }

                  const isSelected = activeIndex === i

                  return (
                    <g
                      key={p.id}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedIndex(i)}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Invisible Wide Hit Area for Touch/Click */}
                      <rect
                        x={centerX - stepWidth / 2}
                        y={padding.top - 15}
                        width={stepWidth}
                        height={innerHeight + 35}
                        fill="transparent"
                      />

                      {/* Selection Column Highlight */}
                      {isSelected && (
                        <rect
                          x={centerX - barWidth / 2 - 8}
                          y={padding.top - 8}
                          width={barWidth + 16}
                          height={innerHeight + 16}
                          fill="#f1f5f9"
                          rx="10"
                          opacity="0.8"
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />
                      )}

                      {/* Bar Graphic */}
                      {p.isFirst ? (
                        /* Initial Measurement Marker (Clean Pill Baseline) */
                        <rect
                          x={centerX - barWidth / 2}
                          y={baselineY - 12}
                          width={barWidth}
                          height="24"
                          rx="6"
                          fill="#e2e8f0"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                      ) : p.isGain ? (
                        <rect
                          x={centerX - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={Math.max(barH, 6)}
                          rx="6"
                          fill="url(#gainGrad)"
                          filter="url(#gainShadow)"
                          className="transition-all duration-300"
                        />
                      ) : p.isLoss ? (
                        <rect
                          x={centerX - barWidth / 2}
                          y={baselineY}
                          width={barWidth}
                          height={Math.max(barH, 6)}
                          rx="6"
                          fill="url(#lossGrad)"
                          filter="url(#lossShadow)"
                          className="transition-all duration-300"
                        />
                      ) : (
                        /* Neutral 0g Bar */
                        <rect
                          x={centerX - barWidth / 2}
                          y={baselineY - 3}
                          width={barWidth}
                          height="6"
                          rx="3"
                          fill="#64748b"
                        />
                      )}

                      {/* Top / Bottom Delta Text Badge */}
                      <text
                        x={centerX}
                        y={p.isFirst ? baselineY - 18 : p.isGain ? barY - 8 : p.isLoss ? baselineY + barH + 16 : baselineY - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="900"
                        fill={p.isFirst ? '#64748b' : p.isGain ? '#059669' : p.isLoss ? '#e11d48' : '#475569'}
                      >
                        {p.isFirst ? 'Başlangıç' : p.isGain ? `+${p.diffGrams}g` : p.isLoss ? `${p.diffGrams}g` : '0g'}
                      </text>

                      {/* Touch Active Indicator Dot */}
                      <circle
                        cx={centerX}
                        cy={baselineY}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#0f172a' : '#ffffff'}
                        stroke={isSelected ? '#ffffff' : '#94a3b8'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    </g>
                  )
                })}
              </svg>

              {/* ── HTML X-Axis Date & Weight Labels (100% Mathematically Aligned) ── */}
              <div className="absolute bottom-0 left-0 w-full pointer-events-none">
                {points.map((p, i) => {
                  const centerX = getCenterX(i)
                  const leftPercent = (centerX / 1000) * 100
                  const isSelected = activeIndex === i

                  return (
                    <div
                      key={`lbl-${p.id}`}
                      className="absolute transform -translate-x-1/2 text-center transition-all"
                      style={{ left: `${leftPercent}%`, bottom: '2px' }}
                    >
                      <span className={`block text-[11px] font-black whitespace-nowrap ${isSelected ? 'text-amber-700 font-extrabold' : 'text-text-primary'}`}>
                        {p.dateLabel}
                      </span>
                      <span className={`block text-[10px] font-bold whitespace-nowrap ${isSelected ? 'text-text-primary font-black' : 'text-text-secondary/80'}`}>
                        {p.weightKg} kg
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* ── Hover Tooltip ── */}
              {hoveredIndex !== null && points[hoveredIndex] && (() => {
                const p = points[hoveredIndex]
                const centerX = getCenterX(hoveredIndex)
                const leftPercent = (centerX / 1000) * 100

                return (
                  <div
                    className="absolute pointer-events-none transition-all duration-200 z-30 flex flex-col items-center"
                    style={{
                      left: `${Math.max(12, Math.min(88, leftPercent))}%`,
                      top: '10px',
                      transform: 'translate(-50%, 0)'
                    }}
                  >
                    <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-2xl border border-slate-700 min-w-[160px] text-left text-[11px] space-y-1 animate-fadeIn backdrop-blur-md">
                      <div className="flex justify-between items-center border-b border-slate-700/80 pb-1 mb-1">
                        <span className="font-extrabold text-amber-400">{p.fullDateLabel}</span>
                        {!p.isFirst && p.daysPassed > 0 && (
                          <span className="text-[9px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                            {p.daysPassed} gün sonra
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-300">Ölçülen Kilo:</span>
                        <span className="font-extrabold text-white">{p.weightKg} kg</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-300">Değişim:</span>
                        <span className={`font-black text-[12px] ${
                          p.isFirst ? 'text-slate-400' : p.isGain ? 'text-emerald-400' : p.isLoss ? 'text-rose-400' : 'text-slate-300'
                        }`}>
                          {p.isFirst ? 'Başlangıç' : p.isGain ? `▲ +${p.diffGrams} gr` : p.isLoss ? `▼ ${p.diffGrams} gr` : '0 gr'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── Mobil Uyumlu Seçili Ölçüm Detay Kartı ── */}
          {activePoint && (
            <div className="mt-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-3 sm:p-3.5 shadow-md flex items-center justify-between flex-wrap gap-2 animate-fadeIn border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[20px] shrink-0 border border-white/10">
                  {activePoint.isGain ? '📈' : activePoint.isLoss ? '📉' : '⚖️'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-extrabold text-amber-400">
                      Ölçüm #{activePoint.index + 1}: {activePoint.fullDateLabel}
                    </span>
                    {!activePoint.isFirst && activePoint.daysPassed > 0 && (
                      <span className="text-[9px] font-bold bg-white/15 px-1.5 py-0.5 rounded text-slate-200">
                        {activePoint.daysPassed} gün sonra
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    {activePoint.isFirst
                      ? `İlk başlangıç ölçümü: ${activePoint.weightKg} kg`
                      : `Önceki ölçüme (${activePoint.prevWeightKg} kg) göre değişim`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right ml-auto sm:ml-0">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Ölçülen Kilo</span>
                  <span className="text-[14px] font-black text-white">{activePoint.weightKg} kg</span>
                </div>

                <div className="pl-3 border-l border-slate-700">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Gram Değişimi</span>
                  <span className={`text-[14px] font-black ${
                    activePoint.isFirst
                      ? 'text-slate-400'
                      : activePoint.isGain
                      ? 'text-emerald-400'
                      : activePoint.isLoss
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}>
                    {activePoint.isFirst ? 'Başlangıç' : activePoint.isGain ? `+${activePoint.diffGrams} gr` : `${activePoint.diffGrams} gr`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Bottom Info / Legend Bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-text-secondary border-t border-border-main/50 pt-2.5 px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Artan Gr (Kilo Alımı)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Eksilen Gr (Kilo Kaybı)
              </span>
            </div>

            <span className="text-[10px] text-text-secondary/70">
              * Grafikteki her nokta geçmiş ölçümler listenizdeki bir kayda denk gelir. Tıklayarak detayını inceleyebilirsiniz.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
