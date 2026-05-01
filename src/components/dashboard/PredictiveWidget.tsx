'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaywallModal } from './PaywallModal'

interface PredictiveWidgetProps {
  petId: string
  fallbackSuggestion: React.ReactNode
}

export function PredictiveWidget({ petId, fallbackSuggestion }: PredictiveWidgetProps) {
  const [insight, setInsight] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallType, setPaywallType] = useState<'nutrition' | 'ai_plus'>('nutrition')
  const [requestingVet, setRequestingVet] = useState(false)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const router = useRouter()

  const fetchInsight = async () => {
    fetch(`/api/predictive-risk/${petId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setInsight(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch predictive risk', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!petId) return
    fetchInsight()
  }, [petId])

  // SLA Timer
  useEffect(() => {
    if (!insight || (insight.vetReviewStatus !== 'pending' && insight.vetReviewStatus !== 'in_review')) return
    
    const startTime = new Date(insight.reviewClaimedAt || insight.reviewCreatedAt).getTime()
    
    const updateTime = () => {
      const now = new Date().getTime()
      setElapsedMinutes(Math.floor((now - startTime) / 60000))
    }
    
    updateTime()
    const intv = setInterval(updateTime, 10000) // Her 10 saniyede bir kontrol et
    return () => clearInterval(intv)
  }, [insight])

  const requestVetReview = async () => {
    if (!insight?.isAIPlus) {
      setPaywallType('ai_plus')
      setShowPaywall(true)
      return
    }
    
    setRequestingVet(true)
    try {
      await fetch(`/api/predictive-risk/${petId}/vet-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId: insight.id })
      })
      await fetchInsight()
    } finally {
      setRequestingVet(false)
    }
  }

  if (loading) {
    return (
      <div className="card-base bg-surface border-border-main p-6 animate-pulse">
         <div className="h-4 bg-bg-main rounded w-1/3 mb-4"></div>
         <div className="h-10 bg-bg-main rounded w-full"></div>
      </div>
    )
  }

  // 6. UX BAĞLANTISI: SAFE -> Suggestion göster
  if (!insight || insight.risk_level === 'SAFE') {
    return <>{fallbackSuggestion}</>
  }

  // CRITICAL veya WARNING -> Risk göster
  const isCritical = insight.risk_level === 'CRITICAL'
  const bgColor = isCritical ? 'bg-error/10 border-error/30' : 'bg-warning/10 border-warning/30'
  const textColor = isCritical ? 'text-error' : 'text-warning'
  const icon = isCritical ? '🚨' : '⚠️'

  const actionMap: Record<string, () => void> = {
    open_health:   () => router.push(`/owner/health?petId=${petId}`),
    review_tasks:  () => router.push(`/owner/tasks`),
    open_dashboard:() => router.refresh(),
    improve_care:  () => router.push(`/owner/health?petId=${petId}`),
    open_calendar: () => router.push(`/owner/calendar`),
    open_nutrition: () => {
      if (!insight.isPremium) { setPaywallType('nutrition'); setShowPaywall(true) }
      else router.push(`/owner/nutrition?petId=${petId}`)
    },
    none: () => {}
  }

  const handleAction = () => { const fn = actionMap[insight.action]; if (fn) fn() }

  // Household Reliability Panel
  const householdScore = insight?.householdScore
  const householdLevel = insight?.householdLevel
  const householdConfig = {
    healthy: { color: 'text-green-600', bg: 'bg-green-50 border-green-100', label: 'Sağlıklı' },
    warning: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', label: 'Dikkat' },
    critical: { color: 'text-red-600',  bg: 'bg-red-50 border-red-100',   label: 'Kritik' },
  }[householdLevel ?? 'healthy'] ?? { color: 'text-green-600', bg: 'bg-green-50 border-green-100', label: 'Sağlıklı' }


  // SLA Sınıflandırması
  let slaUI = null
  if (insight?.vetReviewStatus === 'pending' || insight?.vetReviewStatus === 'in_review') {
    if (elapsedMinutes < 2) {
      slaUI = (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
          <span className="text-[16px]">👨‍⚕️</span>
          <p className="text-[12px] text-primary font-bold">Veteriner hekim bağlandı, inceliyor...</p>
        </div>
      )
    } else if (elapsedMinutes < 5) {
      slaUI = (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-2">
          <span className="text-[16px]">⏳</span>
          <p className="text-[12px] text-warning font-bold">İnceleme devam ediyor...</p>
        </div>
      )
    } else if (elapsedMinutes < 10) {
      slaUI = (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-2 animate-pulse">
          <span className="text-[16px]">⚠️</span>
          <p className="text-[12px] text-warning font-bold">Yoğunluk var, en kısa sürede cevaplanacak.</p>
        </div>
      )
    } else {
      slaUI = (
        <div className="bg-surface border border-border-main rounded-lg p-3 flex items-center gap-2">
          <span className="text-[16px]">🤖</span>
          <p className="text-[12px] text-text-secondary font-bold">Ön analiz hazırlandı (Veteriner yanıtı gecikti)</p>
        </div>
      )
    }
  }

  return (
    <>
    <div className={`card-base ${bgColor} p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[20px]">{icon}</span>
        <h2 className={`text-[14px] font-black uppercase tracking-widest opacity-80 ${textColor}`}>
          Risk Uyarısı
        </h2>
      </div>
      
      <div className="flex flex-col gap-2">
        <div 
          onClick={handleAction}
          className="bg-white border-l-4 rounded-lg p-4 shadow-sm flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.01]"
          style={{ borderLeftColor: isCritical ? 'var(--color-error)' : 'var(--color-warning)' }}
        >
          <div className="flex flex-col">
            <span className="font-extrabold text-[16px] text-text-primary">
              {insight.message}
            </span>
            <span className="text-[12px] font-bold text-text-secondary mt-1 flex items-center gap-1">
              <span>Predictive AI Confidence: {Math.round(insight.confidence * 100)}%</span>
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => router.push(`/owner/health?petId=${petId}`)} className="text-[11px] font-bold text-white bg-error px-3 py-1.5 rounded-md shadow-sm hover:bg-error/90 transition-colors">
                Detayı Gör
              </button>
              <button onClick={() => router.push(`/owner/nutrition?petId=${petId}`)} className="text-[11px] font-bold text-error bg-error/10 border border-error/20 px-3 py-1.5 rounded-md hover:bg-error/20 transition-colors">
                Veri Gir
              </button>
              {isCritical && !insight.isPremium && (
                <button onClick={() => { setPaywallType('nutrition'); setShowPaywall(true); }} className="text-[11px] font-bold text-text-secondary underline hover:text-text-primary ml-auto">
                  Premium Özellikler
                </button>
              )}
            </div>
          </div>
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isCritical ? 'bg-error/10 text-error group-hover:bg-error group-hover:text-white' : 'bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        {/* VET VERIFICATION LAYER */}
        {isCritical && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            {insight.vetReviewStatus === 'none' && (
               <div className="bg-bg-main border border-border-main rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <p className="text-[12px] text-text-secondary font-medium">🚨 Kritik sağlık riski tespit edildi. Doğrulamak ister misiniz?</p>
                 <button 
                   onClick={requestVetReview}
                   disabled={requestingVet}
                   className="btn-outline text-[11px] py-1.5 px-3 shrink-0"
                 >
                   {requestingVet ? 'Başlatılıyor...' : 'Veteriner İncelemesi (AI+)'}
                 </button>
               </div>
            )}
            {(insight.vetReviewStatus === 'pending' || insight.vetReviewStatus === 'in_review') && slaUI}
            {insight.vetReviewStatus === 'approved' && (
               <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-center gap-2">
                 <span className="text-[16px]">✔</span>
                 <p className="text-[12px] text-success font-bold">{insight.vetName} tarafından incelendi ve onaylandı.</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
    
    <PaywallModal 
      isOpen={showPaywall} 
      onClose={() => setShowPaywall(false)}
      title={paywallType === 'nutrition' ? "Beslenme Analizi Kilitli" : "Veteriner Doğrulama (AI+)"}
      description={paywallType === 'nutrition' 
        ? "Bu riskin alışkanlığa dönüşmesini engellemek ve detaylı beslenme analizini görmek için PRO plana geçmelisiniz."
        : "Risklerin gerçek bir veteriner hekim tarafından doğrulanması ve profesyonel öneriler almak için AI+ planına geçmelisiniz."}
    />
    </>
  )
}
