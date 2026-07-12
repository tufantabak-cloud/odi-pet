'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calculateRefillRisk } from '@/lib/nutrition/refill-engine'
import CoachMark from '@/components/ui/CoachMark'
import { SmartScanner } from '@/components/ui/SmartScanner'
import SmartCardBanner from '@/components/profiling/SmartCardBanner'
import { StepperInput } from '@/components/ui/StepperInput'

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
  const [showScanner, setShowScanner] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)

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
    const rawVal = fd.get('weight_kg')?.toString() || ''
    const sanitizedVal = rawVal.replace(',', '.')
    try {
      await fetch(`/api/pets/${pet.id}/nutrition/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: parseFloat(sanitizedVal) }),
      })
      e.currentTarget.reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto">
      {/* Header */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profile Dön
      </Link>

      <div className="flex items-center gap-4 relative">
        <CoachMark
          hintKey="nutrition_intro"
          title="Mama bilgisini gir"
          message="Mama markası ve günlük miktarı gir — sistem kalori ve porsiyon takibini otomatik hesaplasın."
          icon="🍗"
          position="bottom"
        />
        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <Image src={pet.avatar_url} fill={true} className="object-cover" alt="" /> : (
            <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm"><path d="M12 10c0-3.3 5.4-3.3 5.4 0 0 3.3 5.3 3.3 5.3 6.6S16 26 12 26 2.7 20 2.7 16.6C2.7 13.3 12 13.3 12 10z" fill="url(#nut-grad)" /><path d="M26 8c-2 0-3 2-3 4h6c0-2-1-4-3-4z" fill="#D1D5DB" /><defs><linearGradient id="nut-grad" x1="2" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#EF4444" /><stop offset="1" stopColor="#B91C1C" /></linearGradient></defs></svg>
          )}
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Beslenme Planı</h1>
          <p className="text-text-secondary font-medium">Mama, stok ve öğün takibi</p>
        </div>
      </div>

      {!inventory && !dismissedBanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <SmartCardBanner
            title="MAMA PORSİYONU HESAPLAMA"
            message={`${pet.name}'in günlük beslenme porsiyonunu hesaplayabilmemiz için hangi marka ve tip mama kullanıyorsun?`}
            ctaText="Akıllı Tarama ile Ekle"
            icon="🍗"
            gradient="from-amber-50 to-orange-50"
            iconBg="bg-amber-100 text-amber-700"
            onClick={() => setShowScanner(true)}
            onDismiss={() => setDismissedBanner(true)}
          />
        </div>
      )}

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

          {/* Premium Akıllı Tarama Banner */}
          <div 
            onClick={() => setShowScanner(true)}
            className="card-base p-6 bg-gradient-to-r from-primary to-primary-soft text-white relative overflow-hidden group cursor-pointer shadow-lg shadow-primary/30 mt-2"
          >
            <div className="absolute right-[-10px] bottom-[-20px] opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
              <svg viewBox="0 0 32 32" className="w-[100px] h-[100px] drop-shadow-sm"><rect x="4" y="8" width="24" height="18" rx="4" fill="#fff" stroke="url(#cam-grad)" strokeWidth="2"/><circle cx="16" cy="17" r="5" fill="url(#cam-grad)"/><path d="M12 8l2-4h4l2 4" fill="#fff" stroke="url(#cam-grad)" strokeWidth="2" strokeLinecap="round"/><defs><linearGradient id="cam-grad" x1="4" y1="4" x2="28" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#DB2777"/></linearGradient></defs></svg>
            </div>
            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">Odi Premium</span>
                <h3 className="font-extrabold text-[18px] leading-tight">Akıllı Tarama ile Diyet Değişimi</h3>
              </div>
              <p className="text-[13px] text-white/90 font-medium max-w-[85%] leading-relaxed">
                Mama paketinin fotoğrafını çekin, marka, stok ve bitiş tarihini yapay zeka saniyeler içinde ayarlasın.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateBrandAndStock} className="card-base p-6 flex flex-col gap-6 mt-2">
            <h3 className="font-extrabold text-[16px] text-text-primary">Manuel Olarak Güncelle</h3>

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
              <div className="flex flex-col gap-2 relative">
                <label className="text-[13px] font-bold text-text-primary">Günlük Tüketim (Ortalama)</label>
                <StepperInput name="daily_grams" min={1} step={10} unit="gram" defaultValue={profile?.daily_grams || ''} placeholder="Örn: 50" required className="w-full sm:w-fit" />
                <CoachMark id="nutrition_daily" title="Günlük Tüketim Önemli" message="Köpeğinizin yaşına ve kilosuna göre günlük gramajı belirlemek sağlıklı gelişim için kritiktir." position="top" />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border-main pt-5 mt-2">
              <label className="text-[12px] font-bold text-text-primary">Yeni Paket Açıldı mı?</label>
              <p className="text-[11px] text-text-secondary mb-2">Güncel stoğunuzu gram cinsinden girin (Örn: 2 kg = 2000 gram)</p>
              <input name="current_stock_grams" type="number" defaultValue={currentStock || ''} className="input-base" placeholder="Mevcut gramaj"/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary min-h-[50px] flex items-center justify-center mt-2 shadow-lg shadow-primary/20">
              {loading ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Öğünler & Hatırlatıcı ── */}
      {activeTab === 'Öğünler & Hatırlatıcı' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Günlük Giriş */}
          <form onSubmit={handleAddLog} className="card-base p-6">
            <h3 className="font-extrabold text-[15px] text-text-primary mb-4">Öğün Kaydet</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">Miktar</label>
                  <StepperInput name="amount_grams" min={1} step={5} unit="gram" placeholder="Örn: 25" required className="w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">İştah Skoru</label>
                  <StepperInput name="appetite_score" min={1} max={5} step={1} defaultValue="5" required className="w-full" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full min-h-[50px] flex items-center justify-center">Kaydet</button>
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
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Kilo *</label>
                <StepperInput name="weight_kg" step={0.1} unit="kg" placeholder="Örn: 4.5" required className="w-full sm:w-fit" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary px-8 min-h-[50px] flex items-center justify-center">Ekle</button>
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
      {showScanner && (
        <SmartScanner 
          petId={pet.id} 
          onClose={() => setShowScanner(false)} 
          onSave={() => {
            setShowScanner(false);
            router.refresh();
          }} 
        />
      )}
    </div>
  )
}
