'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'

const REPORT_TYPES = [
  {
    id: 'summary',
    icon: '📋',
    label: 'Hızlı Özet',
    desc: 'Pet profili, bakım skoru, aktif uyarılar ve yaklaşan görevler',
    plan: 'free',
    color: 'border-green-200 hover:border-green-400',
    badge: 'Ücretsiz',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'medical_timeline',
    icon: '🩺',
    label: 'Medikal Timeline',
    desc: 'Tüm aşılar, hastalıklar, ilaçlar, randevular — veteriner için kronolojik geçmiş',
    plan: 'pro',
    color: 'border-blue-200 hover:border-blue-400',
    badge: 'Pro',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'travel_pack',
    icon: '✈️',
    label: 'Seyahat Paketi',
    desc: 'Pasaport, kuduz durumu, mikroçip, acil iletişim — boarding & seyahat için',
    plan: 'ai_plus',
    color: 'border-purple-200 hover:border-purple-400',
    badge: 'AI+',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
]

const DATE_RANGES = [
  { value: 'last_3_months', label: 'Son 3 Ay' },
  { value: 'last_6_months', label: 'Son 6 Ay' },
  { value: 'last_12_months', label: 'Son 12 Ay' },
  { value: 'all_time', label: 'Tüm Geçmiş' },
]

export default function ReportsTab({ petId, petName, plan, payments }: { petId: string; petName: string; plan: string; payments: any[] }) {
  const [selectedType, setSelectedType] = useState('summary')
  const [dateRange, setDateRange] = useState('last_12_months')
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setGenerating(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch(`/api/reports/${petId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: selectedType, date_range: dateRange }),
      })
      
      let data;
      try {
        data = await res.json()
      } catch (e) {
        throw new Error('Sunucudan geçersiz bir yanıt alındı. Lütfen tekrar deneyin.')
      }
      
      if (!res.ok) {
        setError(data?.error || 'Rapor oluşturulamadı.')
        if (data?.requiresUpgrade) setError((data?.error || 'Yükseltme gerekli') + ' → ' + (plan === 'free' ? 'Pro' : 'AI+') + ' gerekli')
        return
      }
      setReport(data)
      // Analytics + onboarding progress (fire-and-forget both)
      await Promise.all([
        trackEvent('first_report_generated', { petId, reportType: selectedType }),
        fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ has_generated_report: true, first_report_at: new Date().toISOString() }),
        }),
      ])
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen bir hata oluştu.')
    } finally { setGenerating(false) }
  }

  function openPrint() {
    const win = window.open(`/owner/reports/${petId}/print?type=${selectedType}&range=${dateRange}&token=${report.shareToken}`, '_blank')
    win?.focus()
    setTimeout(() => win?.print(), 800)
  }

  function copyShareLink() {
    const url = `${window.location.origin}/owner/reports/share/${report.shareToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const planRank: Record<string, number> = { free: 0, pro: 1, ai_plus: 2 }
  const userRank = planRank[plan] ?? 0

  return (
    <div className="flex flex-col gap-5">

      {/* ── Harcama Özeti ── */}
      <div className="card-base p-5">
        <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">💰 Harcama Özeti</h3>
        {payments && payments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* Toplam */}
            <div className="flex items-center justify-between p-4 bg-primary-soft rounded-xl border border-primary/20">
              <span className="text-[13px] font-black text-text-primary uppercase tracking-wide">Toplam Harcama</span>
              <span className="text-[22px] font-black text-primary">
                ₺{payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
              </span>
            </div>
            {/* Kalemler */}
            <div className="flex flex-col divide-y divide-border-main">
              {payments.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{p.description || 'Ödeme'}</p>
                    {p.paid_at && (
                      <p className="text-[11px] text-text-secondary">{new Date(p.paid_at).toLocaleDateString('tr-TR')}</p>
                    )}
                  </div>
                  <span className="text-[14px] font-bold text-text-primary">₺{parseFloat(p.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-text-secondary text-[13px]">
            <p className="text-[32px] mb-2">📭</p>
            <p>Henüz kayıtlı harcama bulunmuyor.</p>
          </div>
        )}
      </div>

      {/* Report type selector */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Rapor Türü</h3>
        {REPORT_TYPES.map(rt => {
          const locked = planRank[rt.plan] > userRank
          return (
            <button
              key={rt.id}
              disabled={locked}
              onClick={() => setSelectedType(rt.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedType === rt.id ? 'border-primary bg-primary-soft' : rt.color} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[28px]">{rt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-text-primary text-[15px]">{rt.label}</p>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${rt.badgeColor}`}>{rt.badge}</span>
                    {locked && <span className="text-[11px] text-text-secondary">🔒 Kilidi Aç</span>}
                  </div>
                  <p className="text-[12px] text-text-secondary mt-0.5">{rt.desc}</p>
                </div>
                {selectedType === rt.id && !locked && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Date range */}
      <div>
        <label className="text-[12px] font-black text-text-secondary uppercase tracking-widest block mb-2">Tarih Aralığı</label>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map(dr => (
            <button key={dr.value} onClick={() => setDateRange(dr.value)}
              className={`px-3 py-1.5 rounded-xl border text-[12px] font-bold transition-all ${dateRange === dr.value ? 'border-primary bg-primary-soft text-primary' : 'border-border-main text-text-secondary hover:border-primary/40'}`}>
              {dr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium">
          ⚠️ {error}
          {error.includes('Pro') || error.includes('AI+') ? (
            <Link href="/owner/profile/subscription" className="ml-2 underline font-bold">Yükselt →</Link>
          ) : null}
        </div>
      )}

      {/* Generate button */}
      <button onClick={generate} disabled={generating}
        className="btn-primary py-3.5 text-[15px] font-bold flex items-center justify-center gap-2">
        {generating
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Rapor Hazırlanıyor...</>
          : `${REPORT_TYPES.find(r => r.id === selectedType)?.icon} ${petName} için Rapor Oluştur`
        }
      </button>

      {/* Report result */}
      {report && (
        <div className="card-base overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-primary-hover"/>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-black text-text-primary text-[16px]">Rapor Hazır ✓</p>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  ID: <span className="font-mono">{report.verificationHash}</span>
                </p>
                <p className="text-[11px] text-text-secondary">
                  {new Date(report.generatedAt).toLocaleString('tr-TR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-text-secondary uppercase">Uyumluluk</p>
                <p className={`text-[28px] font-black ${report.preventiveComplianceScore >= 70 ? 'text-green-600' : report.preventiveComplianceScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {report.preventiveComplianceScore}%
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Aşı', value: report.annualVaccineCount },
                { label: 'Hastalık', value: report.incidentCount },
                { label: 'Randevu', value: report.appointments?.length ?? 0 },
              ].map(s => (
                <div key={s.label} className="p-3 bg-bg-main rounded-xl text-center border border-border-main">
                  <p className="text-[22px] font-black text-text-primary">{s.value}</p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button onClick={openPrint}
                className="btn-primary py-3 text-[14px] flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                PDF Olarak İndir / Yazdır
              </button>
              <button onClick={copyShareLink}
                className={`btn-secondary py-2.5 text-[13px] transition-all ${copied ? 'text-green-600 border-green-300 bg-green-50' : ''}`}>
                {copied ? '✓ Bağlantı kopyalandı!' : '🔗 Paylaşım Bağlantısı Oluştur'}
              </button>
            </div>

            <p className="text-[11px] text-text-secondary text-center mt-3">
              Doğrulama Hash: <span className="font-mono">{report.verificationHash}</span> • ODI Pet OS tarafından oluşturuldu
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
