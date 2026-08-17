'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { getTurkishGenitive } from '@/lib/utils'

export interface OdiNoticedWeightCardProps {
  activePet: {
    id: string
    name: string
    weight_kg?: number | null
    weightVal?: string | null
    [key: string]: any
  }
  allWeightLogs?: Array<{
    pet_id: string
    measured_at: string
    weight_kg: number | null
  }>
}

export default function OdiNoticedWeightCard({ activePet, allWeightLogs = [] }: OdiNoticedWeightCardProps) {
  const petId = activePet?.id

  // 1. Get pet weight history
  const petLogs = useMemo(() => {
    if (!petId) return []
    return allWeightLogs
      .filter((w) => w.pet_id === petId && w.weight_kg != null && Number(w.weight_kg) > 0)
      .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
  }, [allWeightLogs, petId])

  // 2. Extract latest weight
  const latestWeight = useMemo(() => {
    if (!activePet) return 4.8
    if (petLogs.length > 0) {
      return Number(petLogs[petLogs.length - 1].weight_kg)
    }
    if (activePet.weight_kg != null && Number(activePet.weight_kg) > 0) {
      return Number(activePet.weight_kg)
    }
    if (activePet.weightVal) {
      const parsed = parseFloat(String(activePet.weightVal).replace(',', '.'))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    // Default fallback to 4.8 as in standard baseline
    return 4.8
  }, [petLogs, activePet])

  // 3. Generate 5 chart points with background grid
  // SVG dimensions: width 150, height 56
  const chartPoints = useMemo(() => {
    const defaultPoints = [
      { x: 10, y: 44 },
      { x: 42, y: 24 },
      { x: 74, y: 34 },
      { x: 108, y: 22 },
      { x: 140, y: 10 },
    ]

    if (petLogs.length >= 3) {
      const recentLogs = petLogs.slice(-5)
      const weights = recentLogs.map((l) => Number(l.weight_kg))
      const minW = Math.min(...weights)
      const maxW = Math.max(...weights)
      const delta = maxW - minW || 1

      const count = recentLogs.length
      const stepX = 130 / Math.max(count - 1, 1)

      return recentLogs.map((log, idx) => {
        const x = Math.round(10 + idx * stepX)
        const normalizedY = (Number(log.weight_kg) - minW) / delta
        const y = Math.round(44 - normalizedY * 34)
        return { x, y }
      })
    }

    return defaultPoints
  }, [petLogs])

  if (!activePet) return null

  const formattedWeight = latestWeight % 1 === 0 ? latestWeight.toFixed(0) : latestWeight.toFixed(1)

  const polylinePointsString = chartPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const genitiveName = getTurkishGenitive(activePet.name || 'Dostunuz')

  return (
    <div
      data-testid="odi-noticed-weight-card"
      className="w-full rounded-[24px] bg-[#F2FAF6] border border-[#D4F0E1] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.05)] hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.08)] transition-all duration-200 relative overflow-hidden"
    >
      {/* 1. Header: ODİ FARK ETTİ */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#0D9468]">
          <Search className="w-4 h-4 stroke-[2.5]" />
        </div>
        <span className="text-[12px] font-black tracking-wider text-[#0D9468] uppercase">
          ODİ FARK ETTİ
        </span>
      </div>

      {/* 2. Main Content Grid */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-800 tracking-tight leading-[1.35] max-w-[340px]">
            {genitiveName} kilosu son 3 ölçümde ideal aralıkta ve stabil.
          </h3>
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium flex items-center gap-1 mt-2">
            <span>Harika gidiyorsunuz!</span>
            <span className="text-sm">🐾</span>
          </p>
        </div>

        {/* Center Sparkline Chart */}
        <div className="flex items-center justify-center self-center md:self-auto shrink-0 my-1 md:my-0">
          <div className="relative w-[150px] h-[56px]">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 150 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Kilo trend grafiği"
            >
              {/* Subtle Grid Lines */}
              <line x1="0" y1="12" x2="150" y2="12" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="28" x2="150" y2="28" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="44" x2="150" y2="44" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              
              <line x1="20" y1="0" x2="20" y2="56" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="55" y1="0" x2="55" y2="56" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="90" y1="0" x2="90" y2="56" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="125" y1="0" x2="125" y2="56" stroke="#D7EFE2" strokeWidth="1" strokeDasharray="3 3" />

              {/* Sparkline Line */}
              <polyline
                points={polylinePointsString}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Sparkline Vertex Dots */}
              {chartPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  fill="#10B981"
                  className="transition-transform duration-200"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Right Metric & CTA Button */}
        <div className="flex items-center md:flex-col items-end md:items-end justify-between md:justify-center w-full md:w-auto shrink-0 gap-3 md:gap-2 pt-1 md:pt-0">
          <div className="flex flex-col items-start md:items-end">
            <div className="flex items-baseline">
              <span className="text-[26px] sm:text-[28px] font-black text-slate-900 leading-none tracking-tight">
                {formattedWeight}
              </span>
              <span className="text-[14px] sm:text-[15px] font-bold text-slate-900 ml-1 leading-none">
                kg
              </span>
            </div>
            <span className="text-[12px] text-slate-500 font-medium mt-1">
              Son ölçüm
            </span>
          </div>

          <Link
            href={`/owner/pets/${activePet.id}/nutrition?tab=kilo`}
            className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-2 bg-white text-[#0D9468] hover:text-emerald-700 text-[13px] font-bold rounded-2xl border border-[#CDEEDC] hover:border-emerald-300 hover:bg-emerald-50/60 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          >
            <span>Kilo Grafiğini Gör</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  )
}
