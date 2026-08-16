'use client'

import React, { useEffect, useState } from 'react'
import { Bone, Pill } from 'lucide-react'
import { BowlIcon } from '@/components/icons/PetIcons'

interface RoutineStatsGridProps {
  petId: string
}

interface StatsData {
  nutrition: { count: number; grams: number }
  activity: { minutes: number }
  medicine: { doses: number }
}

export default function RoutineStatsGrid({ petId }: RoutineStatsGridProps) {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchStats() {
      try {
        const res = await fetch(`/api/pets/${petId}/stats`)
        if (res.ok) {
          const json = await res.json()
          if (mounted) {
            setData(json)
            setLoading(false)
          }
        } else {
          if (mounted) {
            setData({ nutrition: { count: 0, grams: 0 }, activity: { minutes: 0 }, medicine: { doses: 0 } })
            setLoading(false)
          }
        }
      } catch (e) {
        if (mounted) {
          setData({ nutrition: { count: 0, grams: 0 }, activity: { minutes: 0 }, medicine: { doses: 0 } })
          setLoading(false)
        }
      }
    }
    fetchStats()
    return () => { mounted = false }
  }, [petId])

  if (loading) {
    return (
      <div className="flex overflow-x-auto gap-4 hide-scrollbar snap-x px-4 mt-4 pb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[140px] flex-shrink-0 h-24 rounded-[24px] bg-slate-100 animate-pulse snap-center" />
        ))}
      </div>
    )
  }

  const stats = data || { nutrition: { count: 0, grams: 0 }, activity: { minutes: 0 }, medicine: { doses: 0 } }

  return (
    <div className="flex overflow-x-auto gap-4 hide-scrollbar snap-x px-4 mt-4 pb-4">
      {/* Beslenme Kartı */}
      <div className="min-w-[140px] flex-shrink-0 rounded-[24px] p-4 snap-center bg-gradient-to-br from-orange-100 to-amber-50 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] border border-white/40 backdrop-blur-md active:scale-[0.98] transition-all duration-200 ease-out">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-200/50 flex items-center justify-center text-orange-600">
            <BowlIcon width={16} height={16} />
          </div>
          <span className="text-xs font-semibold text-orange-900">Beslenme</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-orange-950">{stats.nutrition.grams}g</span>
          <span className="text-[10px] text-orange-700 font-medium">{stats.nutrition.count} öğün (Son 7 gün)</span>
        </div>
      </div>

      {/* Aktivite Kartı */}
      <div className="min-w-[140px] flex-shrink-0 rounded-[24px] p-4 snap-center bg-gradient-to-br from-green-100 to-lime-50 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] border border-white/40 backdrop-blur-md active:scale-[0.98] transition-all duration-200 ease-out">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-green-200/50 flex items-center justify-center text-green-600">
            <Bone className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-green-900">Aktivite</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-green-950">{stats.activity.minutes} dk</span>
          <span className="text-[10px] text-green-700 font-medium">Toplam (Son 7 gün)</span>
        </div>
      </div>

      {/* İlaç & Bakım Kartı */}
      <div className="min-w-[140px] flex-shrink-0 rounded-[24px] p-4 snap-center bg-gradient-to-br from-purple-100 to-fuchsia-50 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] border border-white/40 backdrop-blur-md active:scale-[0.98] transition-all duration-200 ease-out">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-purple-200/50 flex items-center justify-center text-purple-600">
            <Pill className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-purple-900">İlaç & Bakım</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-purple-950">{stats.medicine.doses} doz</span>
          <span className="text-[10px] text-purple-700 font-medium">Kullanım (Son 7 gün)</span>
        </div>
      </div>
    </div>
  )
}
