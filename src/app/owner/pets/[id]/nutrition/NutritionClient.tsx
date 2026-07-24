'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calculateRefillRisk } from '@/lib/nutrition/refill-engine'
import CoachMark from '@/components/ui/CoachMark'
import { SmartScanner } from '@/components/ui/SmartScanner'
import { BarcodeScanner } from '@/components/ui/BarcodeScanner'
import SmartCardBanner from '@/components/profiling/SmartCardBanner'
import { StepperInput } from '@/components/ui/StepperInput'
import { Modal } from '@/components/ui/Modal'

// Tabs
const TABS = ['Mama & Stok', 'Öğünler & Hatırlatıcı', 'Kilo Takibi'] as const
type Tab = typeof TABS[number]

const FOOD_FORM_OPTIONS = [
  { value: 'dry', label: 'Kuru Mama' },
  { value: 'wet_pate', label: 'Ezme Yaş Mama' },
  { value: 'wet_gravy', label: 'Soslu Yaş Mama' },
  { value: 'wet_jelly', label: 'Jöleli Yaş Mama' },
  { value: 'broth', label: 'Çorba / Et Suyu' },
  { value: 'semi_moist', label: 'Yarı Nemli Mama' },
  { value: 'freeze_dried', label: 'Dondurularak Kurutulmuş (Freeze-Dried)' },
  { value: 'air_dried', label: 'Havada Kurutulmuş (Air-Dried)' },
  { value: 'raw_frozen', label: 'Çiğ / Dondurulmuş (BARF)' },
  { value: 'fresh_cooked', label: 'Taze Pişirilmiş Ev Yemeği' },
  { value: 'other', label: 'Diğer' }
]

function getFoodFormLabel(formValue?: string): string {
  if (!formValue) return 'Mama'
  const found = FOOD_FORM_OPTIONS.find(o => o.value === formValue)
  return found ? found.label : formValue
}

export default function NutritionClient({
  pet,
  profile,
  inventory,
  feedingLogs,
  weightLogs,
  assignments = []
}: {
  pet: any
  profile: any
  inventory: any
  feedingLogs: any[]
  weightLogs: any[]
  assignments?: any[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Mama & Stok')
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showBarcodeCamera, setShowBarcodeCamera] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)

  // Assignment Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<'search' | 'barcode' | 'manual'>('search')
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null)
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null)

  // Catalog Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [matchedBrands, setMatchedBrands] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any | null>(null)

  // Barcode Search States
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isBarcodeSearching, setIsBarcodeSearching] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState<any | null>(null)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)

  // Manual & Portion Input States
  const [brandText, setBrandText] = useState('')
  const [productText, setProductText] = useState('')
  const [foodForm, setFoodForm] = useState('dry')
  const [portionMode, setPortionMode] = useState<'daily' | 'meal'>('daily')
  const [gramsInput, setGramsInput] = useState<number>(100)
  const [mealsInput, setMealsInput] = useState<number>(2)

  // Product Autocomplete Combobox States
  const [productSuggestions, setProductSuggestions] = useState<any[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const [selectedManualFamilyId, setSelectedManualFamilyId] = useState<string | null>(null)

  // Active Primary Assignment
  const activePrimary = assignments.find((a: any) => a.is_primary && !a.ended_at) || null

  // Engine Calcs
  const dailyUsage = activePrimary?.daily_target_grams ?? (inventory?.estimated_daily_usage as number) ?? (profile?.daily_grams as number) ?? 0
  const currentStock = (inventory?.current_stock_grams as number) ?? 0
  const refillStatus = calculateRefillRisk({ stockGrams: currentStock, dailyUsage })

  const hasUsage = dailyUsage > 0
  const showBanner = hasUsage && (refillStatus.risk === 'WARNING' || refillStatus.risk === 'CRITICAL')
  const badgeClass = refillStatus.risk === 'CRITICAL' ? 'text-red-500' : refillStatus.risk === 'WARNING' ? 'text-orange-500' : 'text-green-500'
  const riskLabel = hasUsage ? `${refillStatus.daysLeft} gün kaldı` : 'Kullanım belirtilmedi'

  // Calculated per meal and total daily grams
  const computedDailyGrams = portionMode === 'meal' ? gramsInput * mealsInput : gramsInput
  const computedPerMealGrams = mealsInput > 0 ? Math.round(computedDailyGrams / mealsInput) : computedDailyGrams

  // ── Search API Handler ──
  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      setMatchedBrands([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/nutrition/catalog/search?q=${encodeURIComponent(query)}&species=${pet.species || 'dog'}`)
      const json = await res.json()
      setSearchResults(json.products || json.data || [])
      setMatchedBrands(json.brands || [])
    } catch (err) {
      console.error('Catalog search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // ── Product Suggestions Autocomplete Handler ──
  async function fetchProductSuggestions(brand: string, query: string) {
    const searchTarget = query.trim() || brand.trim()
    if (searchTarget.length < 2) {
      setProductSuggestions([])
      return
    }
    setIsFetchingSuggestions(true)
    try {
      const res = await fetch(`/api/nutrition/catalog/search?q=${encodeURIComponent(searchTarget)}&species=${pet.species || 'dog'}&include_pending=true&limit=20`)
      const json = await res.json()
      setProductSuggestions(json.products || json.data || [])
    } catch (err) {
      console.error('Catalog suggestions fetch error:', err)
    } finally {
      setIsFetchingSuggestions(false)
    }
  }

  function handleSelectSuggestion(item: any) {
    setProductText(item.official_name)
    if (item.brand?.display_name && (!brandText || brandText.trim() === '' || brandText === 'Diğer')) {
      setBrandText(item.brand.display_name)
    }
    if (item.food_form) {
      setFoodForm(item.food_form)
    }
    if (item.verification_status === 'verified') {
      setSelectedManualFamilyId(item.product_family_id)
    } else {
      setSelectedManualFamilyId(null) // Pending selection is saved as free-text manual entry
    }
    setShowSuggestionsDropdown(false)
  }

  // ── Barcode API Handler ──
  async function handleBarcodeLookup(code: string) {
    const clean = code.trim()
    if (!clean) return
    setIsBarcodeSearching(true)
    setBarcodeError(null)
    setBarcodeResult(null)

    try {
      const res = await fetch(`/api/nutrition/catalog/gtin/${clean}`)
      const json = await res.json()

      if (!res.ok) {
        setBarcodeError('Barkodlu ürün katalogda bulunamadı. Lütfen elle ekleyin.')
      } else {
        setBarcodeResult(json.data)
      }
    } catch (err) {
      setBarcodeError('Barkodlu ürün katalogda bulunamadı. Lütfen elle ekleyin.')
    } finally {
      setIsBarcodeSearching(false)
    }
  }

  // ── Submit New Assignment ──
  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setApiErrorMessage(null)

    try {
      const payload: any = {
        daily_target_grams: computedDailyGrams,
        meals_per_day: mealsInput,
        is_primary: true,
        measurement_method: selectedCatalogItem || barcodeResult ? 'package_scan' : 'owner_confirmed',
        source: selectedCatalogItem || barcodeResult ? 'catalog' : 'manual'
      }

      if (selectedCatalogItem) {
        payload.food_product_family_id = selectedCatalogItem.product_family_id
        if (selectedCatalogItem.skus?.[0]?.sku_id) {
          payload.food_sku_id = selectedCatalogItem.skus[0].sku_id
        }
      } else if (barcodeResult) {
        payload.food_product_family_id = barcodeResult.product_family?.id
        payload.food_sku_id = barcodeResult.food_sku_id
      } else if (selectedManualFamilyId) {
        payload.food_product_family_id = selectedManualFamilyId
        payload.food_form = foodForm
        payload.source = 'catalog'
        payload.measurement_method = 'owner_confirmed'
      } else {
        payload.brand_free_text = brandText.trim() || 'Diğer'
        payload.product_free_text = productText.trim() || 'Mama'
        payload.food_form = foodForm
        payload.source = 'manual'
        payload.measurement_method = 'owner_confirmed'
      }

      const res = await fetch(`/api/pets/${pet.id}/nutrition/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 409 || json.error === 'ACTIVE_PRIMARY_FOOD_EXISTS') {
          setApiErrorMessage('Bu pet için halihazırda aktif bir mama kaydı mevcuttur.')
        } else {
          setApiErrorMessage(json.message || json.error || 'Mama kaydı oluşturulamadı.')
        }
        return
      }

      setShowAddModal(false)
      resetModalState()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // ── Submit Assignment Edit ──
  async function handleUpdateAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssignment) return
    setLoading(true)
    setApiErrorMessage(null)

    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/assignments/${editingAssignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_target_grams: Number(editingAssignment.daily_target_grams),
          meals_per_day: Number(editingAssignment.meals_per_day)
        })
      })

      const json = await res.json()

      if (!res.ok) {
        setApiErrorMessage(json.message || 'Güncelleme yapılamadı.')
        return
      }

      setEditingAssignment(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // ── Save Allergy and Sensitivity Notes ──
  async function handleSaveAllergies(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const allergyRaw = fd.get('allergy_info')?.toString() || ''
    const allergyArray = allergyRaw.split(',').map(s => s.trim()).filter(Boolean)
    const sensitivityNotes = fd.get('sensitivity_notes')?.toString() || ''

    try {
      await fetch(`/api/pets/${pet.id}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allergy_info: allergyArray,
          sensitivity_notes: sensitivityNotes
        })
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function resetModalState() {
    setSelectedCatalogItem(null)
    setBarcodeResult(null)
    setBarcodeError(null)
    setShowBarcodeCamera(false)
    setSearchQuery('')
    setSearchResults([])
    setBarcodeInput('')
    setBrandText('')
    setProductText('')
    setFoodForm('dry')
    setGramsInput(100)
    setMealsInput(2)
    setPortionMode('daily')
    setApiErrorMessage(null)
    setProductSuggestions([])
    setShowSuggestionsDropdown(false)
    setSelectedManualFamilyId(null)
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
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto max-w-2xl px-3 sm:px-0">
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
            onClick={() => {
              setShowAddModal(true)
              setAddMode('search')
            }}
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
              className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap min-h-[44px] ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Mama & Stok ── */}
      {activeTab === 'Mama & Stok' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Active Primary Food OR Empty State */}
          {!activePrimary ? (
            <div className="card-base p-6 text-center flex flex-col items-center gap-3 border-2 border-dashed border-border-main bg-surface/50">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-[28px]">
                🥣
              </div>
              <div>
                <h3 className="font-extrabold text-[18px] text-text-primary">Mama bilgilerini ekle</h3>
                <p className="text-[13px] text-text-secondary mt-1 max-w-sm">
                  Öğün düzenini oluşturmak ve ileride stok takibi yapmak için kullandığı mamayı ekleyin.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(true)
                  setAddMode('search')
                }}
                className="btn-primary min-h-[48px] px-8 text-[14px] font-bold mt-2 shadow-md shadow-primary/20"
              >
                Mama ekle
              </button>
            </div>
          ) : (
            <div className="card-base p-5 border-l-4 border-l-primary flex flex-col gap-3 relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-primary/10 text-primary text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Aktif Mama
                  </span>
                  <h3 className="font-extrabold text-text-primary text-[18px] mt-1 leading-tight">
                    {activePrimary.food_product_family?.brand?.display_name || activePrimary.brand_free_text || 'Mama'}
                  </h3>
                  <p className="text-[13px] text-text-secondary font-medium">
                    {activePrimary.food_product_family?.official_name || activePrimary.product_free_text || 'Özel Formül'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingAssignment(activePrimary)}
                  className="px-4 py-2 bg-bg-main hover:bg-border-main text-text-primary font-bold text-[13px] rounded-xl transition-colors min-h-[44px] flex items-center"
                >
                  Düzenle
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-bg-main p-3 rounded-xl mt-1">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Form</p>
                  <p className="text-[12px] font-extrabold text-text-primary truncate">
                    {getFoodFormLabel(activePrimary.food_product_family?.food_form || activePrimary.food_form)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Günlük Hedef</p>
                  <p className="text-[12px] font-extrabold text-text-primary">
                    {activePrimary.daily_target_grams || 0} g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Öğün Başı</p>
                  <p className="text-[12px] font-extrabold text-text-primary">
                    {Math.round((activePrimary.daily_target_grams || 0) / (activePrimary.meals_per_day || 1))} g ({activePrimary.meals_per_day || 1} öğün)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-base p-5 border-l-4 border-l-amber-500">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Mevcut Mama</p>
              <p className="font-bold text-text-primary text-[15px] leading-tight">
                {activePrimary?.food_product_family?.brand?.display_name || activePrimary?.brand_free_text || 'Eklenmedi'}
              </p>
              <p className="text-[12px] text-text-secondary">
                {activePrimary?.food_product_family?.official_name || activePrimary?.product_free_text || ''}
              </p>
            </div>
            <div className="card-base p-5 relative overflow-hidden">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Kalan Stok</p>
              <p className={`font-black text-[22px] ${badgeClass}`}>
                {currentStock ? `${(currentStock / 1000).toFixed(1)} kg` : 'Stok Belirtilmedi'}
              </p>
              <p className="text-[11px] font-bold text-text-secondary">{riskLabel}</p>
            </div>
          </div>

          {/* Alerji & Hassasiyet Bilgileri (Korunan Profil Alanı) */}
          <div className="card-base p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">⚠️</span>
              <h3 className="font-extrabold text-[15px] text-text-primary">Alerji ve Hassasiyet Notları</h3>
            </div>
            <form onSubmit={handleSaveAllergies} className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-bold text-text-secondary">Bilinen Alerjiler (Virgülle Ayırın)</label>
                <input
                  name="allergy_info"
                  defaultValue={Array.isArray(profile?.allergy_info) ? profile.allergy_info.join(', ') : profile?.allergy_info || ''}
                  placeholder="Örn: Tavuk eti, Sığır eti, Tahıl"
                  className="input-base min-h-[44px] text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-text-secondary">Özel Hassasiyet / Sindirim Notları</label>
                <textarea
                  name="sensitivity_notes"
                  defaultValue={profile?.sensitivity_notes || ''}
                  placeholder="Örn: Mide hassasiyeti var, soğuk su içince kusabilir."
                  rows={2}
                  className="input-base text-[13px] py-2"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-secondary min-h-[44px] text-[13px] font-bold self-end px-6"
              >
                Alerji Notlarını Kaydet
              </button>
            </form>
          </div>

          {/* Premium Akıllı Tarama Banner */}
          <div 
            onClick={() => {
              setShowAddModal(true)
              setAddMode('barcode')
            }}
            className="card-base p-5 bg-gradient-to-r from-primary to-primary-soft text-white relative overflow-hidden group cursor-pointer shadow-lg shadow-primary/20 min-h-[48px]"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-[24px]">📷</span>
                <div>
                  <h3 className="font-extrabold text-[15px]">Barkod ile Mama Ekle</h3>
                  <p className="text-[12px] text-white/90 font-medium">Paket üzerindeki barkodu okutarak mamayı saniyeler içinde ekleyin</p>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Öğünler & Hatırlatıcı ── */}
      {activeTab === 'Öğünler & Hatırlatıcı' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
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
              <button type="submit" disabled={loading} className="btn-primary w-full min-h-[48px] flex items-center justify-center">Kaydet</button>
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
              <button type="submit" disabled={loading} className="btn-primary px-8 min-h-[48px] flex items-center justify-center">Ekle</button>
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

      {/* ── MAMA EKLEME MODAL (Food Setup Modal) ── */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetModalState() }} title="Mama Ekle">
        <div className="flex flex-col gap-4">
          {/* Mode Tabs */}
          <div className="flex bg-bg-main p-1 rounded-xl border border-border-main">
            <button
              onClick={() => { setAddMode('search'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'search' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              🔍 Mamayı Ara
            </button>
            <button
              onClick={() => { setAddMode('barcode'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'barcode' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              📷 Barkod ile Bul
            </button>
            <button
              onClick={() => { setAddMode('manual'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              ✍️ Listede Yok / Elle
            </button>
          </div>

          {apiErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold rounded-xl">
              ⚠️ {apiErrorMessage}
            </div>
          )}

          {/* Mode 1: Search */}
          {addMode === 'search' && !selectedCatalogItem && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Mama markası veya ürün adı yazın..."
                className="input-base min-h-[48px] text-[14px]"
              />

              {isSearching && <p className="text-[13px] text-text-secondary font-bold text-center py-4">Katalog aranıyor...</p>}

              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                matchedBrands.length > 0 ? (
                  <div className="p-4 text-center bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col items-center gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-[15px]">
                      <span>🏷️</span>
                      <h4>{matchedBrands[0].display_name} markası bulundu</h4>
                    </div>
                    <p className="text-[12px] text-amber-800 font-medium">
                      Bu markanın seçtiğiniz ürünü henüz doğrulanmış katalogda bulunmuyor. Ürün adını elle ekleyebilirsiniz.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode('manual')
                        setBrandText(matchedBrands[0].display_name)
                      }}
                      className="btn-primary text-[13px] font-bold py-2.5 px-5 min-h-[44px] mt-1 shadow-sm"
                    >
                      {matchedBrands[0].display_name} ile devam et ✍️
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-bg-main rounded-xl flex flex-col items-center gap-2">
                    <p className="text-[13px] text-text-secondary font-medium">Aradığınız mama katalogda bulunamadı.</p>
                    <button
                      type="button"
                      onClick={() => { setAddMode('manual'); setBrandText(searchQuery) }}
                      className="btn-secondary text-[13px] font-bold py-2 px-4 min-h-[44px]"
                    >
                      Listede yok, elle ekle ✍️
                    </button>
                  </div>
                )
              )}

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {searchResults.map(item => (
                  <div
                    key={item.product_family_id}
                    onClick={() => setSelectedCatalogItem(item)}
                    className="p-3 border border-border-main rounded-xl hover:border-primary/50 cursor-pointer bg-white transition-colors"
                  >
                    <p className="font-extrabold text-[14px] text-text-primary">{item.brand?.display_name}</p>
                    <p className="text-[12px] text-text-secondary font-medium">{item.official_name}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                      {getFoodFormLabel(item.food_form)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode 2: Barcode */}
          {addMode === 'barcode' && !barcodeResult && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Barkod numarasını girin..."
                  className="input-base flex-1 min-h-[48px] text-[14px]"
                />
                <button
                  onClick={() => handleBarcodeLookup(barcodeInput)}
                  disabled={isBarcodeSearching || !barcodeInput.trim()}
                  className="btn-primary px-4 min-h-[48px] text-[13px] font-bold"
                >
                  Bul
                </button>
              </div>

              {/* Kamera Tarama Seçeneği */}
              <button
                type="button"
                onClick={() => setShowBarcodeCamera(true)}
                className="btn-secondary min-h-[44px] flex items-center justify-center gap-2 text-[13px] font-bold"
              >
                📷 Kamerayı Aç ve EAN/UPC Barkodu Tara
              </button>

              {isBarcodeSearching && <p className="text-[13px] text-text-secondary font-bold text-center py-4">Barkod sorgulanıyor...</p>}

              {barcodeError && (
                <div className="p-4 text-center bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center gap-2">
                  <p className="text-[13px] text-amber-800 font-medium">{barcodeError}</p>
                  <button
                    onClick={() => setAddMode('manual')}
                    className="btn-primary text-[13px] font-bold py-2 px-4 min-h-[44px]"
                  >
                    Listede Yok, Elle Ekle ✍️
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selected Item Preview (Search or Barcode) */}
          {(selectedCatalogItem || barcodeResult) && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase">Seçilen Katalog Ürünü</p>
                <p className="font-black text-[15px] text-text-primary">
                  {selectedCatalogItem?.brand?.display_name || barcodeResult?.brand?.display_name}
                </p>
                <p className="text-[12px] text-text-secondary">
                  {selectedCatalogItem?.official_name || barcodeResult?.product_family?.official_name}
                </p>
              </div>
              <button
                onClick={() => { setSelectedCatalogItem(null); setBarcodeResult(null) }}
                className="text-[12px] text-red-500 font-bold hover:underline min-h-[44px] px-2"
              >
                Değiştir
              </button>
            </div>
          )}

          {/* Mode 3: Manual Input Fields with Autocomplete Combobox */}
          {addMode === 'manual' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-bold text-text-secondary">Mama Markası *</label>
                <input
                  type="text"
                  value={brandText}
                  onChange={e => {
                    const val = e.target.value
                    setBrandText(val)
                    setSelectedManualFamilyId(null)
                    if (val.trim().length >= 2) {
                      fetchProductSuggestions(val, productText)
                      setShowSuggestionsDropdown(true)
                    } else {
                      setProductSuggestions([])
                      setShowSuggestionsDropdown(false)
                    }
                  }}
                  placeholder="Örn: Royal Canin / Ev Yapımı"
                  className="input-base min-h-[44px]"
                />
              </div>
              <div className="relative">
                <label className="text-[12px] font-bold text-text-secondary">Ürün / Çeşit Adı</label>
                <input
                  type="text"
                  value={productText}
                  onChange={e => {
                    const val = e.target.value
                    setProductText(val)
                    setSelectedManualFamilyId(null)
                    if (val.trim().length >= 1 || brandText.trim().length >= 2) {
                      fetchProductSuggestions(brandText, val)
                      setShowSuggestionsDropdown(true)
                    }
                  }}
                  onFocus={() => {
                    if (brandText.trim().length >= 2 || productText.trim().length >= 1) {
                      fetchProductSuggestions(brandText, productText)
                      setShowSuggestionsDropdown(true)
                    }
                  }}
                  placeholder="Örn: Medium Adult Dog / Tavuklu ve Pirinçli"
                  className="input-base min-h-[44px]"
                />

                {/* Autocomplete Combobox Dropdown */}
                {showSuggestionsDropdown && (productSuggestions.length > 0 || isFetchingSuggestions) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-border-main">
                    {isFetchingSuggestions && productSuggestions.length === 0 ? (
                      <div className="p-3 text-[12px] text-text-secondary text-center font-bold">
                        Öneriler yükleniyor...
                      </div>
                    ) : (
                      productSuggestions.map((item: any) => {
                        const isPending = item.verification_status === 'pending'
                        return (
                          <div
                            key={item.product_family_id}
                            onClick={() => handleSelectSuggestion(item)}
                            className="p-3 hover:bg-surface cursor-pointer min-h-[44px] flex flex-col justify-center transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-[13px] text-text-primary">
                                {item.official_name}
                              </span>
                              {isPending ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md shrink-0">
                                  ⏳ Doğrulama bekliyor
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
                                  ✓ Doğrulanmış
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-secondary">
                              <span>{item.brand?.display_name}</span>
                              <span>•</span>
                              <span>{getFoodFormLabel(item.food_form)}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[12px] font-bold text-text-secondary">Mama Formu *</label>
                <select
                  value={foodForm}
                  onChange={e => setFoodForm(e.target.value)}
                  className="input-base min-h-[44px]"
                >
                  {FOOD_FORM_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Portion & Meals Step (Common for all selections) */}
          {(selectedCatalogItem || barcodeResult || addMode === 'manual') && (
            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-4 border-t border-border-main pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary">Miktar Giriş Tipi</label>
                <div className="flex bg-bg-main p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPortionMode('daily')}
                    className={`flex-1 py-1.5 text-[12px] font-bold rounded-md min-h-[44px] ${portionMode === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
                  >
                    Günlük Toplam Gram
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortionMode('meal')}
                    className={`flex-1 py-1.5 text-[12px] font-bold rounded-md min-h-[44px] ${portionMode === 'meal' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
                  >
                    Öğün Başı Gram
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold text-text-secondary">
                    {portionMode === 'daily' ? 'Günlük Gramaj *' : 'Öğün Başı Gram *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={gramsInput}
                    onChange={e => setGramsInput(Math.max(1, parseInt(e.target.value) || 0))}
                    className="input-base min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-text-secondary">Günlük Öğün Sayısı *</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={mealsInput}
                    onChange={e => setMealsInput(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="input-base min-h-[44px]"
                    required
                  />
                </div>
              </div>

              {/* Calculation Summary Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[13px] font-bold text-center">
                Özet: Günde {mealsInput} öğün × {computedPerMealGrams} g = {computedDailyGrams} g
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary min-h-[48px] w-full text-[14px] font-bold shadow-md shadow-primary/20"
              >
                {loading ? 'Kaydediliyor...' : 'Mama Kaydını Tamamla'}
              </button>
            </form>
          )}
        </div>
      </Modal>

      {/* ── EDIT ASSIGNMENT MODAL ── */}
      <Modal isOpen={!!editingAssignment} onClose={() => setEditingAssignment(null)} title="Mama Düzenle">
        {editingAssignment && (
          <form onSubmit={handleUpdateAssignment} className="flex flex-col gap-4">
            {apiErrorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold rounded-xl">
                ⚠️ {apiErrorMessage}
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold text-text-secondary uppercase">Mama Bilgisi</p>
              <p className="font-extrabold text-[16px] text-text-primary">
                {editingAssignment.food_product_family?.brand?.display_name || editingAssignment.brand_free_text || 'Mama'}
              </p>
            </div>

            <div>
              <label className="text-[12px] font-bold text-text-secondary">Günlük Toplam Gram *</label>
              <input
                type="number"
                min="1"
                value={editingAssignment.daily_target_grams || ''}
                onChange={e => setEditingAssignment({ ...editingAssignment, daily_target_grams: e.target.value })}
                className="input-base min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-bold text-text-secondary">Günlük Öğün Sayısı *</label>
              <input
                type="number"
                min="1"
                max="24"
                value={editingAssignment.meals_per_day || ''}
                onChange={e => setEditingAssignment({ ...editingAssignment, meals_per_day: e.target.value })}
                className="input-base min-h-[44px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-[48px] w-full text-[14px] font-bold mt-2"
            >
              {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>
        )}
      </Modal>

      {/* Real EAN/UPC Barcode Camera Scanner */}
      {showBarcodeCamera && (
        <BarcodeScanner
          onScanSuccess={(code) => {
            setShowBarcodeCamera(false)
            setBarcodeInput(code)
            handleBarcodeLookup(code)
          }}
          onClose={() => setShowBarcodeCamera(false)}
        />
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
