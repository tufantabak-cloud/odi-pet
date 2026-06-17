'use client'

import React, { useState, useMemo } from 'react'

interface GrowthRecord {
  id: string;
  recorded_at?: string;
  measured_at?: string;
  created_at?: string;
  weight_kg: number | null;
  height_cm: number | null;
  [key: string]: any;
}

interface MinimalGrowthChartProps {
  records: GrowthRecord[];
  onAddRecord?: () => void;
}

export default function MinimalGrowthChart({ records, onAddRecord }: MinimalGrowthChartProps) {
  const [activeTab, setActiveTab] = useState<'weight' | 'height'>('weight')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Sort chronologically (oldest first for left-to-right plotting)
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(a.recorded_at || a.measured_at || a.created_at || '').getTime() - new Date(b.recorded_at || b.measured_at || b.created_at || '').getTime())
  }, [records])

  // Filter out records that don't have the active tab's value
  const chartData = useMemo(() => {
    return sortedRecords.filter(r => activeTab === 'weight' ? r.weight_kg != null : r.height_cm != null)
  }, [sortedRecords, activeTab])

  const activeColor = activeTab === 'weight' ? '#0d9488' : '#8b5cf6' // Teal for weight, Violet for height
  const gradientId = `chartGrad_${activeTab}`

  const width = 300
  const height = 135
  const padding = { top: 30, right: 20, bottom: 35, left: 20 }
  
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const values = chartData.map(r => (activeTab === 'weight' ? Number(r.weight_kg) : Number(r.height_cm)))
  const minVal = values.length ? Math.min(...values) : 0
  const maxVal = values.length ? Math.max(...values) : 0
  
  const range = maxVal === minVal ? 1 : maxVal - minVal
  const yMin = Math.max(0, minVal - range * 0.1)
  const yMax = maxVal + range * 0.1
  const yRange = yMax - yMin

  const points = chartData.map((d, i) => {
    const val = activeTab === 'weight' ? Number(d.weight_kg) : Number(d.height_cm)
    const date = new Date(d.recorded_at || d.measured_at || d.created_at || '')
    
    let x = padding.left + innerWidth / 2
    if (chartData.length > 1) {
      const firstTime = new Date(chartData[0].recorded_at || chartData[0].measured_at || chartData[0].created_at || '').getTime()
      const lastTime = new Date(chartData[chartData.length - 1].recorded_at || chartData[chartData.length - 1].measured_at || chartData[chartData.length - 1].created_at || '').getTime()
      const timeDiff = lastTime - firstTime
      if (timeDiff > 0) {
        x = padding.left + ((date.getTime() - firstTime) / timeDiff) * innerWidth
      } else {
        x = padding.left + (i / (chartData.length - 1)) * innerWidth
      }
    }

    const y = padding.top + innerHeight - ((val - yMin) / yRange) * innerHeight
    return { x, y, val, date }
  })

  let linePath = ''
  let areaPath = ''

  if (points.length >= 2) {
    let path = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const cp1x = p0.x + (p1.x - p0.x) / 3
      const cp1y = p0.y
      const cp2x = p1.x - (p1.x - p0.x) / 3
      const cp2y = p1.y
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`
    }
    linePath = path
    areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`
  }

  return (
    <div className="card-base p-4 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex items-center justify-between z-10 relative">
        <h3 className="text-[14px] font-black text-text-primary flex items-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          Gelişim Takibi
        </h3>
        
        <div className="flex items-center gap-2">
          {onAddRecord && (
            <button 
              onClick={onAddRecord}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
              title="Kilo veya Boy Ekle"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Ekle
            </button>
          )}
          {/* Minimal Toggle */}
          <div className="flex bg-bg-main p-1 rounded-xl border border-border-main/50">
            <button 
              onClick={() => setActiveTab('weight')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'weight' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Kilo
            </button>
            <button 
              onClick={() => setActiveTab('height')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'height' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Boy
            </button>
          </div>
        </div>
      </div>

      {chartData.length < 2 ? (
        <div className="w-full aspect-[2.5/1] min-h-[120px] flex flex-col items-center justify-center text-center gap-2 bg-bg-main/30 rounded-xl border border-dashed border-border-main mt-2">
          <span className="text-[28px] opacity-50">{activeTab === 'weight' ? '⚖️' : '📏'}</span>
          <p className="text-[12px] font-bold text-text-secondary">Yeterli {activeTab === 'weight' ? 'kilo' : 'boy'} verisi bulunmuyor.<br/>Trendi görmek için en az 2 kayıt ekleyin.</p>
        </div>
      ) : (
        <>
          <div className="relative w-full aspect-[2.5/1] min-h-[120px] max-h-[160px] flex items-end justify-center mt-2">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full drop-shadow-sm overflow-visible" 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={activeColor} stopOpacity="0.0" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={activeColor} floodOpacity="0.15"/>
                </filter>
              </defs>

              <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
              <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={width - padding.right} y2={padding.top + innerHeight / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
              <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />

              <path d={areaPath} fill={`url(#${gradientId})`} className="transition-all duration-500 ease-in-out" />
              <path d={linePath} fill="none" stroke={activeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow)" className="transition-all duration-500 ease-in-out" />

              {points.map((p, i) => {
                const isHovered = hoveredIndex === i;
                return (
                  <g key={i} className="transition-transform" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                    <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4.5} fill="#ffffff" stroke={activeColor} strokeWidth={isHovered ? 3 : 2.5} className="transition-all duration-200" />
                    <circle cx={p.x} cy={p.y} r={20} fill="transparent" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onTouchStart={() => setHoveredIndex(i)} className="cursor-pointer outline-none" />
                  </g>
                )
              })}
            </svg>

            {points.map((p, i) => {
              if (points.length > 5 && i % Math.ceil(points.length / 4) !== 0 && i !== points.length - 1 && i !== 0) return null;
              return (
                <div key={`date-html-${i}`} className="absolute text-[10px] font-bold text-text-secondary/60 transform -translate-x-1/2 whitespace-nowrap transition-all duration-300" style={{ left: `${(p.x / width) * 100}%`, bottom: '2px' }}>
                  {p.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </div>
              )
            })}

            {hoveredIndex !== null && points[hoveredIndex] && (
              <div className="absolute pointer-events-none transition-all duration-200 z-20 flex flex-col items-center" style={{ left: `${(points[hoveredIndex].x / width) * 100}%`, top: `${(points[hoveredIndex].y / height) * 100}%`, transform: 'translate(-50%, -120%)' }}>
                <div className="bg-text-primary text-white text-[11px] font-bold py-1 px-2.5 rounded-lg shadow-xl relative animate-fade-in whitespace-nowrap">
                  {points[hoveredIndex].val} {activeTab === 'weight' ? 'kg' : 'cm'}
                  <div className="text-white/70 text-[9px] font-semibold text-center mt-0.5">{points[hoveredIndex].date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-text-primary rotate-45" />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {chartData.length > 0 && (
        <div className="flex justify-between items-center text-[12px] font-semibold text-text-secondary px-1 pt-1 mt-1 z-10 relative border-t border-border-main/40">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor: activeColor}}></span> Son Ölçüm:</span>
          <span className="font-extrabold text-text-primary">
            {activeTab === 'weight' ? `${points[points.length-1].val} kg` : `${points[points.length-1].val} cm`}
            <span className="text-[11px] font-normal text-text-secondary/70 ml-1.5">
              ({points[points.length-1].date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })})
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
