'use client'

import { useState, useEffect } from 'react'
import { Crown, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  premiumUntil: string | null
}

export default function ProCountdownCard({ premiumUntil }: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isInfinite: boolean
    isExpired: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isInfinite: false,
    isExpired: true,
  })

  useEffect(() => {
    if (!premiumUntil) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isInfinite: false, isExpired: true })
      return
    }

    const calculate = () => {
      const until = new Date(premiumUntil).getTime()
      const now = Date.now()
      const diffMs = until - now

      if (diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isInfinite: false, isExpired: true })
        return
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

      const isInfinite = days >= 3650

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isInfinite,
        isExpired: false,
      })
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [premiumUntil])

  if (!premiumUntil || timeLeft.isExpired) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Abonelik Durumu: Standart (Free)</span>
          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Aktif Pro Yok
          </span>
        </div>
        <div className="text-2xs text-slate-500">Kullanıcının aktif Pro abonelik süresi bulunmuyor.</div>
      </div>
    )
  }

  if (timeLeft.isInfinite) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
            Odi Pro (Sonsuz ♾️)
          </span>
          <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
            Ömür Boyu Kredi
          </span>
        </div>
        <div className="text-2xs text-amber-800 font-medium">
          Bu kullanıcıya sınırsız/sonsuz Pro erişimi tanımlanmıştır (Bitiş: 2099 Süresiz).
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/90 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
          Odi Pro Aktif
        </span>
        <span className="text-2xs font-black text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-700" />
          {timeLeft.days} Gün Kaldı
        </span>
      </div>

      {/* Live Countdown Timer */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-white/90 border border-amber-200 rounded-xl p-1.5">
          <span className="text-sm font-black text-amber-900 block leading-none">{timeLeft.days}</span>
          <span className="text-3xs font-bold text-amber-700 uppercase">Gün</span>
        </div>
        <div className="bg-white/90 border border-amber-200 rounded-xl p-1.5">
          <span className="text-sm font-black text-amber-900 block leading-none">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-3xs font-bold text-amber-700 uppercase">Saat</span>
        </div>
        <div className="bg-white/90 border border-amber-200 rounded-xl p-1.5">
          <span className="text-sm font-black text-amber-900 block leading-none">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-3xs font-bold text-amber-700 uppercase">Dakika</span>
        </div>
        <div className="bg-white/90 border border-amber-200 rounded-xl p-1.5">
          <span className="text-sm font-black text-amber-900 block leading-none">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-3xs font-bold text-amber-700 uppercase">Saniye</span>
        </div>
      </div>

      <div className="text-3xs font-semibold text-amber-800 flex items-center gap-1">
        <Calendar className="w-3 h-3 text-amber-600" />
        <span>Bitiş Tarihi: {new Date(premiumUntil).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
