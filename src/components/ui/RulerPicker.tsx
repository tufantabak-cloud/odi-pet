'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'

export interface RulerPickerProps {
  value: number | string
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  label?: string
  sublabel?: string
  isOptional?: boolean
  presets?: number[]
  className?: string
  id?: string
}

export const RulerPicker: React.FC<RulerPickerProps> = ({
  value,
  onChange,
  min = 0.5,
  max = 100,
  step = 0.1,
  unit = 'kg',
  label,
  sublabel,
  isOptional = false,
  presets = [3, 5, 10, 15, 25],
  className = '',
  id,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isSelfScrolling = useRef(false)
  const isUserInteracting = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Mouse drag durumları (Masaüstü için)
  const isMouseDownRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftStartRef = useRef(0)

  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value || ''))

  const tickWidth = 14 // her çizgi arası piksel mesafesi
  const totalTicks = Math.round((max - min) / step)

  const numericValue = typeof value === 'number' ? value : parseFloat(value as string) || 0

  // Scroll pozisyonundan değere geçiş
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isSelfScrolling.current) return

    isUserInteracting.current = true

    const scrollLeft = scrollContainerRef.current.scrollLeft
    const tickIndex = Math.round(scrollLeft / tickWidth)
    const rawVal = min + tickIndex * step
    const clampedVal = Math.min(max, Math.max(min, rawVal))
    const formattedVal = parseFloat(clampedVal.toFixed(step < 1 ? 1 : 0))

    if (formattedVal !== numericValue) {
      onChange(formattedVal)
    }

    // Scroll hareketi bittiğinde etkileşimi sıfırla
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserInteracting.current = false
    }, 150)
  }, [min, max, step, tickWidth, numericValue, onChange])

  // Değer dışarıdan değiştiğinde cetveli kaydır
  const scrollToValue = useCallback(
    (targetVal: number, smooth = true) => {
      if (!scrollContainerRef.current) return

      const clamped = Math.min(max, Math.max(min, targetVal))
      const tickIndex = (clamped - min) / step
      const targetScrollLeft = tickIndex * tickWidth

      isSelfScrolling.current = true
      scrollContainerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: smooth ? 'smooth' : 'auto',
      })

      setTimeout(() => {
        isSelfScrolling.current = false
      }, smooth ? 300 : 50)
    },
    [min, max, step, tickWidth]
  )

  // Değer dışarıdan (veya butonlar/input ile) değiştiğinde cetveli konumlandır
  useEffect(() => {
    setInputValue(String(numericValue || ''))
    if (!isSelfScrolling.current && !isUserInteracting.current && !isMouseDownRef.current) {
      scrollToValue(numericValue, false)
    }
  }, [numericValue, scrollToValue])

  // İlk yüklemede cetveli konumlandır
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToValue(numericValue, false)
    }, 100)
    return () => {
      clearTimeout(timer)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Mouse Drag Etkileşimi (Masaüstü Kullanıcıları İçin)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return
    isMouseDownRef.current = true
    isUserInteracting.current = true
    startXRef.current = e.clientX
    scrollLeftStartRef.current = scrollContainerRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !scrollContainerRef.current) return
    e.preventDefault()
    const dx = e.clientX - startXRef.current
    scrollContainerRef.current.scrollLeft = scrollLeftStartRef.current - dx
  }

  const handleMouseUpOrLeave = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false
      setTimeout(() => {
        isUserInteracting.current = false
      }, 150)
    }
  }

  const handleInc = () => {
    const next = parseFloat(Math.min(max, numericValue + step).toFixed(step < 1 ? 1 : 0))
    onChange(next)
    scrollToValue(next, true)
  }

  const handleDec = () => {
    const prev = parseFloat(Math.max(min, numericValue - step).toFixed(step < 1 ? 1 : 0))
    onChange(prev)
    scrollToValue(prev, true)
  }

  const handlePresetClick = (presetVal: number) => {
    onChange(presetVal)
    scrollToValue(presetVal, true)
  }

  const handleInputBlur = () => {
    setIsEditing(false)
    let parsed = parseFloat(inputValue.replace(',', '.'))
    if (isNaN(parsed)) {
      setInputValue(String(numericValue))
      return
    }
    parsed = Math.min(max, Math.max(min, parsed))
    parsed = parseFloat(parsed.toFixed(step < 1 ? 1 : 0))
    onChange(parsed)
    scrollToValue(parsed, true)
  }

  return (
    <div className={`flex flex-col gap-3 w-full ${className}`}>
      {/* Etiket ve Opsiyonel Bilgisi */}
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-[13px] font-bold text-text-primary flex items-center gap-1.5">
            <span>{label}</span>
            {isOptional && <span className="text-[11px] font-normal text-text-secondary">(Opsiyonel)</span>}
          </label>
          {sublabel && <span className="text-[11px] font-medium text-text-secondary">{sublabel}</span>}
        </div>
      )}

      {/* Ana Cetvel Kartı */}
      <div className="card-base p-4 bg-gradient-to-b from-white to-slate-50/50 border border-border-main/80 shadow-sm rounded-sheet flex flex-col gap-3.5 select-none relative overflow-hidden">
        {/* Değer Göstergesi ve Ince Ayar Düğmeleri */}
        <div className="flex items-center justify-between px-2 pt-1">
          {/* Eksiltme Düğmesi */}
          <button
            type="button"
            onClick={handleDec}
            disabled={numericValue <= min}
            className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-primary-soft hover:text-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center font-extrabold text-slate-600 text-lg shadow-xs cursor-pointer"
            aria-label="Azalt"
          >
            -
          </button>

          {/* Sayısal Gösterge (Tıklanıp Düzenlenebilir) */}
          <div className="flex flex-col items-center justify-center cursor-pointer group" onClick={() => setIsEditing(true)}>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={step}
                  min={min}
                  max={max}
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
                  className="w-24 text-center text-[28px] font-black text-primary outline-none border-b-2 border-primary bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[16px] font-extrabold text-primary">{unit}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5 transition-transform group-hover:scale-105">
                <span className="text-[32px] font-black tracking-tight text-primary leading-none">
                  {numericValue > 0 ? numericValue : '--'}
                </span>
                <span className="text-base font-bold text-primary/80">{unit}</span>
                <span className="text-[11px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-1">✏️</span>
              </div>
            )}
            <span className="text-[10px] font-bold text-text-secondary/70 tracking-wider uppercase mt-0.5">
              {isEditing ? (
                'Tamamlamak için tıklayın'
              ) : (
                <>
                  <span className="inline md:hidden">DOKUN VE KAYDIR</span>
                  <span className="hidden md:inline">TIKLA VE SÜRÜKLE</span>
                </>
              )}
            </span>
          </div>

          {/* Artırma Düğmesi */}
          <button
            type="button"
            onClick={handleInc}
            disabled={numericValue >= max}
            className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-primary-soft hover:text-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center font-extrabold text-slate-600 text-lg shadow-xs cursor-pointer"
            aria-label="Artır"
          >
            +
          </button>
        </div>

        {/* Fiziksel Cetvel (Scrollable Measuring Tape) */}
        <div className="relative w-full h-[68px] my-1 flex items-center">
          {/* Tam Merkezdeki İbre / Indicator Line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center justify-between">
            {/* Üst Üçgen Ok */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />
            {/* Dikey Neon Çizgi */}
            <div className="w-[3px] h-[48px] bg-gradient-to-b from-primary via-indigo-600 to-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
            {/* Alt Üçgen Ok */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-primary" />
          </div>

          {/* Cetvel Scroll Alanı */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="w-full h-full overflow-x-auto no-scrollbar flex items-end cursor-grab active:cursor-grabbing touch-pan-x"
            style={{
              paddingLeft: 'calc(50% - 7px)',
              paddingRight: 'calc(50% - 7px)',
            }}
          >
            <div className="flex items-end h-[56px]" style={{ width: `${totalTicks * tickWidth + 14}px` }}>
              {Array.from({ length: totalTicks + 1 }).map((_, i) => {
                const tickVal = parseFloat((min + i * step).toFixed(step < 1 ? 1 : 0))
                const isMajor = step < 1 ? Math.abs((tickVal * 10) % 10) === 0 : tickVal % 5 === 0
                const isMedium = step < 1 ? Math.abs((tickVal * 10) % 5) === 0 && !isMajor : tickVal % 1 === 0 && !isMajor
                const isSelected = Math.abs(tickVal - numericValue) < step / 2

                return (
                  <div
                    key={i}
                    onClick={() => handlePresetClick(tickVal)}
                    className="flex flex-col items-center justify-end shrink-0 cursor-pointer group"
                    style={{ width: `${tickWidth}px` }}
                  >
                    {/* Çizgi Yüksekliği */}
                    <div
                      className={`w-[2px] rounded-full transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary h-[36px] w-[3px]'
                          : isMajor
                          ? 'bg-slate-400 h-[28px]'
                          : isMedium
                          ? 'bg-slate-300 h-[20px]'
                          : 'bg-slate-200 h-[12px]'
                      }`}
                    />

                    {/* Ana Değer Etiketi (Major Ticks) */}
                    <div className="h-[18px] flex items-center justify-center">
                      {isMajor ? (
                        <span
                          className={`text-[10px] font-bold ${
                            isSelected ? 'text-primary font-black scale-110' : 'text-slate-400'
                          }`}
                        >
                          {tickVal}
                        </span>
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-transparent" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Hızlı Seçim Rozetleri (Presets) */}
        {presets && presets.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-border-main/50 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-text-secondary mr-1 shrink-0">Hızlı Seç:</span>
            {presets.map((p) => {
              const isActive = numericValue === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/30 scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p} {unit}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
