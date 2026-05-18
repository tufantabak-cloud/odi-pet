'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculateRefillRisk } from '@/lib/nutrition/refill-engine'

// Tabs
const TABS = ['Mama & Stok', 'Öğünler & Hatırlatıcı', 'Kilo Takibi'] as const
type Tab = typeof TABS[number]

export default function NutritionClient({
  pet,
  profile,
  inventory,
  feedingLogs,
  weightLogs,
}: {
  pet: any
  profile: any
  inventory: any
  feedingLogs: any[]
  weightLogs: any[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Mama & Stok')
  const [loading, setLoading] = useState(false)
  
  // Reminders state (Mocked for MVP UI)
  const [reminders, setReminders] = useState<{time: string, enabled: boolean}[]>([
    { time: '08:00', enabled: true },
    { time: '19:00', enabled: true }
  ])

  // Engine Calcs
  const dailyUsage = (inventory?.estimated_daily_usage as number) ?? (profile?.daily_grams as number) ?? 0;
  const currentStock = (inventory?.current_stock_grams as number) ?? 0;
  const refillStatus = calculateRefillRisk({ stockGrams: currentStock, dailyUsage })

  const hasUsage = dailyUsage > 0;
  const showBanner = hasUsage && (refillStatus.risk === 'WARNING' || refillStatus.risk === 'CRITICAL');
  const badgeClass = refillStatus.risk === 'CRITICAL' ? 'text-red-500' : refillStatus.risk === 'WARNING' ? 'text-orange-500' : 'text-green-500';
  const riskLabel = hasUsage ? `${refillStatus.daysLeft} gün kaldı` : 'Kullanım belirtilmedi';

  async function handleUpdateBrandAndStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      // 1. Update Profile (Brand & Grams)
      await fetch(`/api/pets/${pet.id}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_brand: fd.get('food_brand'),
          food_product: fd.get('food_product'),
          food_type: fd.get('food_type'),
          daily_grams: fd.get('daily_grams'),
        }),
      })

      // 2. Update Inventory (Stock)
      await fetch(`/api/pets/${pet.id}/nutrition/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stock_grams: fd.get('current_stock_grams'),
          estimated_daily_usage: fd.get('daily_grams'), // Sync
        }),
      })

      router.refresh()
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
        body: JSON.stringify({ weight_kg: fd.get('weight_kg') }),
      })
      e.currentTarget.reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto">
      {/* Header */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profile Dön
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[28px]">🍗</span>}
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Beslenme Planı</h1>
          <p className="text-text-secondary font-medium">Mama, stok ve öğün takibi</p>
        </div>
      </div>

      {showBanner && (
        <div className="p-4 rounded-xl border-l-4 font-medium text-[14px] bg-red-50 border-red-500 text-red-800">
          🚨 Mama stoğunuz azalıyor! Tahmini <strong>{refillStatus.daysLeft} gün</strong> yetecek mama kaldı.
        </div>
      )}

      {/* Tabs */}
      <div className="relative sticky top-16 z-30 after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-bg-main after:to-transparent after:pointer-events-none after:z-10">
        <div className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main overflow-x-auto hide-scrollbar">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Mama & Stok ── */}
      {activeTab === 'Mama & Stok' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Stok Durumu Özeti */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-base p-5 border-l-4 border-l-primary">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Mevcut Mama</p>
              <p className="font-bold text-text-primary text-[16px] leading-tight">{profile?.food_brand || 'Marka Girilmedi'}</p>
              <p className="text-[12px] text-text-secondary">{profile?.food_product}</p>
            </div>
            <div className="card-base p-5 relative overflow-hidden">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Kalan Stok</p>
              <p className={`font-black text-[24px] ${badgeClass}`}>{currentStock ? `${(currentStock / 1000).toFixed(1)} kg` : 'Yok'}</p>
              <p className="text-[12px] font-bold text-text-secondary">Tahmini: {riskLabel}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateBrandAndStock} className="card-base p-6 flex flex-col gap-6 mt-2">
            <h3 className="font-extrabold text-[16px] text-text-primary">Mama Bilgilerini Güncelle</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Marka *</label>
                <input name="food_brand" defaultValue={profile?.food_brand || ''} className="input-base" placeholder="Örn: Royal Canin" required/>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Ürün / Çeşit</label>
                <input name="food_product" defaultValue={profile?.food_product || ''} className="input-base" placeholder="Örn: Sterilised 37"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Mama Türü</label>
                <select name="food_type" defaultValue={profile?.food_type || 'dry'} className="input-base">
                  <option value="dry">Kuru Mama</option>
                  <option value="wet">Yaş Mama</option>
                  <option value="raw">Çiğ / BARF</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Günlük Tüketim (Gram)</label>
                <input name="daily_grams" type="number" defaultValue={profile?.daily_grams || ''} className="input-base" placeholder="Örn: 50" required/>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border-main pt-5 mt-2">
              <label className="text-[12px] font-bold text-text-primary">Yeni Paket Açıldı mı?</label>
              <p className="text-[11px] text-text-secondary mb-2">Güncel stoğunuzu gram cinsinden girin (Örn: 2 kg = 2000 gram)</p>
              <input name="current_stock_grams" type="number" defaultValue={currentStock || ''} className="input-base" placeholder="Mevcut gramaj"/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary py-3.5 mt-2 shadow-lg shadow-primary/20">
              {loading ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Öğünler & Hatırlatıcı ── */}
      {activeTab === 'Öğünler & Hatırlatıcı' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          
          {/* Hatırlatıcı UI (MVP Mock) */}
          <div className="card-base p-6 border border-primary/20 bg-primary/5">
            <h3 className="font-extrabold text-[15px] text-primary mb-1">⏰ Öğün Hatırlatıcıları</h3>
            <p className="text-[12px] text-text-secondary mb-4">Bildirim alarak öğün saatlerini kaçırmayın.</p>
            
            <div className="flex flex-col gap-3">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-border-main">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]">🕒</span>
                    <span className="font-bold text-[16px] text-text-primary">{r.time}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={r.enabled} onChange={() => {
                      const newReminders = [...reminders];
                      newReminders[i].enabled = !newReminders[i].enabled;
                      setReminders(newReminders);
                    }}/>
                    <div className="w-11 h-6 bg-border-main rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
            <button className="text-[12px] font-bold text-primary mt-4 hover:underline">+ Yeni Saat Ekle</button>
          </div>

          {/* Günlük Giriş */}
          <form onSubmit={handleAddLog} className="card-base p-6">
            <h3 className="font-extrabold text-[15px] text-text-primary mb-4">Öğün Kaydet</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-text-secondary">Yenilen Miktar (g)</label>
                  <input name="amount_grams" type="number" className="input-base" placeholder="Örn: 25" required/>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-text-secondary">İştah Skoru (1-5)</label>
                  <input name="appetite_score" type="number" min="1" max="5" defaultValue="5" className="input-base" required/>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">Kaydet</button>
            </div>
          </form>

          {/* Geçmiş Öğünler */}
          <div className="card-base overflow-hidden">
            <h3 className="p-4 font-bold border-b border-border-main bg-surface/50">Son Öğünler</h3>
            {feedingLogs.length === 0 ? (
              <p className="p-6 text-center text-text-secondary text-[14px]">Henüz kayıt yok.</p>
            ) : (
              <div className="divide-y divide-border-main">
                {feedingLogs.slice(0, 10).map(l => (
                  <div key={l.id} className="p-4 flex items-center justify-between hover:bg-bg-main transition-colors">
                    <div>
                      <p className="font-bold text-text-primary text-[14px]">{l.amount_grams}g tüketildi</p>
                      <p className="text-[12px] text-text-secondary">{new Date(l.meal_time).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`w-3 h-3 rounded-full ${s <= (l.appetite_score || 0) ? 'bg-primary' : 'bg-border-main'}`}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Kilo Takibi ── */}
      {activeTab === 'Kilo Takibi' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <form onSubmit={handleAddWeight} className="card-base p-6">
            <h3 className="font-extrabold text-[15px] text-text-primary mb-4">Yeni Kilo Kaydı</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Kilo (kg)</label>
                <input name="weight_kg" type="number" step="0.1" className="input-base" placeholder="Örn: 4.5" required/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary px-8">Ekle</button>
            </div>
          </form>

          {weightLogs.length > 0 && (
            <div className="card-base overflow-hidden">
              <h3 className="p-4 font-bold border-b border-border-main bg-surface/50">Geçmiş Ölçümler</h3>
              <div className="divide-y divide-border-main">
                {weightLogs.map(w => (
                  <div key={w.id} className="p-4 flex items-center justify-between hover:bg-bg-main transition-colors">
                    <p className="font-bold text-text-primary text-[15px]">{w.weight_kg} kg</p>
                    <p className="text-[12px] text-text-secondary">{new Date(w.measured_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
