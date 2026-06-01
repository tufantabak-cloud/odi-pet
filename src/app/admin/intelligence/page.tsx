'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Metrics = {
  acquisition: { signups: number; petCreatedPct: number; onboardingPct: number; reportPct: number }
  activation: { ttfvMedianSec: number | null; onboardingCompletePct: number }
  retention: { d7: number }
  revenue: { freeToProPct: number }
  nutrition: {
    nutritionProfilePct: number;
    firstFeedingPct: number;
    repeatFeedingPct: number;
    refillRiskPct: number;
    avgFeedingPerUser7d: number;
  }
  commerce: {
    refillCtaClickPct: number;
    plannerOpenPct: number;
    reminderRequestPct: number;
  }
  reminders: {
    reminderRequestedPct: number;
    reminderSnoozedPct: number;
    reminderDismissedPct: number;
    reminderEscalatedPct: number;
  }
  marketplace: {
    marketplaceEligible: number;
    marketplaceClicks: number;
    waitlistJoins: number;
    affiliateClicks: number;
    segments: {
      hot: number;
      warm: number;
      curious: number;
      cold: number;
    }
    partners: { id: string; clicks: number; uniqueUsers: number; ctr: number }[]
    brands: { name: string; eligible: number; clicks: number; waitlist: number; affiliate: number; conversion: number }[]
  }
  vaccine: {
    setupCompletedPct: number;
    firstVaccinePct: number;
    overdueRatePct: number;
    chainCompletionPct: number;
    quickMarkRatePct: number;
    totalPetsWithRecords: number;
    totalPetsOverdue: number;
  }
}

// Threshold definitions (matches product KPIs)
const THRESHOLDS = {
  onboardingPct: { ok: 45, warn: 25 },
  petCreatedPct: { ok: 60, warn: 35 },
  reportPct:     { ok: 25, warn: 10 },
  d7:            { ok: 15, warn: 8 },
  freeToProPct:  { ok: 3,  warn: 1 },
  ttfvMedianSec: { ok: 300, warn: 600 }, // lower is better
  nutritionProfilePct: { ok: 55, warn: 30 },
  firstFeedingPct: { ok: 50, warn: 25 },
  repeatFeedingPct: { ok: 30, warn: 15 },
  refillRiskPct: { ok: 20, warn: 10 },
  avgFeedingPerUser7d: { ok: 3.0, warn: 1.5 },
  refillCtaClickPct: { ok: 15, warn: 8 },
  plannerOpenPct: { ok: 10, warn: 5 },
  reminderRequestPct: { ok: 5, warn: 2 },
  reminderRequestedPct: { ok: 5, warn: 2 },
  reminderSnoozedPct: { ok: 50, warn: 20 },
  reminderDismissedPct: { ok: 20, warn: 40 },
  reminderEscalatedPct: { ok: 30, warn: 10 },
  marketplaceEligible: { ok: 1, warn: 0 },
  marketplaceClickRate: { ok: 25, warn: 10 },
  waitlistClickConversion: { ok: 35, warn: 15 },
  waitlistEligibleConversion: { ok: 10, warn: 5 },
  affiliateCTR: { ok: 20, warn: 5 },
  // Vaccine OS
  vaccineSetupPct: { ok: 60, warn: 30 },
  vaccineFirstPct: { ok: 50, warn: 25 },
  vaccineOverduePct: { ok: 20, warn: 40 }, // invert: lower is better
  vaccineChainPct: { ok: 50, warn: 25 },
  vaccineQuickMarkPct: { ok: 70, warn: 40 },
}

function statusColor(value: number, key: keyof typeof THRESHOLDS, invert = false) {
  const t = THRESHOLDS[key] as { ok: number; warn: number } | undefined
  if (!t) return 'text-text-secondary'

  if (invert) {
    if (value <= t.ok) return 'text-green-600'
    if (value <= t.warn) return 'text-amber-500'
    return 'text-red-500'
  }
  if (value >= t.ok) return 'text-green-600'
  if (value >= t.warn) return 'text-amber-500'
  return 'text-red-500'
}

function KpiCard({
  label, value, threshold, invert = false, unit = '%', note
}: {
  label: string; value: number | null; threshold: keyof typeof THRESHOLDS
  invert?: boolean; unit?: string; note?: string
}) {
  const display = value === null ? '–' : `${value}${unit}`
  const color = value === null ? 'text-text-secondary' : statusColor(value, threshold, invert)
  return (
    <div className="rounded-2xl border border-border-main bg-surface p-5">
      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{display}</p>
      {note && <p className="text-[11px] text-text-secondary mt-1">{note}</p>}
    </div>
  )
}

function FunnelBar({ steps }: { steps: { label: string; pct: number; threshold: keyof typeof THRESHOLDS }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const color = statusColor(s.pct, s.threshold)
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-6 text-[12px] text-text-secondary text-right">{i + 1}</span>
            <span className="w-36 text-[13px] font-semibold text-text-primary shrink-0">{s.label}</span>
            <div className="flex-1 h-3 bg-bg-main rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color === 'text-green-600' ? 'bg-green-500' : color === 'text-amber-500' ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(s.pct, 100)}%` }}
              />
            </div>
            <span className={`w-12 text-right text-[13px] font-black ${color}`}>{s.pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function FounderIntelligencePage() {
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [sanity, setSanity] = useState<{ ok: boolean; lastEvent?: string; count24h?: number } | null>(null)
  const [pipeline, setPipeline] = useState<{ total: number; contacted: number; activated: number; conversionPct: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/metrics').then(r => r.json()),
      fetch('/api/admin/outreach').then(r => r.json()).catch(() => null),
    ]).then(([metrics, outreach]) => {
      setData(metrics)
      if (outreach?.summary) setPipeline(outreach.summary)
      setLastRefresh(new Date())
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const m = data

  // Marketplace gate check
  const gateChecks = m ? [
    { label: 'Onboarding > 45%', pass: m.acquisition.onboardingPct >= 45 },
    { label: 'Pet creation > 60%', pass: m.acquisition.petCreatedPct >= 60 },
    { label: 'Report gen > 25%', pass: m.acquisition.reportPct >= 25 },
    { label: 'D7 retention > 15%', pass: m.retention.d7 >= 15 },
  ] : []
  const gateOpen = gateChecks.every(c => c.pass)

  const clickRate = m && m.marketplace.marketplaceEligible > 0 ? Math.round((m.marketplace.marketplaceClicks / m.marketplace.marketplaceEligible) * 100) : 0;
  const waitlistClickConversion = m && m.marketplace.marketplaceClicks > 0 ? Math.round((m.marketplace.waitlistJoins / m.marketplace.marketplaceClicks) * 100) : 0;
  const waitlistEligibleConversion = m && m.marketplace.marketplaceEligible > 0 ? Math.round((m.marketplace.waitlistJoins / m.marketplace.marketplaceEligible) * 100) : 0;
  const affiliateCTR = m && m.marketplace.waitlistJoins > 0 ? Math.round((m.marketplace.affiliateClicks / m.marketplace.waitlistJoins) * 100) : 0;

  const commerceGateChecks = m ? [
    { label: 'HOT Leads >= 10', pass: m.marketplace.segments.hot >= 10 },
    { label: 'HOT + WARM >= 25', pass: (m.marketplace.segments.hot + m.marketplace.segments.warm) >= 25 },
    { label: 'Waitlist Conv > 35%', pass: waitlistClickConversion > 35 },
  ] : []
  const commerceGateOpen = commerceGateChecks.every(c => c.pass)

  const topPartner = m?.marketplace.partners.sort((a,b) => b.clicks - a.clicks)[0]
  const bestBrand = m?.marketplace.brands.sort((a,b) => b.conversion - a.conversion)[0]

  const ttfvSec = m?.activation.ttfvMedianSec
  const ttfvDisplay = ttfvSec == null ? null : Math.round(ttfvSec)
  const ttfvUnit = 's'
  const ttfvNote = ttfvSec == null ? undefined
    : ttfvSec < 120 ? '🏆 Elite (<2 min)'
    : ttfvSec < 300 ? '✅ Healthy (2–5 min)'
    : '⚠️ Friction risk (>5 min)'

  return (
    <div className="min-h-dvh bg-bg-main p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-text-primary">Founder Console</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} disabled={loading}
              className="btn-secondary text-[13px] px-4 py-2">
              {loading ? '...' : '↻ Refresh'}
            </button>
            <Link href="/admin/outreach" className="btn-secondary text-[13px] px-4 py-2">
              📋 Pipeline
            </Link>
            <Link href="/owner/dashboard" className="btn-primary text-[13px] px-4 py-2">
              ← Panel
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40 text-text-secondary">
            Yükleniyor...
          </div>
        )}

        {!loading && m && (
          <>
            {/* KPI cards */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <KpiCard label="Toplam Signup" value={m.acquisition.signups} threshold="petCreatedPct" unit="" note="Toplam kayıtlı kullanıcı" />
              <KpiCard label="Pet Ekleme %" value={m.acquisition.petCreatedPct} threshold="petCreatedPct" note="Hedef: >60%" />
              <KpiCard label="Onboarding Tamamlama %" value={m.acquisition.onboardingPct} threshold="onboardingPct" note="Hedef: >45%" />
              <KpiCard label="İlk Rapor %" value={m.acquisition.reportPct} threshold="reportPct" note="Hedef: >25%" />
              <KpiCard label="D7 Retention" value={m.retention.d7} threshold="d7" note="Hedef: >15%" />
              <KpiCard label="Free→Pro %" value={m.revenue.freeToProPct} threshold="freeToProPct" note="Hedef: >3%" />
            </section>

            {/* TTFV */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">
                Time‑to‑First‑Value (Median)
              </h2>
              <div className="flex items-center gap-4">
                <p className={`text-4xl font-black ${ttfvDisplay == null ? 'text-text-secondary' : statusColor(ttfvDisplay, 'ttfvMedianSec', true)}`}>
                  {ttfvDisplay == null ? '–' : `${ttfvDisplay}s`}
                </p>
                {ttfvNote && <p className="text-text-secondary text-[14px]">{ttfvNote}</p>}
              </div>
              <p className="text-[11px] text-text-secondary mt-2">Hedef: &lt;300 saniye (5 dakika)</p>
            </section>

            {/* Funnel */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">
                Activation Funnel
              </h2>
              <FunnelBar steps={[
                { label: 'Signup',        pct: 100,                            threshold: 'petCreatedPct' },
                { label: 'Pet Eklendi',   pct: m.acquisition.petCreatedPct,   threshold: 'petCreatedPct' },
                { label: 'Onboarding',    pct: m.acquisition.onboardingPct,   threshold: 'onboardingPct' },
                { label: 'İlk Rapor',     pct: m.acquisition.reportPct,       threshold: 'reportPct' },
              ]} />
            </section>

            {/* Nutrition OS */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">
                Nutrition OS
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <KpiCard label="Nutrition Setup %" value={m.nutrition.nutritionProfilePct} threshold="nutritionProfilePct" note="Hedef: >55%" />
                <KpiCard label="First Feeding %" value={m.nutrition.firstFeedingPct} threshold="firstFeedingPct" note="Hedef: >50%" />
                <KpiCard label="Repeat Feeding 7d %" value={m.nutrition.repeatFeedingPct} threshold="repeatFeedingPct" note="Hedef: >30%" />
                <KpiCard label="Refill Risk %" value={m.nutrition.refillRiskPct} threshold="refillRiskPct" note="Hedef: >20%" />
                <KpiCard label="Avg Feeding/User 7d" value={m.nutrition.avgFeedingPerUser7d} threshold="avgFeedingPerUser7d" unit="" note="Hedef: >3.0" />
              </div>

              <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-4">
                Nutrition Funnel
              </h3>
              <FunnelBar steps={[
                { label: 'Signup',             pct: 100,                              threshold: 'nutritionProfilePct' },
                { label: 'Nutrition Setup',    pct: m.nutrition.nutritionProfilePct,  threshold: 'nutritionProfilePct' },
                { label: 'First Feeding',      pct: m.nutrition.firstFeedingPct,      threshold: 'firstFeedingPct' },
                { label: 'Repeat Feeding',     pct: m.nutrition.repeatFeedingPct,     threshold: 'repeatFeedingPct' },
                { label: 'Refill Risk',        pct: m.nutrition.refillRiskPct,        threshold: 'refillRiskPct' },
              ]} />
            </section>

            {/* Vaccine OS Intelligence */}
            <section className="card-base p-5 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-[18px]">💉</div>
                <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Vaccine OS Intelligence</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <KpiCard label="Setup Tamamlama %" value={m.vaccine.setupCompletedPct} threshold="vaccineSetupPct" note="Hedef: >60%" />
                <KpiCard label="İlk Kayıt %" value={m.vaccine.firstVaccinePct} threshold="vaccineFirstPct" note="Setup → İlk aşı" />
                <KpiCard label="Gecikme Oranı %" value={m.vaccine.overdueRatePct} threshold="vaccineOverduePct" invert={true} note="Hedef: <20%" />
                <KpiCard label="Zincir Tamamlama %" value={m.vaccine.chainCompletionPct} threshold="vaccineChainPct" note="≥3 aşı tamamlandı" />
                <KpiCard label="Hızlı Kayıt %" value={m.vaccine.quickMarkRatePct} threshold="vaccineQuickMarkPct" note="Quick Mark oranı" />
              </div>

              <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-4">Vaccine OS Funnel</h3>
              <FunnelBar steps={[
                { label: 'Signup',         pct: 100,                             threshold: 'vaccineSetupPct' },
                { label: 'Setup Seçildi',  pct: m.vaccine.setupCompletedPct,    threshold: 'vaccineSetupPct' },
                { label: 'İlk Kayıt',      pct: m.vaccine.firstVaccinePct,      threshold: 'vaccineFirstPct' },
                { label: 'Zincir (3+)',    pct: m.vaccine.chainCompletionPct,   threshold: 'vaccineChainPct' },
              ]} />

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-bg-main border border-border-main text-center">
                  <p className="text-[22px] font-black text-text-primary">{m.vaccine.totalPetsWithRecords}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-1">Aktif Plan</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-main border border-border-main text-center">
                  <p className={`text-[22px] font-black ${m.vaccine.totalPetsOverdue > 0 ? 'text-error' : 'text-success'}`}>{m.vaccine.totalPetsOverdue}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-1">Gecikmiş Pet</p>
                </div>
              </div>

              {/* Vaccine Insight Rules */}
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 flex flex-col gap-3">
                <h3 className="text-[12px] font-black text-violet-900 uppercase tracking-widest">🧠 Vaccine OS Insight Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] font-medium">
                  <div className={`p-3 rounded-lg border ${
                    m.vaccine.overdueRatePct > 40 ? 'bg-red-100 text-red-900 border-red-200' : 'bg-white/50 text-violet-800 border-violet-200/50'
                  }`}>
                    <p className="font-bold mb-1">If Overdue Rate &gt; 40%</p>
                    <p className="text-[12px]">🔴 Users are missing vaccine deadlines. Consider push reminders or simpler UX.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${
                    m.vaccine.quickMarkRatePct > 70 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-violet-800 border-violet-200/50'
                  }`}>
                    <p className="font-bold mb-1">If Quick Mark &gt; 70%</p>
                    <p className="text-[12px]">🟢 Low-friction logging validated. Users prefer one-tap completion.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${
                    m.vaccine.chainCompletionPct > 50 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-violet-800 border-violet-200/50'
                  }`}>
                    <p className="font-bold mb-1">If Chain Completion &gt; 50%</p>
                    <p className="text-[12px]">🟢 Vaccination workflow is sticky. Users are following through the protocol.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">
                Refill Commerce Funnel
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <KpiCard label="CTA Click %" value={m.commerce.refillCtaClickPct} threshold="refillCtaClickPct" note="Hedef: >15%" />
                <KpiCard label="Planner Open %" value={m.commerce.plannerOpenPct} threshold="plannerOpenPct" note="Hedef: >10%" />
                <KpiCard label="Reminder Request %" value={m.commerce.reminderRequestPct} threshold="reminderRequestPct" note="Hedef: >5%" />
              </div>

              <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-4">
                Intent Funnel
              </h3>
              <FunnelBar steps={[
                { label: 'Risk Triggered',     pct: 100,                                 threshold: 'refillCtaClickPct' },
                { label: 'CTA Click',          pct: m.commerce.refillCtaClickPct,        threshold: 'refillCtaClickPct' },
                { label: 'Planner Open',       pct: m.commerce.plannerOpenPct,           threshold: 'plannerOpenPct' },
                { label: 'Reminder Requested', pct: m.commerce.reminderRequestPct,       threshold: 'reminderRequestPct' },
              ]} />
            </section>

            {/* Reminder Intelligence */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">
                Reminder Intelligence
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Requested %" value={m.reminders.reminderRequestedPct} threshold="reminderRequestedPct" note="Planner → Request" />
                <KpiCard label="Snooze Rate %" value={m.reminders.reminderSnoozedPct} threshold="reminderSnoozedPct" note="Latent intent" />
                <KpiCard label="Dismiss Rate %" value={m.reminders.reminderDismissedPct} threshold="reminderDismissedPct" invert={true} note="Friction/Drop-off" />
                <KpiCard label="Escalation Rate %" value={m.reminders.reminderEscalatedPct} threshold="reminderEscalatedPct" note="Urgency tolerance" />
              </div>

              <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-4">
                Reminder Behavior Funnel
              </h3>
              <FunnelBar steps={[
                { label: 'Planner Open',      pct: 100,                                 threshold: 'reminderRequestedPct' },
                { label: 'Requested',         pct: m.reminders.reminderRequestedPct,    threshold: 'reminderRequestedPct' },
                { label: 'Snoozed',           pct: m.reminders.reminderSnoozedPct,      threshold: 'reminderSnoozedPct' },
                { label: 'Escalated Critical',pct: m.reminders.reminderEscalatedPct,    threshold: 'reminderEscalatedPct' },
              ]} />

              {/* Founder Insight Box */}
              <div className="mt-8 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">
                  🧠 Founder Insight Rules
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] font-medium">
                  <div className={`p-3 rounded-lg border ${m.reminders.reminderDismissedPct > 60 ? 'bg-red-100 text-red-900 border-red-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Dismiss &gt; 60%</p>
                    <p className="text-[12px]">Low urgency perception or weak value proposition</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${m.reminders.reminderSnoozedPct > m.reminders.reminderDismissedPct ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Snooze &gt; Dismiss</p>
                    <p className="text-[12px]">Latent commerce intent detected</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${m.reminders.reminderEscalatedPct > 30 ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Escalated &gt; 30%</p>
                    <p className="text-[12px]">Users tolerate urgency until critical threshold</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Marketplace Validation */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">
                Marketplace Validation
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <KpiCard label="Eligible Users" value={m.marketplace.marketplaceEligible} threshold="marketplaceEligible" unit="" note="Passed intent gate" />
                <KpiCard label="Eligible → Click" value={clickRate} threshold="marketplaceClickRate" note="Hedef: >25%" />
                <KpiCard label="Click → Waitlist" value={waitlistClickConversion} threshold="waitlistClickConversion" note="Hedef: >35%" />
                <KpiCard label="Affiliate Clicks" value={m.marketplace.affiliateClicks} threshold="marketplaceEligible" unit="" note="Partner Routing" />
                <KpiCard label="Affiliate CTR" value={affiliateCTR} threshold="affiliateCTR" note="Hedef: >20%" />
              </div>

              {/* Founder Insight Box for Waitlist */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">
                  🧠 Commerce Insight Rules
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] font-medium">
                  <div className={`p-3 rounded-lg border ${clickRate > 25 && waitlistClickConversion < 15 ? 'bg-red-100 text-red-900 border-red-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Click High + Waitlist Low</p>
                    <p className="text-[12px]">🔴 Curiosity without commitment. CTA is good, but value prop fails to convert.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${waitlistClickConversion >= 35 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Waitlist Conv &gt; 35%</p>
                    <p className="text-[12px]">🟢 Strong transactional intent detected. Ready for actual commerce integration.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Partner Performance Analytics */}
            <section className="card-base p-5 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">
                  Partner & Brand Performance
                </h2>
                <button onClick={async () => {
                  try {
                    const blob = new Blob([JSON.stringify({ 
                      partners: m.marketplace.partners, 
                      brands: m.marketplace.brands,
                      timestamp: new Date().toISOString()
                    }, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `partner-performance-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  } catch (e) {
                    setError("Export failed.");
                    setTimeout(() => setError(null), 3000);
                  }
                }} className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                  Export Performance ↓
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Top Partner" value={null} threshold="marketplaceEligible" unit="" note={topPartner?.id || '—'} />
                <KpiCard label="Best Brand" value={null} threshold="marketplaceEligible" unit="" note={bestBrand?.name || '—'} />
                <KpiCard label="Affiliate CTR" value={affiliateCTR} threshold="affiliateCTR" note="Overall" />
                <KpiCard label="Waitlist Conv %" value={waitlistClickConversion} threshold="waitlistClickConversion" note="Average" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Partner Leaderboard */}
                <div>
                  <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-3">Partner Leaderboard</h3>
                  <div className="rounded-xl border border-border-main overflow-hidden">
                    <table className="w-full text-[13px] text-left">
                      <thead className="bg-bg-main border-b border-border-main font-bold text-text-secondary">
                        <tr>
                          <th className="p-2 px-3">Partner</th>
                          <th className="p-2 text-right">Clicks</th>
                          <th className="p-2 text-right">Unique</th>
                          <th className="p-2 text-right">CTR %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-main">
                        {m.marketplace.partners.map(p => (
                          <tr key={p.id}>
                            <td className="p-2 px-3 font-bold">{p.id}</td>
                            <td className="p-2 text-right">{p.clicks}</td>
                            <td className="p-2 text-right">{p.uniqueUsers}</td>
                            <td className={`p-2 text-right font-black ${p.ctr >= 20 ? 'text-green-600' : 'text-text-primary'}`}>{p.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Brand Performance */}
                <div>
                  <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-3">Brand Performance</h3>
                  <div className="rounded-xl border border-border-main overflow-hidden">
                    <table className="w-full text-[13px] text-left">
                      <thead className="bg-bg-main border-b border-border-main font-bold text-text-secondary">
                        <tr>
                          <th className="p-2 px-3">Brand</th>
                          <th className="p-2 text-right">Eligible</th>
                          <th className="p-2 text-right">Waitlist</th>
                          <th className="p-2 text-right">Conv %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-main">
                        {m.marketplace.brands.slice(0, 5).map(b => (
                          <tr key={b.name}>
                            <td className="p-2 px-3 font-bold">{b.name}</td>
                            <td className="p-2 text-right">{b.eligible}</td>
                            <td className="p-2 text-right">{b.waitlist}</td>
                            <td className={`p-2 text-right font-black ${b.conversion >= 35 ? 'text-green-600' : 'text-text-primary'}`}>{b.conversion}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Founder Insight Box for Partners */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">
                  🧠 Strategic Commerce Insights
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] font-medium">
                  <div className={`p-3 rounded-lg border ${affiliateCTR >= 20 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">Affiliate CTR &gt; 20%</p>
                    <p className="text-[12px]">🟢 Strong affiliate fit. Users trust partner recommendations.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${waitlistClickConversion > 40 && affiliateCTR < 10 ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">Waitlist High + Affiliate Low</p>
                    <p className="text-[12px]">🟡 Users interested but partner mismatch. Test other partners.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${bestBrand && bestBrand.conversion >= 35 ? 'bg-indigo-100 text-indigo-900 border-indigo-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">High Converting Brand</p>
                    <p className="text-[12px]">🟢 Candidate for direct supplier partnership: {bestBrand?.name}</p>
                  </div>
                </div>
              </div>
            </section>


            {/* Commerce Cohorts */}
            <section className="card-base p-5 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">
                  Commerce Cohorts
                </h2>
                <button onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/marketplace-leads');
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error);
                    
                    const blob = new Blob([JSON.stringify(json.leads, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'marketplace-leads.json';
                    a.click();
                  } catch (e) {
                    setError("Export failed.");
                    setTimeout(() => setError(null), 3000);
                  }
                }} className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                  Export Leads ↓
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KpiCard label="🔴 HOT Leads" value={m.marketplace.segments.hot} threshold="marketplaceEligible" unit="" note="Critical + Waitlist" />
                <KpiCard label="🟠 WARM Leads" value={m.marketplace.segments.warm} threshold="marketplaceEligible" unit="" note="Warning + Waitlist" />
                <KpiCard label="🟡 Curious Users" value={m.marketplace.segments.curious} threshold="marketplaceEligible" unit="" note="Clicked, no waitlist" />
                <KpiCard label="⚪ Cold Eligible" value={m.marketplace.segments.cold} threshold="marketplaceEligible" unit="" note="Eligible, no click" />
              </div>

              <div className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[13px] font-bold text-red-600">HOT</span>
                  <div className="flex-1 h-3 bg-bg-main rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((m.marketplace.segments.hot / (m.marketplace.marketplaceEligible || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-[13px] font-black text-text-primary">{m.marketplace.segments.hot}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[13px] font-bold text-orange-500">WARM</span>
                  <div className="flex-1 h-3 bg-bg-main rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min((m.marketplace.segments.warm / (m.marketplace.marketplaceEligible || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-[13px] font-black text-text-primary">{m.marketplace.segments.warm}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[13px] font-bold text-yellow-500">CURIOUS</span>
                  <div className="flex-1 h-3 bg-bg-main rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min((m.marketplace.segments.curious / (m.marketplace.marketplaceEligible || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-[13px] font-black text-text-primary">{m.marketplace.segments.curious}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[13px] font-bold text-gray-400">COLD</span>
                  <div className="flex-1 h-3 bg-bg-main rounded-full overflow-hidden">
                    <div className="h-full bg-gray-300 rounded-full" style={{ width: `${Math.min((m.marketplace.segments.cold / (m.marketplace.marketplaceEligible || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-[13px] font-black text-text-primary">{m.marketplace.segments.cold}</span>
                </div>
              </div>

              {/* Founder Insight Box for Cohorts */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">
                  🧠 Cohort Insight Rules
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] font-medium">
                  <div className={`p-3 rounded-lg border ${m.marketplace.segments.cold > (m.marketplace.segments.hot + m.marketplace.segments.warm) ? 'bg-red-100 text-red-900 border-red-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Cold &gt; Hot + Warm</p>
                    <p className="text-[12px]">🔴 Urgency exists but value proposition not converting. (Seeing but not acting)</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${m.marketplace.segments.curious > m.marketplace.segments.warm ? 'bg-yellow-100 text-yellow-900 border-yellow-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Curious &gt; Warm</p>
                    <p className="text-[12px]">🟡 Interest high, commitment weak. Optimize marketplace copy / CTA.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${m.marketplace.segments.hot >= 10 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-white/50 text-indigo-800 border-indigo-200/50'}`}>
                    <p className="font-bold mb-1">If Hot ≥ 10</p>
                    <p className="text-[12px]">🟢 Enough high-intent leads for pilot commerce test. Initiate partner talks.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Commerce Integration Gate */}
            <section className="card-base p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">
                  Commerce Integration Gate
                </h2>
                <span className={`text-[12px] font-black px-3 py-1 rounded-full ${commerceGateOpen ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {commerceGateOpen ? '✅ AÇIK (HAZIR)' : '🔒 KİLİTLİ (ERKEN)'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {commerceGateChecks.map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-[13px]">
                    <span>{c.pass ? '✅' : '❌'}</span>
                    <span className={c.pass ? 'text-text-primary' : 'text-text-secondary'}>{c.label}</span>
                  </div>
                ))}
              </div>
              {!commerceGateOpen && (
                <p className="mt-3 text-[12px] text-text-secondary">
                  Commerce sprint'ine başlamadan önce gerçek niyet verilerinin bu eşikleri geçmesi beklenmektedir.
                </p>
              )}
            </section>

            {/* Marketplace gate */}
            <section className="card-base p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">
                  Marketplace Gate
                </h2>
                <span className={`text-[12px] font-black px-3 py-1 rounded-full ${gateOpen ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {gateOpen ? '✅ AÇIK' : '🔒 KİLİTLİ'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {gateChecks.map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-[13px]">
                    <span>{c.pass ? '✅' : '❌'}</span>
                    <span className={c.pass ? 'text-text-primary' : 'text-text-secondary'}>{c.label}</span>
                  </div>
                ))}
              </div>
              {!gateOpen && (
                <p className="mt-3 text-[12px] text-text-secondary">
                  Tüm koşullar sağlandığında Insurance Marketplace ve Quote Engine aktifleşir.
                </p>
              )}
            </section>

            {/* Outreach pipeline summary */}
            {pipeline && (
              <section className="card-base p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Outreach Pipeline</h2>
                  <Link href="/admin/outreach" className="text-[12px] font-bold text-primary hover:underline">Tümünü Gör →</Link>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Toplam', value: pipeline.total },
                    { label: 'Contacted', value: pipeline.contacted },
                    { label: 'Activated', value: pipeline.activated },
                    { label: 'Conv.', value: `${pipeline.conversionPct}%` },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{s.label}</p>
                      <p className="text-xl font-black text-text-primary mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
                {pipeline.total === 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-[12px] text-amber-800 font-semibold">⚠️ Pipeline boş — outreach'e henüz başlanmadı.</p>
                    <Link href="/admin/outreach" className="text-[12px] font-bold text-amber-900 underline">İlk klinik / creator'ı ekle →</Link>
                  </div>
                )}
              </section>
            )}

            {/* Analytics sanity check */}
            <section className="card-base p-5 mb-6">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">
                Analytics Sanity Check
              </h2>
              <p className="text-[12px] text-text-secondary mb-3">
                Event stream canlı mı? Son 24 saatte event geliyor mu?
              </p>
              <div className="rounded-xl bg-bg-main border border-border-main p-3 font-mono text-[11px] text-text-secondary">
                <p className="text-primary font-bold mb-1">-- Supabase SQL Editor'de çalıştır:</p>
                <p>SELECT event, COUNT(*)</p>
                <p>FROM event_stream</p>
                <p>WHERE ts &gt; now() - interval '24 hours'</p>
                <p>GROUP BY event</p>
                <p>ORDER BY count DESC;</p>
                <p className="mt-2 text-amber-600">-- Sonuç boşsa → analytics pipeline kırık</p>
              </div>
            </section>

            {/* Weekly cadence reminder */}
            <section className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
              <h2 className="text-[13px] font-black text-amber-800 uppercase tracking-widest mb-3">
                Haftalık Operasyon Ritmi
              </h2>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                {[
                  { day: 'Pazartesi', icon: '📊', label: 'Funnel Review', detail: 'Hangi adımda kayıp var?' },
                  { day: 'Çarşamba',  icon: '💰', label: 'Monetization', detail: 'CTA CTR, upgrade conv.' },
                  { day: 'Cuma',      icon: '🛡️', label: 'Health Review', detail: 'Alert log, ödeme hataları' },
                ].map(r => (
                  <div key={r.day} className="text-center">
                    <p className="text-[18px]">{r.icon}</p>
                    <p className="font-black text-amber-900">{r.day}</p>
                    <p className="font-semibold text-amber-800">{r.label}</p>
                    <p className="text-amber-600">{r.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
