'use client'

import React from 'react'
import { getBreedHealthInfo } from '@/lib/pets/breed_health_info'

interface Props {
  petName: string
  breed: string | undefined | null
}

export default function BreedHealthCard({ petName, breed }: Props) {
  const healthInfo = getBreedHealthInfo(breed)

  if (!healthInfo) return null

  return (
    <div className="card-base p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-4 -right-4 text-[64px] opacity-5">🧬</div>
      
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-[20px] shrink-0">
          🧬
        </div>
        <div>
          <h3 className="text-[13px] font-black text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            Irka Özel Sağlık Rehberi
            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
              {healthInfo.breed}
            </span>
          </h3>
          
          <p className="text-[13px] font-medium text-text-secondary leading-relaxed mb-3">
            <span className="font-bold text-indigo-800">{healthInfo.breed}</span>'lar için dikkat: 
            <span className="font-semibold text-text-primary"> {healthInfo.risks.join(', ')} </span> 
            yaygındır. Düzenli veteriner kontrolünü aksatmayın.
          </p>
          
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-50 text-[12px] text-text-secondary leading-relaxed italic border-l-2 border-l-indigo-300 shadow-sm">
            "{healthInfo.description}"
          </div>
          
          <div className="mt-3 text-[10px] text-indigo-400 font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Bu bilgiler tanı amacı taşımaz, AKC vb. kaynaklara dayalı genel bilgilendirmedir.
          </div>
        </div>
      </div>
    </div>
  )
}
