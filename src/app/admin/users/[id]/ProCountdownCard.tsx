'use client'

import { useState, useEffect } from 'react'
import { Crown, Clock, Calendar, Sparkles } from 'lucide-react'

interface Props {
  premiumUntil: string | null
  aiPlusUntil?: string | null
  proUntil?: string | null
  plan?: string | null
}

export default function ProCountdownCard({ premiumUntil, aiPlusUntil, proUntil, plan }: Props) {
  const targetUntil = aiPlusUntil || proUntil || premiumUntil

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
    if (!targetUntil) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isInfinite: false, isExpired: true })
      return
    }

    const calculate = () => {
      const until = new Date(targetUntil).getTime()
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
  }, [targetUntil])

  const isAiPlus = (plan === 'ai_plus' || !!aiPlusUntil) && !timeLeft.isExpired

  if (!targetUntil || timeLeft.isExpired) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Abonelik Durumu: Standart (Free)</span>
          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Aktif Abonelik Yok
          </span>
        </div>
        <div className="text-2xs text-slate-500">Kullanıcının aktif Pro / AI+ abonelik süresi bulunmuyor.</div>
      </div>
    )
  }

  if (timeLeft.isInfinite) {
    return (
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-300 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600 fill-purple-400" />
            Odi Pro & AI+ (Sonsuz ♾️)
          </span>
          <span className="text-xs font-black text-purple-900 bg-purple-200/80 px-2.5 py-0.5 rounded-full border border-purple-300">
            Ömür Boyu Kredi
          </span>
        </div>
        <div className="text-2xs text-purple-800 font-medium">
          Bu kullanıcıya sınırsız/sonsuz Pro & AI+ erişimi tanımlanmıştır (Bitiş: 2099 Süresiz).
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-2xl border space-y-3 shadow-xs ${
      isAiPlus
        ? 'bg-gradient-to-br from-purple-50 to-indigo-50/50 border-purple-200/90'
        : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/90'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-black flex items-center gap-1.5 ${isAiPlus ? 'text-purple-900' : 'text-amber-900'}`}>
          {isAiPlus ? <Sparkles className="w-4 h-4 text-purple-600 fill-purple-400" /> : <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />}
          {isAiPlus ? 'Odi AI+ Aktif (Kalan AI+ Süresi)' : 'Odi Pro Aktif'}
        </span>
        <span className={`text-2xs font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
          isAiPlus
            ? 'text-purple-900 bg-purple-200/70 border-purple-300'
            : 'text-amber-900 bg-amber-200/70 border-amber-300'
        }`}>
          <Clock className="w-3 h-3" />
          {timeLeft.days} Gün Kaldı
        </span>
      </div>

      {/* Live Countdown Timer */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className={`border rounded-xl p-1.5 ${isAiPlus ? 'bg-white/90 border-purple-200' : 'bg-white/90 border-amber-200'}`}>
          <span className={`text-sm font-black block leading-none ${isAiPlus ? 'text-purple-900' : 'text-amber-900'}`}>{timeLeft.days}</span>
          <span className={`text-3xs font-bold uppercase ${isAiPlus ? 'text-purple-700' : 'text-amber-700'}`}>Gün</span>
        </div>
        <div className={`border rounded-xl p-1.5 ${isAiPlus ? 'bg-white/90 border-purple-200' : 'bg-white/90 border-amber-200'}`}>
          <span className={`text-sm font-black block leading-none ${isAiPlus ? 'text-purple-900' : 'text-amber-900'}`}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className={`text-3xs font-bold uppercase ${isAiPlus ? 'text-purple-700' : 'text-amber-700'}`}>Saat</span>
        </div>
        <div className={`border rounded-xl p-1.5 ${isAiPlus ? 'bg-white/90 border-purple-200' : 'bg-white/90 border-amber-200'}`}>
          <span className={`text-sm font-black block leading-none ${isAiPlus ? 'text-purple-900' : 'text-amber-900'}`}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className={`text-3xs font-bold uppercase ${isAiPlus ? 'text-purple-700' : 'text-amber-700'}`}>Dakika</span>
        </div>
        <div className={`border rounded-xl p-1.5 ${isAiPlus ? 'bg-white/90 border-purple-200' : 'bg-white/90 border-amber-200'}`}>
          <span className={`text-sm font-black block leading-none ${isAiPlus ? 'text-purple-900' : 'text-amber-900'}`}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className={`text-3xs font-bold uppercase ${isAiPlus ? 'text-purple-700' : 'text-amber-700'}`}>Saniye</span>
        </div>
      </div>

      <div className={`text-3xs font-semibold flex items-center gap-1 ${isAiPlus ? 'text-purple-800' : 'text-amber-800'}`}>
        <Calendar className="w-3 h-3" />
        <span>Bitiş Tarihi: {new Date(targetUntil).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
