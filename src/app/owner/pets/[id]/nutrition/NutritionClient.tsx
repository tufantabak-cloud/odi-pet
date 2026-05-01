'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculateRefillRisk, generateInsights, computeWeightTrend } from '@/lib/nutrition/refill-engine'
import { trackEvent } from '@/lib/analytics/track'
import { qualifiesForMarketplaceBeta } from '@/lib/nutrition/marketplace-gate'

// Tabs
const TABS = ['Genel Bakış', 'Beslenme Günlüğü', 'Kilo Takibi', 'Stok & Refill', 'Analizler'] as const
type Tab = typeof TABS[number]

export default function NutritionClient({
  pet,
  profile,
  inventory,
  feedingLogs,
  weightLogs,
}: {
  pet: { id: string; name: string; avatar_url: string | null }
  profile: Record<string, unknown> | null
  inventory: Record<string, unknown> | null
  feedingLogs: Record<string, unknown>[]
  weightLogs: Record<string, unknown>[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Genel Bakış')
  const [showPlanner, setShowPlanner] = useState(false)
  const [hasReminder, setHasReminder] = useState(false)
  const [reminderData, setReminderData] = useState<{ enabled: boolean, snoozedUntil?: number, risk: string } | null>(null)
  const [betaDismissed, setBetaDismissed] = useState(false)
  
  useEffect(() => {
    const r = localStorage.getItem(`odi_refill_reminder_${pet.id}`)
    if (r) {
      try {
        const parsed = JSON.parse(r)
        if (parsed.enabled) {
          setHasReminder(true)
          setReminderData(parsed)
        }
      } catch (e) {}
    }
    
    if (localStorage.getItem(`odi_marketplace_beta_dismissed_${pet.id}`)) {
      setBetaDismissed(true)
    }
  }, [pet.id])
  
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Engine Calcs
  const dailyUsage = (inventory?.estimated_daily_usage as number) ?? 0;
  const refillStatus = calculateRefillRisk({
    stockGrams: (inventory?.current_stock_grams as number) ?? 0,
    dailyUsage,
  })

  const hasUsage = dailyUsage > 0;
  const showBanner = hasUsage && (refillStatus.risk === 'WARNING' || refillStatus.risk === 'CRITICAL');
  const bannerClass = refillStatus.risk === 'CRITICAL' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-orange-50 border-orange-500 text-orange-800';
  const badgeClass = refillStatus.risk === 'CRITICAL' ? 'text-red-500' : refillStatus.risk === 'WARNING' ? 'text-orange-500' : 'text-green-500';
  const riskLabel = hasUsage ? `${refillStatus.daysLeft} gün kaldı` : 'Takip Yok';

  // Pre-calculate current time outside of the useMemo so it doesn't trigger the react-hooks/purity rule 
  // (though technically `Date.now()` is completely fine in `useMemo` since it has no side-effects other than reading time).
  const [now] = useState(() => Date.now())

  const { avgAppetite7d, avgAppetite14d } = React.useMemo(() => {
    const last7d = now - 7 * 86400000
    const last14d = now - 14 * 86400000

    const logs7d = feedingLogs.filter(l => new Date(l.meal_time as string).getTime() >= last7d)
    const logs14d = feedingLogs.filter(l => {
      const t = new Date(l.meal_time as string).getTime()
      return t >= last14d && t < last7d
    })

    const avg7 = logs7d.reduce((acc, l) => acc + ((l.appetite_score as number) ?? 0), 0) / 
      (logs7d.filter(l => l.appetite_score).length || 1)

    const avg14 = logs14d.reduce((acc, l) => acc + ((l.appetite_score as number) ?? 0), 0) / 
      (logs14d.filter(l => l.appetite_score).length || 1)

    return { avgAppetite7d: avg7, avgAppetite14d: avg14 }
  }, [feedingLogs, now])

  const weightTrend = computeWeightTrend(weightLogs)
  
  const insights = generateInsights({
    avgAppetite7d: isNaN(avgAppetite7d) ? null : avgAppetite7d,
    avgAppetite14d: isNaN(avgAppetite14d) ? null : avgAppetite14d,
    weightTrend,
    daysLeft: hasUsage && refillStatus.risk !== 'OK' ? refillStatus.daysLeft : null,
  })

  // Analytics tracking guard for Refill Risk
  const riskTrackedRef = useRef(false)
  useEffect(() => {
    if (showBanner && !riskTrackedRef.current) {
      trackEvent('refill_risk_triggered', {
        petId: pet.id,
        risk: refillStatus.risk,
        daysLeft: refillStatus.daysLeft
      });
      riskTrackedRef.current = true;
    }
  }, [showBanner, refillStatus.risk, refillStatus.daysLeft, pet.id]);

  // Analytics tracking guard for Escalation
  const escalatedTrackedRef = useRef(false)
  useEffect(() => {
    if (hasReminder && refillStatus.risk === 'CRITICAL' && !escalatedTrackedRef.current) {
      trackEvent('refill_reminder_escalated', { petId: pet.id })
      escalatedTrackedRef.current = true
    }
  }, [hasReminder, refillStatus.risk, pet.id])

  const showReminderBanner = (() => {
    if (!hasReminder || !reminderData) return false
    if (refillStatus.risk === 'CRITICAL') return true
    if (refillStatus.risk === 'WARNING') {
      if (reminderData.snoozedUntil && Date.now() < reminderData.snoozedUntil) return false
      return true
    }
    return false
  })()

  const isBetaEligible = qualifiesForMarketplaceBeta({
    reminderRequested: hasReminder,
    snoozed: !!reminderData?.snoozedUntil,
    escalated: hasReminder && refillStatus.risk === 'CRITICAL',
    dismissed: betaDismissed
  })

  // Analytics tracking guard for Marketplace Beta Eligible
  const betaTrackedRef = useRef(false)
  useEffect(() => {
    if (isBetaEligible && activeTab === 'Genel Bakış' && !betaTrackedRef.current) {
      trackEvent('marketplace_beta_eligible', { petId: pet.id })
      betaTrackedRef.current = true
    }
  }, [isBetaEligible, activeTab, pet.id])

  // Handlers
  function handleSnoozeReminder() {
    trackEvent('refill_reminder_snoozed', { petId: pet.id, risk: refillStatus.risk })
    const updated = { ...reminderData, enabled: true, risk: reminderData?.risk || refillStatus.risk, snoozedUntil: Date.now() + 24 * 60 * 60 * 1000 }
    localStorage.setItem(`odi_refill_reminder_${pet.id}`, JSON.stringify(updated))
    setReminderData(updated as any)
  }

  function handleDismissReminder() {
    trackEvent('refill_reminder_dismissed', { petId: pet.id, risk: refillStatus.risk })
    localStorage.removeItem(`odi_refill_reminder_${pet.id}`)
    setHasReminder(false)
    setReminderData(null)
  }

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFormError('')
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_brand: fd.get('food_brand'),
          food_product: fd.get('food_product'),
          food_type: fd.get('food_type'),
          daily_grams: fd.get('daily_grams'),
          meals_per_day: fd.get('meals_per_day'),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      
      trackEvent('nutrition_profile_created', {
        petId: pet.id,
        foodType: fd.get('food_type'),
        dailyGrams: Number(fd.get('daily_grams'))
      })
      
      router.refresh()
    } catch (err: unknown) {
      setFormError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await fetch(`/api/pets/${pet.id}/nutrition/feeding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_grams: fd.get('amount_grams'),
          appetite_score: fd.get('appetite_score'),
          notes: fd.get('notes'),
        }),
      })
      
      trackEvent('feeding_logged', {
        petId: pet.id,
        amountGrams: Number(fd.get('amount_grams')),
        appetiteScore: Number(fd.get('appetite_score'))
      })

      e.currentTarget.reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWeight(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await fetch(`/api/pets/${pet.id}/nutrition/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: fd.get('weight_kg'),
          body_condition_score: fd.get('body_condition_score'),
        }),
      })

      trackEvent('weight_logged', {
        petId: pet.id,
        weightKg: Number(fd.get('weight_kg')),
        bodyConditionScore: fd.get('body_condition_score') ? Number(fd.get('body_condition_score')) : null
      })

      e.currentTarget.reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateInventory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await fetch(`/api/pets/${pet.id}/nutrition/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stock_grams: fd.get('current_stock_grams'),
          estimated_daily_usage: fd.get('estimated_daily_usage'),
        }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20 w-full max-w-3xl mx-auto">
      {/* Header */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profile Dön
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[28px]">🐾</span>}
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Beslenme & Sağlık</h1>
          <p className="text-text-secondary font-medium">{pet.name} için kişiselleştirilmiş program</p>
        </div>
      </div>

      {showBanner && !showReminderBanner && (
        <div className={`p-4 rounded-xl border-l-4 font-medium text-[14px] ${bannerClass}`}>
          <div className="flex items-center justify-between">
            <span>🚨 Dikkat: Mama stoğunuz kritik seviyede! ({riskLabel})</span>
            <button 
              onClick={() => {
                trackEvent('refill_cta_clicked', { petId: pet.id, risk: refillStatus.risk, daysLeft: refillStatus.daysLeft });
                trackEvent('refill_planner_opened', { petId: pet.id, risk: refillStatus.risk });
                setShowPlanner(true);
              }} 
              className="font-bold underline px-2 py-1 hover:bg-black/5 rounded-md transition-colors"
            >
              {refillStatus.risk === 'CRITICAL' ? 'Şimdi Refill Planla' : 'Refill Planla'}
            </button>
          </div>
        </div>
      )}

      {showReminderBanner && (
        <div className={`p-5 rounded-xl border-2 shadow-sm font-medium animate-fadeIn ${
          refillStatus.risk === 'CRITICAL' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-[20px] leading-tight">{refillStatus.risk === 'CRITICAL' ? '🚨' : '⏳'}</span>
              <div>
                <h3 className={`font-bold text-[14px] ${refillStatus.risk === 'CRITICAL' ? 'text-red-900' : 'text-orange-900'}`}>
                  {refillStatus.risk === 'CRITICAL' ? 'Mama 3 günden az kaldı. Refill önerilir.' : 'Mama stoğu azalıyor. Refill zamanı yaklaşıyor.'}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-8">
              <button 
                onClick={handleSnoozeReminder}
                className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${
                  refillStatus.risk === 'CRITICAL' ? 'bg-red-100 hover:bg-red-200 text-red-800' : 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                }`}
              >
                Daha Sonra Hatırlat
              </button>
              <button 
                onClick={handleDismissReminder}
                className={`text-[12px] font-bold underline hover:no-underline ${
                  refillStatus.risk === 'CRITICAL' ? 'text-red-700/70' : 'text-orange-700/70'
                }`}
              >
                Tamam, Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main overflow-x-auto hide-scrollbar">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'Genel Bakış' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          
          {isBetaEligible && (
            <div className="card-base p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm relative overflow-hidden">
              <div className="absolute -right-6 -top-6 text-[80px] opacity-10 pointer-events-none">🎁</div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px]">🎁</span>
                <h3 className="text-[16px] font-black text-indigo-900 tracking-tight">Mama Sipariş Beta Erişimi</h3>
              </div>
              <p className="text-[13px] text-indigo-800/80 mb-5 font-medium pr-8">
                Refill ihtiyaçlarını erkenden fark ettiğin için beta erişimi kazandın. Özel fırsatları hemen incele!
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    trackEvent('marketplace_beta_clicked', { petId: pet.id })
                    const qs = new URLSearchParams({
                      petId: pet.id,
                      risk: refillStatus.risk,
                      brand: profile?.food_brand ? String(profile.food_brand) : '',
                      product: profile?.food_product ? String(profile.food_product) : ''
                    }).toString()
                    router.push('/marketplace-beta?' + qs)
                  }}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-[13px] rounded-xl shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 transition-colors"
                >
                  Beta'yı Keşfet
                </button>
                <button 
                  onClick={() => {
                    trackEvent('marketplace_beta_dismissed', { petId: pet.id })
                    localStorage.setItem(`odi_marketplace_beta_dismissed_${pet.id}`, 'true')
                    setBetaDismissed(true)
                  }}
                  className="px-4 py-2.5 text-indigo-700 font-bold text-[13px] hover:bg-indigo-100 rounded-xl transition-colors"
                >
                  Daha Sonra
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="card-base p-5">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Mevcut Mama</p>
              <p className="font-bold text-text-primary text-[16px]">{profile?.food_brand || 'Belirtilmemiş'}</p>
              <p className="text-[12px] text-text-secondary">{profile?.food_product}</p>
            </div>
            <div className="card-base p-5 relative overflow-hidden">
              {hasReminder && (
                <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-orange-200">
                  🔔 Refill Hatırlatıcı Aktif
                </div>
              )}
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Günlük Tüketim</p>
              <p className="font-black text-primary text-[24px]">{profile?.daily_grams ? `${profile.daily_grams}g` : '—'}</p>
              <p className="text-[12px] text-text-secondary">{profile?.meals_per_day ? `${profile.meals_per_day} Öğün` : ''}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="card-base p-6 flex flex-col gap-4">
            <h3 className="font-bold text-text-primary">Profil Güncelle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Marka</label>
                <input name="food_brand" defaultValue={profile?.food_brand || ''} className="input-base" placeholder="Örn: Royal Canin"/>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Ürün</label>
                <input name="food_product" defaultValue={profile?.food_product || ''} className="input-base" placeholder="Örn: Sterilised 37"/>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Tür</label>
                <select name="food_type" defaultValue={profile?.food_type || 'dry'} className="input-base">
                  <option value="dry">Kuru</option>
                  <option value="wet">Yaş</option>
                  <option value="raw">Çiğ/BARF</option>
                  <option value="mixed">Karışık</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Günlük Gram</label>
                <input name="daily_grams" type="number" defaultValue={profile?.daily_grams || ''} className="input-base"/>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-2">Kaydet</button>
            {formError && <p className="text-red-500 text-[12px]">{formError}</p>}
          </form>
        </div>
      )}

      {/* Tab: Feeding Log */}
      {activeTab === 'Beslenme Günlüğü' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <form onSubmit={handleAddLog} className="card-base p-6 bg-primary-soft/10 border-primary/20">
            <h3 className="font-bold text-primary mb-4">Yeni Öğün Ekle</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-text-secondary">Miktar (g)</label>
                  <input name="amount_grams" type="number" className="input-base" required/>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-text-secondary">İştah Skoru (1-5)</label>
                  <input name="appetite_score" type="number" min="1" max="5" className="input-base" required/>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Notlar (Opsiyonel)</label>
                <input name="notes" className="input-base" placeholder="Örn: Hepsini bitirdi"/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">Ekle</button>
            </div>
          </form>

          <div className="card-base overflow-hidden">
            <h3 className="p-4 font-bold border-b border-border-main bg-surface/50">Son Öğünler</h3>
            {feedingLogs.length === 0 ? (
              <p className="p-6 text-center text-text-secondary text-[14px]">Henüz kayıt yok.</p>
            ) : (
              <div className="divide-y divide-border-main">
                {feedingLogs.map(l => (
                  <div key={l.id} className="p-4 flex items-center justify-between hover:bg-bg-main transition-colors">
                    <div>
                      <p className="font-bold text-text-primary text-[14px]">{l.amount_grams}g tüketildi</p>
                      <p className="text-[12px] text-text-secondary">{new Date(l.meal_time).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                      {l.notes && <p className="text-[11px] text-text-secondary mt-1 italic">{l.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-text-secondary uppercase mb-1">İştah</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={`w-3 h-3 rounded-full ${s <= (l.appetite_score || 0) ? 'bg-primary' : 'bg-border-main'}`}/>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Weight */}
      {activeTab === 'Kilo Takibi' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <form onSubmit={handleAddWeight} className="card-base p-6 bg-amber-50/30 border-amber-200">
            <h3 className="font-bold text-amber-600 mb-4">Kilo Kaydı Ekle</h3>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Kilo (kg)</label>
                <input name="weight_kg" type="number" step="0.1" className="input-base" required/>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">BCS (1-9) *Vet*</label>
                <input name="body_condition_score" type="number" min="1" max="9" className="input-base" placeholder="Opsiyonel"/>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-4 w-full bg-amber-500 hover:bg-amber-600 border-none">Kaydet</button>
          </form>

          {weightLogs.length > 0 && (
            <div className="card-base p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-text-primary">Kilo Geçmişi</h3>
                {weightTrend !== null && (
                  <span className={`text-[12px] font-bold px-2 py-1 rounded-lg ${weightTrend > 0 ? 'bg-orange-50 text-orange-600' : weightTrend < 0 ? 'bg-green-50 text-green-600' : 'bg-bg-main text-text-secondary'}`}>
                    Trend: {weightTrend > 0 ? '+' : ''}{weightTrend} kg/ölçüm
                  </span>
                )}
              </div>
              
              {/* Simple Bar Chart approximation */}
              <div className="h-40 flex items-end gap-2 border-b border-border-main pb-2 px-2">
                {weightLogs.map(w => (
                  <div key={w.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-amber-300 rounded-t-md hover:bg-amber-400 transition-colors" 
                         style={{ height: `${Math.max(10, (Number(w.weight_kg) / Math.max(...weightLogs.map(wl=>Number(wl.weight_kg)))) * 100)}%` }}/>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity">
                      {w.weight_kg} kg
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-text-secondary mt-2 px-2">
                <span>{new Date(weightLogs[0].measured_at).toLocaleDateString('tr')}</span>
                <span>{new Date(weightLogs[weightLogs.length-1].measured_at).toLocaleDateString('tr')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Inventory */}
      {activeTab === 'Stok & Refill' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="card-base p-8 text-center bg-gradient-to-b from-white to-bg-main">
            <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-sm ring-4 ring-bg-main flex items-center justify-center text-[32px] mb-4">
              📦
            </div>
            <h2 className="text-[28px] font-black text-text-primary mb-1">
              {inventory?.current_stock_grams ? `${(inventory.current_stock_grams / 1000).toFixed(1)} kg` : 'Yok'}
            </h2>
            <p className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-6">Mevcut Stok</p>
            
            <div className="inline-flex flex-col gap-1 px-6 py-3 rounded-2xl bg-surface border border-border-main shadow-sm">
              <span className={`text-[18px] font-black ${badgeClass}`}>
                {riskLabel}
              </span>
              <span className="text-[11px] text-text-secondary">Tahmini süre</span>
            </div>
          </div>

          <form onSubmit={handleUpdateInventory} className="card-base p-6">
            <h3 className="font-bold text-text-primary mb-4">Stoğu Güncelle</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Mevcut Gram</label>
                <input name="current_stock_grams" type="number" defaultValue={inventory?.current_stock_grams || ''} className="input-base"/>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Günlük Tüketim (Tahmini)</label>
                <input name="estimated_daily_usage" type="number" defaultValue={inventory?.estimated_daily_usage || profile?.daily_grams || ''} className="input-base"/>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">Paket Açıldı / Stok Yenilendi</button>
          </form>
        </div>
      )}

      {/* Tab: Insights */}
      {activeTab === 'Analizler' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="card-base p-6 bg-gradient-to-br from-[#FDFBFF] to-[#F5F3FF] border-[#E9E1FF]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#E9E1FF] flex items-center justify-center text-[20px]">✨</div>
              <h3 className="font-black text-[#5B3BC4] text-[16px]">AI Insight Layer</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {insights.map((msg, i) => (
                <div key={i} className="bg-white p-4 rounded-[14px] shadow-sm border border-[#F5F3FF] flex gap-3 items-start">
                  <span className="text-[16px] shrink-0 mt-0.5">🧠</span>
                  <p className="text-[13px] font-medium text-text-primary leading-relaxed">{msg}</p>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 rounded-xl bg-[#5B3BC4] text-white font-bold text-[13px] hover:bg-[#4A2CA6] transition-colors shadow-sm shadow-[#5B3BC4]/20 flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
              Smart Diet Plan İste (Pro)
            </button>
          </div>
        </div>
      )}

      {/* Refill Planner Modal Placeholder */}
      {showPlanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-base w-full max-w-md p-6 bg-white overflow-hidden relative shadow-2xl">
            <button onClick={() => setShowPlanner(false)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 flex items-center justify-center text-[32px] mb-4 border border-orange-100">
                🛒
              </div>
              <h2 className="text-[20px] font-black text-text-primary mb-2">Mama Siparişiniz Yaklaşıyor</h2>
              <p className="text-[14px] text-text-secondary">Tahmini <strong className="text-orange-600">{refillStatus.daysLeft} gün</strong> yetecek mamanız kaldı.</p>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary-soft/10 text-center mb-6">
              <p className="text-[13px] font-medium text-primary">
                Yakında tek tıkla en uygun fiyatlı mama siparişi entegrasyonumuz aktif olacak! 🚀
              </p>
            </div>

            <button 
              onClick={() => {
                trackEvent('refill_reminder_requested', { petId: pet.id, risk: refillStatus.risk });
                
                const reminderDataToSave = {
                  enabled: true,
                  createdAt: new Date().toISOString(),
                  risk: refillStatus.risk
                }
                localStorage.setItem(`odi_refill_reminder_${pet.id}`, JSON.stringify(reminderDataToSave))
                setHasReminder(true)
                setReminderData(reminderDataToSave)

                setShowPlanner(false);
              }} 
              className="btn-primary w-full py-3 mb-2"
            >
              Bana Hatırlat
            </button>
            <button 
              onClick={() => setShowPlanner(false)} 
              className="w-full py-3 text-[13px] font-bold text-text-secondary hover:text-text-primary transition-colors"
            >
              Şimdi Değil
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
