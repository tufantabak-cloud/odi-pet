'use client'

import React, { useMemo, useState } from 'react'

interface Props {
  species?: string
  birthDate?: string
  weightKg?: number
  petName: string
}

export default function HumanAgeCalculator({ species, birthDate, weightKg, petName }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const isDog = species === 'Köpek' || species === 'dog'
  const isCat = species === 'Kedi' || species === 'cat'

  const exactYears = useMemo(() => {
    if (!birthDate) return 0
    const bd = new Date(birthDate)
    const now = new Date()
    return (now.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  }, [birthDate])

  const ageYear = Math.max(1, Math.floor(exactYears))
  const displayYear = Math.min(15, ageYear)

  const getCatAge = (y: number) => {
    const data = [7, 13, 20, 26, 33, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76]
    return y <= 15 ? data[y - 1] : data[14] + (y - 15) * 4
  }

  const getDogAge = (y: number, w: number) => {
    if (w < 20) {
      const data = [7, 13, 20, 26, 33, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76]
      return y <= 15 ? data[y - 1] : data[14] + (y - 15) * 4
    } else if (w < 50) {
      const data = [7, 14, 21, 27, 34, 42, 47, 51, 56, 60, 65, 69, 74, 78, 83]
      return y <= 15 ? data[y - 1] : data[14] + (y - 15) * 5
    } else if (w < 90) {
      const data = [8, 16, 24, 31, 38, 45, 50, 55, 61, 66, 72, 77, 82, 88, 93]
      return y <= 15 ? data[y - 1] : data[14] + (y - 15) * 6
    } else {
      const data = [9, 18, 26, 34, 41, 49, 56, 64, 71, 78, 86, 93, 101, 108, 115]
      return y <= 15 ? data[y - 1] : data[14] + (y - 15) * 7
    }
  }

  const w = weightKg || 10 // default small/cat
  const humanAge = isCat ? getCatAge(displayYear) : getDogAge(displayYear, w)

  const getLifeStage = (y: number) => {
    if (y <= 1) return { label: 'Yavru', color: 'bg-stone-100 text-stone-700', border: 'border-stone-200' }
    if (y <= 7) return { label: 'Yetişkin', color: 'bg-[#6a2b86] text-white', border: 'border-[#5b2473]' }
    if (y <= 12) return { label: 'Yaşlı', color: 'bg-[#00c814] text-white', border: 'border-[#00a811]' }
    return { label: 'Yaşlı (12+)', color: 'bg-[#ff9914] text-white', border: 'border-[#d98211]' }
  }

  const currentStage = getLifeStage(displayYear)

  if (!isCat && !isDog) return null

  // Generate table rows (1 to 15)
  const rows = Array.from({ length: 15 }, (_, i) => i + 1)

  return (
    <div className="card-base p-0 overflow-hidden flex flex-col bg-white">
      {/* Header section */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-border-main relative overflow-hidden focus:outline-none transition-all hover:opacity-95"
      >
        <div className="absolute top-4 right-4 text-text-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 text-center flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-border-main flex items-center justify-center text-[28px] mb-1">
            ⏳
          </div>
          <h3 className="text-[14px] font-bold text-text-secondary uppercase tracking-widest">
            {petName} İnsan Olsaydı...
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-[42px] font-black text-primary leading-none">{humanAge}</span>
            <span className="text-[18px] font-extrabold text-text-secondary">Yaşında Olurdu</span>
          </div>
          <div className={`mt-2 px-4 py-1.5 rounded-full font-bold text-[12px] uppercase tracking-wide border shadow-sm ${currentStage.color} ${currentStage.border}`}>
            {currentStage.label} Dönemi
          </div>
        </div>
      </button>

      {/* Table section */}
      {isOpen && (
        <div className="animate-fadeInDown origin-top">
          <div className="p-5 overflow-x-auto scrollbar-hide">
        <div className="min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-black text-text-primary">Yaş Çevrim Tablosu</h4>
            <span className="text-[11px] font-bold text-text-secondary px-2 py-1 bg-bg-main rounded-lg">
              {isCat ? 'Kedi' : `Köpek (${w} kg)`}
            </span>
          </div>
          
          <div className="grid grid-cols-2 text-center text-[11px] font-black uppercase text-text-secondary border-b-2 border-border-main pb-2">
            <div className="text-left pl-2">Gerçek Yaş</div>
            <div className="text-right pr-2">İnsan Yaşı</div>
          </div>
          
          <div className="flex flex-col mt-2 gap-1 relative">
            {rows.map(y => {
              const isCurrent = y === displayYear
              const ageVal = isCat ? getCatAge(y) : getDogAge(y, w)
              const stage = getLifeStage(y)
              
              return (
                <div 
                  key={y}
                  className={`grid grid-cols-2 items-center py-2 px-2 rounded-xl border-2 transition-all duration-300 ${
                    isCurrent 
                      ? 'border-primary bg-primary/5 scale-[1.02] shadow-sm z-10' 
                      : 'border-transparent hover:bg-bg-main'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className={`text-[14px] font-extrabold w-6 ${isCurrent ? 'text-primary' : 'text-text-primary'}`}>{y}</span>
                    {!isCurrent && (
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]} shadow-sm`}></div>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-white px-1.5 py-0.5 rounded shadow-sm">
                        ŞU AN
                      </span>
                    )}
                  </div>
                  <div className={`text-right pr-2 text-[15px] font-black ${isCurrent ? 'text-primary' : 'text-text-secondary'}`}>
                    {ageVal}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
          <div className="p-4 bg-bg-main/50 border-t border-border-main flex flex-wrap justify-center gap-3">
            {[1, 4, 10, 15].map(y => {
              const stage = getLifeStage(y)
              return (
                <div key={y} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${stage.color.split(' ')[0]} shadow-sm`}></div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">{stage.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
