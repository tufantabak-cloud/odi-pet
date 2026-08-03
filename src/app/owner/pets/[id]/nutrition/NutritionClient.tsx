'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calculateRefillRisk } from '@/lib/nutrition/refill-engine'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CoachMark from '@/components/ui/CoachMark'
import { SmartScanner } from '@/components/ui/SmartScanner'
import { BarcodeScanner } from '@/components/ui/BarcodeScanner'
import SmartCardBanner from '@/components/profiling/SmartCardBanner'
import { StepperInput } from '@/components/ui/StepperInput'
import { RulerPicker } from '@/components/ui/RulerPicker'
import { Modal } from '@/components/ui/Modal'
import WeightChangeChart from '@/components/pets/WeightChangeChart'
import WeightGoalBand from '@/components/pets/WeightGoalBand'
import { assessWeight } from '@/lib/vetStandards/weightStandards'
import { ScaleIcon, UtensilsIcon } from '@/components/icons/PetIcons'
import StockTimeline from '@/components/nutrition/StockTimeline'

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
  assignments = [],
  nutritionPlans = [],
  embedded = false
}: {
  pet: any
  profile: any
  inventory: any
  feedingLogs: any[]
  weightLogs: any[]
  assignments?: any[]
  nutritionPlans?: any[]
  embedded?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const getInitialTab = (): Tab => {
    const rawTab = searchParams ? searchParams.get('tab')?.toLowerCase().trim() : null
    if (rawTab === 'kilo' || rawTab === 'kilo-takibi' || rawTab === 'kilo_takibi' || rawTab === 'weight' || rawTab === 'kilo takibi' || rawTab === 'gelisim' || rawTab === 'gelişim') {
      return 'Kilo Takibi'
    }
    if (rawTab === 'ogun' || rawTab === 'ogunler' || rawTab === 'meals' || rawTab === 'öğünler' || rawTab === 'ogunler & hatirlatici' || rawTab === 'öğünler & hatırlatıcı') {
      return 'Öğünler & Hatırlatıcı'
    }
    return 'Mama & Stok'
  }

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)

  useEffect(() => {
    const tabFromUrl = getInitialTab()
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showBarcodeCamera, setShowBarcodeCamera] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)

  // OPOS Cilt 3: native alert()/confirm() yerine inline hata + ConfirmModal.
  const [uiError, setUiError] = useState<string | null>(null)
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null)
  const [weightLogToDelete, setWeightLogToDelete] = useState<string | null>(null)
  const showApiError = (message: string) => {
    setUiError(message)
    setTimeout(() => setUiError(null), 5000)
  }

  // Ruler / Wheel Picker State for Weight & Height
  const [newWeightKg, setNewWeightKg] = useState<number | string>(() =>
    weightLogs && weightLogs.length > 0 && weightLogs[0].weight_kg != null ? weightLogs[0].weight_kg : (pet?.species === 'cat' ? 4.0 : 10.0)
  )
  const [newHeightCm, setNewHeightCm] = useState<number | string>('')
  const [nutritionMeasureTab, setNutritionMeasureTab] = useState<'weight' | 'height'>('weight')

  // Reminder Modal & State
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)
  const [reminderSubType, setReminderSubType] = useState('Mama Saati')
  const [customReminderTitle, setCustomReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reminderTime, setReminderTime] = useState('08:00')
  const [reminderRepeat, setReminderRepeat] = useState<string>('daily')
  const [reminderSubmitting, setReminderSubmitting] = useState(false)

  async function handleSaveReminder(e: React.FormEvent) {
    e.preventDefault()
    setReminderSubmitting(true)
    try {
      const title = reminderSubType === 'Özel' ? customReminderTitle : reminderSubType
      const scheduledAt = `${reminderDate}T${reminderTime}:00`
      const payload = {
        pet_id: pet.id,
        category: 'beslenme',
        sub_type: title,
        scheduled_at: scheduledAt,
        repeat_rule: reminderRepeat === 'none' ? null : reminderRepeat,
        status: 'active'
      }

      if (editingReminderId) {
        const res = await fetch(`/api/plans/${editingReminderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Hatırlatıcı güncellenemedi')
      } else {
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Hatırlatıcı eklenemedi')
      }

      setShowReminderModal(false)
      setEditingReminderId(null)
      router.refresh()
    } catch (err: any) {
      showApiError(err.message || 'Bir hata oluştu')
    } finally {
      setReminderSubmitting(false)
    }
  }

  async function handleCompleteReminder(planId: string) {
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      if (!res.ok) throw new Error('Hatırlatıcı tamamlanamadı')
      router.refresh()
    } catch (err: any) {
      showApiError(err.message || 'Bir hata oluştu')
    }
  }

  // OPOS Cilt 3: native confirm() yerine ConfirmModal.
  function handleDeleteReminder(planId: string) {
    setReminderToDelete(planId)
  }

  async function confirmDeleteReminder() {
    const planId = reminderToDelete
    setReminderToDelete(null)
    if (!planId) return
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Hatırlatıcı silinemedi')
      router.refresh()
    } catch (err: any) {
      showApiError(err.message || 'Bir hata oluştu')
    }
  }

  // Assignment Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null)
  const [isSwappingFood, setIsSwappingFood] = useState(false)
  
  // Stock Entry State
  const [stockRemainingType, setStockRemainingType] = useState<'full' | 'three_quarters' | 'half' | 'quarter' | 'exact' | 'unknown'>('unknown')
  const [exactGrams, setExactGrams] = useState<number | ''>('')
  const [unopenedCount, setUnopenedCount] = useState<number | ''>('')
  const [packageSize, setPackageSize] = useState<number | ''>('')

  const [addMode, setAddMode] = useState<'search' | 'barcode' | 'manual'>('search')
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null)
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null)

  // Stock Action Modal State
  const [showStockModal, setShowStockModal] = useState(false)
  const [showClearStockModal, setShowClearStockModal] = useState(false)
  const [showMarkDepletedModal, setShowMarkDepletedModal] = useState(false)
  const [showEndAssignmentModal, setShowEndAssignmentModal] = useState(false)
  const [targetEndingAssignment, setTargetEndingAssignment] = useState<any | null>(null)
  const [endStockChoice, setEndStockChoice] = useState<'keep' | 'mark_depleted' | 'remove'>('keep')

  const [stockActionType, setStockActionType] = useState<'add_package' | 'set_stock'>('add_package')
  const [stockInputMode, setStockInputMode] = useState<'ratio' | 'exact'>('ratio')
  const [addPackageSize, setAddPackageSize] = useState<number | ''>(3000)
  const [addPackageCount, setAddPackageCount] = useState<number>(1)
  const [setPackageSizeInput, setSetPackageSizeInput] = useState<number | ''>(3000)
  const [setRatioType, setSetRatioType] = useState<'full' | 'three_quarters' | 'half' | 'quarter'>('full')
  const [setUnopenedInput, setSetUnopenedInput] = useState<number | ''>('')
  const [setExactGramsInput, setSetExactGramsInput] = useState<number | ''>('')

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
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null)
  const [productSuggestions, setProductSuggestions] = useState<any[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const [selectedManualFamilyId, setSelectedManualFamilyId] = useState<string | null>(null)

  // Weight Log Edit & Delete States
  const [editingWeightLog, setEditingWeightLog] = useState<any | null>(null)
  const [editWeightKg, setEditWeightKg] = useState<number | ''>('')
  const [editHeightCm, setEditHeightCm] = useState<number | ''>('')
  const [editWeightDate, setEditWeightDate] = useState<string>('')
  const [isDeletingWeight, setIsDeletingWeight] = useState<string | null>(null)
  const [isSavingWeightEdit, setIsSavingWeightEdit] = useState<boolean>(false)

  // Active Primary Assignment
  const activePrimary = assignments.find((a: any) => a.is_primary && !a.ended_at) || null

  // Engine & Server-Side Estimated Stock Calculations
  const hasInventory = inventory !== null && inventory !== undefined
  const activeAssignmentsTotalGrams = assignments
    .filter((a: any) => !a.ended_at)
    .reduce((sum: number, a: any) => sum + Number(a.daily_target_grams || 0), 0)

  const dailyUsage = activeAssignmentsTotalGrams > 0 
    ? activeAssignmentsTotalGrams 
    : (inventory?.estimated_daily_usage as number) ?? (profile?.daily_grams as number) ?? 0

  let estimatedRemainingGrams = 0
  let stockStatus: 'unknown' | 'available' | 'depleted' | 'paused' = 'unknown'

  if (!hasInventory) {
    stockStatus = 'unknown'
  } else if (dailyUsage <= 0) {
    estimatedRemainingGrams = Number(inventory.current_stock_grams || 0)
    stockStatus = 'paused'
  } else {
    const rawStock = Number(inventory.current_stock_grams || 0)
    const lastRefill = inventory.last_refill_date ? new Date(inventory.last_refill_date).getTime() : Date.now()
    const now = Date.now()
    let passedDays = 0
    if (lastRefill < now) {
      passedDays = Math.max(0, Math.floor((now - lastRefill) / (1000 * 60 * 60 * 24)))
    }
    estimatedRemainingGrams = Math.max(0, rawStock - (passedDays * dailyUsage))
    stockStatus = estimatedRemainingGrams === 0 ? 'depleted' : 'available'
  }

  const refillStatus = hasInventory && dailyUsage > 0
    ? calculateRefillRisk({ stockGrams: estimatedRemainingGrams, dailyUsage })
    : { daysLeft: null, risk: 'OK', shouldNotify: false, shouldSuggestRefill: false, shouldUrgentRefill: false }

  const showBanner = hasInventory && dailyUsage > 0 && stockStatus === 'available' && (refillStatus.risk === 'WARNING' || refillStatus.risk === 'CRITICAL')
  
  const badgeClass = stockStatus === 'unknown'
    ? 'text-text-secondary font-bold'
    : stockStatus === 'depleted'
      ? 'text-red-500 font-extrabold'
      : stockStatus === 'paused'
        ? 'text-amber-500 font-bold'
        : refillStatus.risk === 'CRITICAL'
          ? 'text-red-500 font-extrabold'
          : refillStatus.risk === 'WARNING'
            ? 'text-orange-500 font-extrabold'
            : 'text-green-500 font-extrabold'

  const riskLabel = stockStatus === 'unknown'
    ? 'Stok bilgisi girilmedi'
    : stockStatus === 'depleted'
      ? 'Mama bitti'
      : stockStatus === 'paused'
        ? 'Stok takibi duraklatıldı (Aktif mama yok)'
        : refillStatus.daysLeft !== null
          ? `${refillStatus.daysLeft} gün kaldı`
          : 'Kullanım belirtilmedi'

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

  // ── Debounced Brand Resolver (280ms) ──
  useEffect(() => {
    if (addMode !== 'manual') return
    const cleanBrand = brandText.trim()
    if (cleanBrand.length < 2) {
      setSelectedBrand(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutrition/catalog/search?q=${encodeURIComponent(cleanBrand)}&species=${pet.species || 'dog'}&include_pending=true`)
        const json = await res.json()
        const brands: any[] = json.brands || []

        if (brands.length > 0) {
          const normalizedClean = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, '')
          const matched = brands.find(b => 
            b.display_name.toLowerCase() === cleanBrand.toLowerCase() ||
            b.normalized_name === normalizedClean ||
            cleanBrand.toLowerCase().includes(b.display_name.toLowerCase()) ||
            b.display_name.toLowerCase().includes(cleanBrand.toLowerCase())
          ) || brands[0]

          setSelectedBrand(matched)
        } else {
          setSelectedBrand(null)
        }
      } catch (err) {
        console.error('Brand auto-resolve error:', err)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [brandText, addMode, pet.species])

  // ── Product Suggestions Autocomplete Handler ──
  async function fetchProductSuggestions(brand: string, query: string, targetBrandObj?: any) {
    const activeBrandObj = targetBrandObj || selectedBrand
    const cleanBrand = brand.trim()
    const cleanQuery = query.trim()

    if (!activeBrandObj && cleanBrand.length < 2 && cleanQuery.length < 2) {
      setProductSuggestions([])
      return
    }

    setIsFetchingSuggestions(true)
    try {
      let url = `/api/nutrition/catalog/search?species=${pet.species || 'dog'}&include_pending=true&limit=20`

      if (activeBrandObj?.id) {
        url += `&brand_id=${activeBrandObj.id}`
        if (cleanQuery) {
          url += `&q=${encodeURIComponent(cleanQuery)}`
        }
      } else {
        const searchTarget = cleanQuery || cleanBrand
        url += `&q=${encodeURIComponent(searchTarget)}`
      }

      const res = await fetch(url)
      const json = await res.json()
      let items = json.products || json.data || []

      // Client-side species check for absolute safety
      const petSpecies = pet.species || 'dog'
      items = items.filter((item: any) => item.species === petSpecies || item.species === 'both')

      setProductSuggestions(items)
    } catch (err) {
      console.error('Catalog suggestions fetch error:', err)
      setProductSuggestions([])
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

  // ── Submit New Assignment (Step 1) ──
  async function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setApiErrorMessage(null);
    setModalStep(2);
    if (selectedCatalogItem?.skus?.[0]?.weight_grams) {
      setPackageSize(selectedCatalogItem.skus[0].weight_grams);
    } else if (barcodeResult?.weight_grams) {
      setPackageSize(barcodeResult.weight_grams);
    } else {
      setPackageSize('');
    }
  }

  // ── Submit All (Step 2) ──
  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiErrorMessage(null);

    let assignId = createdAssignmentId;

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

      const pSize = Number(packageSize) || 0;
      const uCount = Number(unopenedCount) || 0;
      let calculatedGrams = 0;
      let stockAction: any = null;

      if (stockRemainingType === 'unknown') {
        stockAction = { action: 'delete' };
      } else {
        if (stockRemainingType === 'exact') {
           calculatedGrams = Number(exactGrams) || 0;
        } else {
           let mult = 0;
           if (stockRemainingType === 'full') mult = 1.0;
           if (stockRemainingType === 'three_quarters') mult = 0.75;
           if (stockRemainingType === 'half') mult = 0.5;
           if (stockRemainingType === 'quarter') mult = 0.25;
           calculatedGrams = Math.round((pSize * mult) + (pSize * uCount));
        }
        stockAction = { action: 'set', grams: calculatedGrams };
      }

      if (isSwappingFood && activePrimary) {
        const res = await fetch(`/api/pets/${pet.id}/nutrition/assignments/swap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_assignment_id: activePrimary.id,
            new_assignment: payload,
            new_stock_decision: stockAction
          })
        });
        const json = await res.json();
        if (!res.ok) {
           setApiErrorMessage(json.message || 'Değişim yapılamadı.');
           setLoading(false);
           return;
        }
      } else {
        if (!assignId) {
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
            setLoading(false);
            return;
          }
          assignId = json.assignment?.id;
          setCreatedAssignmentId(assignId);
        }

        if (stockAction.action === 'delete') {
          if (inventory) {
            await fetch(`/api/pets/${pet.id}/nutrition/inventory`, { method: 'DELETE' });
          }
        } else {
          const stockRes = await fetch(`/api/pets/${pet.id}/nutrition/inventory`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_stock', current_stock_grams: stockAction.grams })
          });
          if (!stockRes.ok) {
            const sJson = await stockRes.json();
            setApiErrorMessage(sJson.error || 'Stok kaydedilemedi, tekrar deneyin.');
            setLoading(false);
            return;
          }
        }
      }

      setShowAddModal(false)
      resetModalState()
      router.refresh()
    } catch(err) {
      setApiErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
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

  // ── End Active Assignment Handlers ──
  function openEndAssignmentModal(assignment: any) {
    setTargetEndingAssignment(assignment)
    setEndStockChoice('keep')
    setShowEndAssignmentModal(true)
  }

  async function handleEndAssignmentSubmit() {
    if (!targetEndingAssignment) return
    setLoading(true)
    setShowEndAssignmentModal(false)
    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/assignments/${targetEndingAssignment.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_action: endStockChoice })
      })
      const json = await res.json()
      if (!res.ok) {
        setApiErrorMessage(json.message || 'Plan sonlandırılamadı.')
      } else {
        router.refresh()
      }
    } catch (err) {
      setApiErrorMessage('Bir hata oluştu.')
    } finally {
      setLoading(false)
      setTargetEndingAssignment(null)
    }
  }

  // ── Modal Handlers for Stock Clear and Deplete ──
  async function handleClearStockConfirm() {
    setLoading(true)
    setShowClearStockModal(false)
    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/inventory`, { method: 'DELETE' })
      if (!res.ok) {
        setApiErrorMessage('Stok kaydı silinemedi.')
      } else {
        router.refresh()
      }
    } catch (err) {
      setApiErrorMessage('Stok kaydı silinirken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkDepletedConfirm() {
    setLoading(true)
    setShowMarkDepletedModal(false)
    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_stock', current_stock_grams: 0 })
      })
      if (!res.ok) {
        setApiErrorMessage('Stok güncellenemedi.')
      } else {
        router.refresh()
      }
    } catch (err) {
      setApiErrorMessage('Bir hata oluştu.')
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

  // ── Dedicated Stock Management Handlers ──
  function openStockModal(action: 'add_package' | 'set_stock') {
    setStockActionType(action)
    setApiErrorMessage(null)
    const pSize = activePrimary?.food_sku?.package_size_grams || 3000
    setAddPackageSize(pSize)
    setAddPackageCount(1)
    setSetPackageSizeInput(pSize)
    if (action === 'set_stock' && inventory?.current_stock_grams) {
      setStockInputMode('exact')
      setSetExactGramsInput(inventory.current_stock_grams)
    } else {
      setStockInputMode('ratio')
    }
    setShowStockModal(true)
  }

  async function handleStockModalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setApiErrorMessage(null)

    try {
      let body: any = {}
      if (stockActionType === 'add_package') {
        const pSize = Number(addPackageSize) || 0
        const pCount = Number(addPackageCount) || 1
        if (pSize <= 0) {
          setApiErrorMessage('Lütfen geçerli bir paket boyu (gram) girin.')
          setLoading(false)
          return
        }
        body = {
          action: 'add_package',
          package_size_grams: pSize,
          package_count: pCount
        }
      } else {
        let calculatedGrams = 0
        if (stockInputMode === 'exact') {
          calculatedGrams = Number(setExactGramsInput) || 0
        } else {
          const pSize = Number(setPackageSizeInput) || 0
          const uCount = Number(setUnopenedInput) || 0
          let mult = 1.0
          if (setRatioType === 'three_quarters') mult = 0.75
          if (setRatioType === 'half') mult = 0.5
          if (setRatioType === 'quarter') mult = 0.25
          calculatedGrams = Math.round((pSize * mult) + (pSize * uCount))
        }

        body = {
          action: 'set_stock',
          current_stock_grams: calculatedGrams
        }
      }

      const res = await fetch(`/api/pets/${pet.id}/nutrition/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const json = await res.json()
      if (!res.ok) {
        setApiErrorMessage(json.error || 'Stok kaydedilemedi.')
        return
      }

      setShowStockModal(false)
      router.refresh()
    } catch (err) {
      setApiErrorMessage('Stok güncellenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteInventory() {
    setShowClearStockModal(true)
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
    setSelectedBrand(null)
    setProductSuggestions([])
    setShowSuggestionsDropdown(false)
    setSelectedManualFamilyId(null)
    setModalStep(1)
    setCreatedAssignmentId(null)
    setIsSwappingFood(false)
    setStockRemainingType('unknown')
    setExactGrams('')
    setUnopenedCount('')
    setPackageSize('')
  }

  async function handleAddLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    const fd = new FormData(form)
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
      form.reset()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWeight(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setWeightError(null)

    const fd = new FormData(form)
    const rawWeight = fd.get('weight_kg')?.toString() || ''
    const rawHeight = fd.get('height_cm')?.toString() || ''
    const rawDate = fd.get('measured_at')?.toString() || ''

    const sanitizedWeight = rawWeight.replace(',', '.')
    const sanitizedHeight = rawHeight.replace(',', '.')

    const selectedDateStr = rawDate.trim() || new Date().toISOString().split('T')[0]

    // Aynı gün kayıt kontrolü (seçilen tarih için kayıt var mı?)
    const hasLogForSelectedDate = (weightLogs || []).some((log: any) => {
      const logDate = log.measured_at ? log.measured_at.split('T')[0] : log.created_at?.split('T')[0]
      return logDate === selectedDateStr
    })

    if (hasLogForSelectedDate) {
      const formattedDate = new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      setWeightError(`${formattedDate} tarihi için zaten bir kilo/boy ölçüm kaydı bulunmaktadır. Bir günde en fazla 1 kayıt eklenebilir. Mevcut kaydı değiştirmek isterseniz aşağıdaki "Geçmiş Ölçümler" listesindeki Düzenle (✏️) butonunu kullanabilirsiniz.`)
      return
    }

    setLoading(true)

    const payload: Record<string, any> = {
      weight_kg: parseFloat(sanitizedWeight),
      measured_at: new Date(selectedDateStr + 'T12:00:00.000Z').toISOString()
    }
    if (sanitizedHeight.trim()) {
      payload.height_cm = parseFloat(sanitizedHeight)
    }

    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const resData = await res.json()
      if (!res.ok) {
        setWeightError(resData.error || 'Kayıt eklenirken bir hata oluştu.')
        return
      }

      form.reset()
      router.refresh()
    } catch (err: any) {
      setWeightError(err.message || 'Kayıt eklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // OPOS Cilt 3: native confirm() yerine ConfirmModal.
  function handleDeleteWeightLog(logId: string) {
    setWeightLogToDelete(logId)
  }

  async function confirmDeleteWeightLog() {
    const logId = weightLogToDelete
    setWeightLogToDelete(null)
    if (!logId) return
    setIsDeletingWeight(logId)
    try {
      const res = await fetch(`/api/pets/${pet.id}/nutrition/weight/${logId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Kilo kaydı silinemedi')
      router.refresh()
    } catch (err: any) {
      showApiError(err.message || 'Silme işlemi sırasında hata oluştu')
    } finally {
      setIsDeletingWeight(null)
    }
  }

  async function handleSaveWeightEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingWeightLog) return
    setIsSavingWeightEdit(true)
    try {
      const payload: Record<string, any> = {
        weight_kg: Number(editWeightKg),
        height_cm: editHeightCm !== '' ? Number(editHeightCm) : null,
        measured_at: editWeightDate ? new Date(editWeightDate).toISOString() : undefined
      }
      const res = await fetch(`/api/pets/${pet.id}/nutrition/weight/${editingWeightLog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Kilo kaydı güncellenemedi')
      setEditingWeightLog(null)
      router.refresh()
    } catch (err: any) {
      showApiError(err.message || 'Güncelleme sırasında hata oluştu')
    } finally {
      setIsSavingWeightEdit(false)
    }
  }

  return (
    <div className={`flex flex-col gap-6 w-full mx-auto ${embedded ? 'max-w-none pb-4 px-0' : 'max-w-2xl pb-32 pb-safe px-3 sm:px-0'}`}>
      {/* Header */}
      {!embedded && (
        <>
          <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
            Profile Dön
          </Link>

          <div className="flex items-center gap-4 relative">
            <CoachMark
              hintKey="nutrition_intro"
              title="Mama bilgisini gir"
              message="Mama markası ve günlük miktarı gir — sistem kalori ve porsiyon takibini otomatik hesaplasın."
              icon={<UtensilsIcon className="w-5 h-5 text-amber-500" />}
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
        </>
      )}

      {!inventory && !dismissedBanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <SmartCardBanner
            title="MAMA PORSİYONU HESAPLAMA"
            message={`${pet.name}'in günlük beslenme porsiyonunu hesaplayabilmemiz için hangi marka ve tip mama kullanıyorsun?`}
            ctaText="Akıllı Tarama ile Ekle"
            icon={<UtensilsIcon className="w-5 h-5 text-amber-500" />}
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
        <div className="p-4 rounded-xl border-l-4 font-medium text-sm bg-red-50 border-red-500 text-red-800">
          🚨 Mama stoğunuz azalıyor! Tahmini <strong>{refillStatus.daysLeft} gün</strong> yetecek mama kaldı.
        </div>
      )}

      {/* Tabs */}
      <div className={`relative sticky ${embedded ? 'top-[108px] z-10' : 'top-16 z-20'} after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-bg-main after:to-transparent after:pointer-events-none after:z-10`}>
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
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <UtensilsIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-text-primary">Mama bilgilerini ekle</h3>
                <p className="text-[13px] text-text-secondary mt-1 max-w-sm">
                  Öğün düzenini oluşturmak ve ileride stok takibi yapmak için kullandığı mamayı ekleyin.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(true)
                  setAddMode('search')
                }}
                className="btn-primary min-h-[48px] px-8 text-sm font-bold mt-2 shadow-md shadow-primary/20"
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
                  <h3 className="font-extrabold text-text-primary text-lg mt-1 leading-tight">
                    {activePrimary.food_product_family?.brand?.display_name || activePrimary.brand_free_text || 'Mama'}
                  </h3>
                  <p className="text-[13px] text-text-secondary font-medium">
                    {activePrimary.food_product_family?.official_name || activePrimary.product_free_text || 'Özel Formül'}
                  </p>
                </div>
                <details className="relative group">
                  <summary className="px-4 py-2 bg-bg-main hover:bg-border-main text-text-primary font-bold text-[13px] rounded-xl transition-colors min-h-[44px] flex items-center cursor-pointer list-none select-none">
                    İşlemler <span className="ml-1 text-2xs">▼</span>
                  </summary>
                  <div className="absolute right-0 top-[110%] w-52 bg-white rounded-xl shadow-lg border border-border-main py-1.5 z-50 flex flex-col">
                    <button
                      onClick={() => setEditingAssignment(activePrimary)}
                      className="px-4 py-2.5 text-left text-[13px] font-bold text-text-primary hover:bg-bg-main"
                    >
                      Porsiyonu Düzenle
                    </button>
                    <button
                      onClick={() => {
                        setIsSwappingFood(true);
                        setAddMode('search');
                        setShowAddModal(true);
                      }}
                      className="px-4 py-2.5 text-left text-[13px] font-bold text-primary hover:bg-primary/10"
                    >
                      Mamayı Değiştir
                    </button>
                    <button
                      onClick={() => openEndAssignmentModal(activePrimary)}
                      className="px-4 py-2.5 text-left text-[13px] font-bold text-red-500 hover:bg-red-50 border-t border-border-main mt-1 pt-2.5"
                    >
                      Kullanmayı Bırak
                    </button>
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-bg-main p-3 rounded-xl mt-1">
                <div>
                  <p className="text-2xs font-bold text-text-secondary uppercase">Form</p>
                  <p className="text-xs font-extrabold text-text-primary truncate">
                    {getFoodFormLabel(activePrimary.food_product_family?.food_form || activePrimary.food_form)}
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-bold text-text-secondary uppercase">Günlük Hedef</p>
                  <p className="text-xs font-extrabold text-text-primary">
                    {activePrimary.daily_target_grams || 0} g
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-bold text-text-secondary uppercase">Öğün Başı</p>
                  <p className="text-xs font-extrabold text-text-primary">
                    {Math.round((activePrimary.daily_target_grams || 0) / (activePrimary.meals_per_day || 1))} g ({activePrimary.meals_per_day || 1} öğün)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-base p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Mevcut Mama</p>
                <p className="font-bold text-text-primary text-[15px] leading-tight">
                  {activePrimary?.food_product_family?.brand?.display_name || activePrimary?.brand_free_text || 'Eklenmedi'}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {activePrimary?.food_product_family?.official_name || activePrimary?.product_free_text || ''}
                </p>
              </div>
            </div>

            <div className="card-base p-5 relative overflow-hidden flex flex-col justify-between gap-3">
              <div>
                {/* Stok bilgisi girilmemişse veya duraklatılmışsa eski metin gösterim */}
                {!hasInventory ? (
                  <div>
                    <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Kalan Stok</p>
                    <p className="font-black text-lg text-text-secondary">Stok bilgisi girilmedi</p>
                    <p className="text-[11px] font-bold text-text-secondary mt-0.5">Stok ve bitiş tarihini takip edin</p>
                  </div>
                ) : stockStatus === 'paused' ? (
                  <div>
                    <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-1">Kalan Stok</p>
                    <p className="font-black text-xl text-amber-500">
                      {estimatedRemainingGrams >= 1000 ? `${(estimatedRemainingGrams / 1000).toFixed(1)} kg` : `${estimatedRemainingGrams} g`}
                    </p>
                    <p className="text-[11px] font-bold text-amber-600">Stok takibi duraklatıldı (Aktif mama yok)</p>
                  </div>
                ) : (
                  /* Timeline bileşeni: depleted + available durumları */
                  <StockTimeline
                    estimatedRemainingGrams={estimatedRemainingGrams}
                    dailyUsage={dailyUsage}
                    daysLeft={refillStatus.daysLeft}
                    stockStatus={stockStatus}
                    maxDays={
                      inventory && dailyUsage > 0
                        ? Math.max(
                            Math.round(Number(inventory.current_stock_grams || 0) / dailyUsage),
                            refillStatus.daysLeft ?? 0
                          )
                        : undefined
                    }
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border-main/60">
                {!hasInventory ? (
                  <button
                    onClick={() => openStockModal('set_stock')}
                    className="btn-primary w-full py-2 text-xs font-bold min-h-[38px] flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>➕</span> Başlangıç Stoğunu Ekle
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      onClick={() => openStockModal('add_package')}
                      className="btn-primary py-2 text-xs font-bold min-h-[36px] flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>📦</span> Yeni Paket Ekle
                    </button>
                    <button
                      onClick={() => openStockModal('set_stock')}
                      className="btn-secondary py-2 text-xs font-bold min-h-[36px] flex items-center justify-center gap-1"
                    >
                      <span>✏️</span> Stok Miktarını Düzelt
                    </button>
                    <button
                      onClick={() => setShowMarkDepletedModal(true)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold min-h-[36px] flex items-center justify-center gap-1 border border-amber-200 transition-colors"
                    >
                      <span>🛑</span> Mama Bitti
                    </button>
                    <button
                      onClick={() => setShowClearStockModal(true)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold min-h-[36px] flex items-center justify-center gap-1 border border-red-200 transition-colors"
                    >
                      <span>🗑️</span> Stok Bilgisini Kaldır
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerji & Hassasiyet Bilgileri (Korunan Profil Alanı) */}
          <div className="card-base p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h3 className="font-extrabold text-[15px] text-text-primary">Alerji ve Hassasiyet Notları</h3>
            </div>
            <form onSubmit={handleSaveAllergies} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-text-secondary">Bilinen Alerjiler (Virgülle Ayırın)</label>
                <input
                  name="allergy_info"
                  defaultValue={Array.isArray(profile?.allergy_info) ? profile.allergy_info.join(', ') : profile?.allergy_info || ''}
                  placeholder="Örn: Tavuk eti, Sığır eti, Tahıl"
                  className="input-base min-h-[44px] text-[13px]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">Özel Hassasiyet / Sindirim Notları</label>
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
                <span className="text-2xl">📷</span>
                <div>
                  <h3 className="font-extrabold text-[15px]">Barkod ile Mama Ekle</h3>
                  <p className="text-xs text-white/90 font-medium">Paket üzerindeki barkodu okutarak mamayı saniyeler içinde ekleyin</p>
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
          {/* Beslenme Hatırlatıcıları */}
          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-[15px] text-text-primary">Beslenme Hatırlatıcıları</h3>
                <p className="text-xs text-text-secondary">Ajanda ve Takvim ile senkronize mama/düzen hatırlatmaları</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingReminderId(null)
                  setReminderSubType('Mama Saati')
                  setReminderDate(new Date().toISOString().split('T')[0])
                  setReminderTime('08:00')
                  setReminderRepeat('daily')
                  setShowReminderModal(true)
                }}
                className="btn-primary text-xs py-2 px-3 shadow-xs"
              >
                + Yeni Hatırlatıcı
              </button>
            </div>

            {nutritionPlans.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border-main text-center bg-bg-main/50">
                <p className="text-[13px] text-text-secondary font-medium mb-1">Henüz beslenme hatırlatıcısı eklenmemiş.</p>
                <p className="text-[11px] text-text-secondary/80">Mama saati, mama siparişi veya su tazeleme hatırlatıcıları ekleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-main">
                {nutritionPlans.map((plan: any) => {
                  const isDone = plan.status === 'completed';
                  const dateStr = plan.scheduled_at
                    ? new Date(plan.scheduled_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '';
                  const repeatLabel = plan.repeat_rule === 'daily' ? 'Her gün' : plan.repeat_rule === 'weekly' ? 'Haftalık' : plan.repeat_rule === 'monthly' ? 'Aylık' : plan.repeat_rule === 'hourly' ? 'Saatlik' : 'Tek Seferlik';

                  return (
                    <div key={plan.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {isDone ? '✓' : '⏰'}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary text-sm">
                            {plan.sub_type || 'Mama Saati'}
                          </h4>
                          <p className="text-[11px] text-text-secondary">
                            {dateStr} • <span className="font-semibold text-text-primary">{repeatLabel}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => handleCompleteReminder(plan.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            ✓ Tamamla
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReminderId(plan.id)
                            const known = ['Mama Saati', 'Su Tazeleme', 'Mama Siparişi', 'Diyet Değişimi'];
                            setReminderSubType(known.includes(plan.sub_type) ? plan.sub_type : 'Özel')
                            if (!known.includes(plan.sub_type)) {
                              setCustomReminderTitle(plan.sub_type || '')
                            }
                            if (plan.scheduled_at) {
                              const d = new Date(plan.scheduled_at)
                              setReminderDate(d.toISOString().split('T')[0])
                              setReminderTime(d.toTimeString().slice(0, 5))
                            }
                            setReminderRepeat(plan.repeat_rule || 'none')
                            setShowReminderModal(true)
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-text-secondary hover:bg-slate-200 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(plan.id)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              <p className="p-6 text-center text-text-secondary text-sm">Henüz kayıt yok.</p>
            ) : (
              <div className="divide-y divide-border-main">
                {feedingLogs.slice(0, 10).map(l => (
                  <div key={l.id} className="p-4 flex items-center justify-between hover:bg-bg-main transition-colors">
                    <div>
                      <p className="font-bold text-text-primary text-sm">{l.amount_grams}g tüketildi</p>
                      <p className="text-xs text-text-secondary">{new Date(l.meal_time).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
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

      {/* Reminder Modal */}
      <Modal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title={editingReminderId ? "Hatırlatıcıyı Düzenle" : "Yeni Beslenme Hatırlatıcısı"}>
        <form onSubmit={handleSaveReminder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary">Hatırlatıcı Türü</label>
            <select
              value={reminderSubType}
              onChange={(e) => setReminderSubType(e.target.value)}
              className="input-base py-2.5 text-sm"
            >
              <option value="Mama Saati">Mama Saati</option>
              <option value="Su Tazeleme">Su Tazeleme</option>
              <option value="Mama Siparişi">Mama Siparişi</option>
              <option value="Diyet Değişimi">Diyet Değişimi</option>
              <option value="Özel">Özel...</option>
            </select>
          </div>

          {reminderSubType === 'Özel' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Hatırlatıcı Adı</label>
              <input
                type="text"
                value={customReminderTitle}
                onChange={(e) => setCustomReminderTitle(e.target.value)}
                placeholder="Örn: Ödül Maması Saati"
                className="input-base py-2.5 text-sm"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Tarih</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="input-base py-2.5 text-sm"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Saat</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="input-base py-2.5 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary">Tekrar</label>
            <select
              value={reminderRepeat}
              onChange={(e) => setReminderRepeat(e.target.value)}
              className="input-base py-2.5 text-sm"
            >
              <option value="none">Tek Seferlik</option>
              <option value="daily">Her Gün</option>
              <option value="weekly">Her Hafta</option>
              <option value="monthly">Her Ay</option>
              <option value="hourly">Her Saat</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3 border-t border-border-main/50">
            <button
              type="button"
              onClick={() => setShowReminderModal(false)}
              className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold text-[13px]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={reminderSubmitting}
              className="flex-[2] btn-primary py-3 text-[13px] font-bold"
            >
              {reminderSubmitting ? 'Kaydediliyor...' : 'Kaydet ✓'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Tab: Kilo Takibi ── */}
      {activeTab === 'Kilo Takibi' && (() => {
        const lastWeightLog = weightLogs && weightLogs.length > 0 ? weightLogs[0] : null
        const lastWeightKg = lastWeightLog ? Number(lastWeightLog.weight_kg) : null

        const weightAssessment = lastWeightKg !== null && pet?.birth_date
          ? assessWeight({
              species: pet.species || 'cat',
              breed: pet.breed,
              birthDate: pet.birth_date,
              weightKg: lastWeightKg,
              isNeutered: pet.is_neutered ?? false,
              gender: pet.gender || 'unknown'
            })
          : null

        const upcomingWeightTask = (nutritionPlans || []).find(
          (p: any) =>
            p.status === 'active' &&
            (p.sub_type === 'Kilo & Boy Ölçümü' || p.sub_type === 'Kilo Ölçümü' || (p.title && p.title.includes('Kilo')) || p.category === 'saglik')
        )

        return (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Form */}
            <form onSubmit={handleAddWeight} className="card-base p-6 flex flex-col gap-4">
              <h3 className="font-extrabold text-base text-text-primary">Yeni Kilo & Boy Ölçüm Kaydı</h3>
              
              {weightError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl font-medium flex items-start gap-2 animate-fadeIn">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>{weightError}</span>
                </div>
              )}

              {/* Hidden Inputs for Form Data */}
              <input type="hidden" name="weight_kg" value={newWeightKg} />
              <input type="hidden" name="height_cm" value={newHeightCm} />

              {/* Tab Seçimi (Kilo vs Boy) */}
              <div className="flex items-center justify-between gap-2 border-b border-border-main pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNutritionMeasureTab('weight')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                      nutritionMeasureTab === 'weight'
                        ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚖️ Kilo (kg) *</span>
                    {newWeightKg !== '' && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{newWeightKg} kg</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNutritionMeasureTab('height')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                      nutritionMeasureTab === 'height'
                        ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📏 Boy (cm)</span>
                    <span className="text-[11px] opacity-80">(Opsiyonel)</span>
                    {newHeightCm !== '' && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{newHeightCm} cm</span>}
                  </button>
                </div>
              </div>

              {/* Cetvel Tipi Seçici (Ruler Picker) */}
              {nutritionMeasureTab === 'weight' ? (
                <RulerPicker
                  id="nutrition-weight-ruler"
                  label="Güncel Kilo *"
                  sublabel="Cetveli kaydırarak veya sayıya dokunarak kiloyu belirleyin"
                  unit="kg"
                  min={0.1}
                  max={120}
                  step={0.1}
                  value={typeof newWeightKg === 'number' ? newWeightKg : parseFloat(newWeightKg as string) || (pet?.species === 'cat' ? 4.0 : 10.0)}
                  onChange={(val) => setNewWeightKg(val)}
                  presets={pet?.species === 'cat' ? [2.5, 4.0, 5.5, 7.0] : [5.0, 10.0, 18.0, 25.0, 35.0]}
                />
              ) : (
                <RulerPicker
                  id="nutrition-height-ruler"
                  label="Boy / Uzunluk"
                  sublabel="Burundan kuyruk sokumuna veya omuza boy (Opsiyonel)"
                  isOptional
                  unit="cm"
                  min={5}
                  max={180}
                  step={1}
                  value={typeof newHeightCm === 'number' ? newHeightCm : parseFloat(newHeightCm as string) || (pet?.species === 'cat' ? 25 : 45)}
                  onChange={(val) => setNewHeightCm(val)}
                  presets={pet?.species === 'cat' ? [20, 25, 30, 35] : [30, 45, 60, 80]}
                />
              )}

              {/* Alt Kontroller: Ölçüm Tarihi ve Kaydet Butonu */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-border-main/60 mt-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-[13px] font-bold text-text-primary whitespace-nowrap">Ölçüm Tarihi:</label>
                  <input
                    type="date"
                    name="measured_at"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    className="input-base text-sm py-2 px-3 min-h-[42px]"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary px-8 min-h-[46px] w-full sm:w-auto flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                  Ölçümü Kaydet ✓
                </button>
              </div>
            </form>

            {/* Upcoming Reminder Task Pill */}
            {upcomingWeightTask && (
              <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3">
                  <ScaleIcon badgeSize="sm" size={18} />
                  <div>
                    <p className="text-[13px] font-extrabold text-amber-950">
                      {upcomingWeightTask.sub_type || upcomingWeightTask.title || 'Kilo & Boy Ölçümü'}
                    </p>
                    <p className="text-[11px] font-medium text-amber-800/80 mt-0.5">
                      Takvim Hatırlatıcısı: {new Date(upcomingWeightTask.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCompleteReminder(upcomingWeightTask.id)}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm shrink-0"
                >
                  Tamamla ✓
                </button>
              </div>
            )}

            {/* Kilo Değişim Grafiği (Gram & Tarih) - Geçmiş Ölçümler Üstünde */}
            <WeightChangeChart weightLogs={weightLogs} />

            {/* Ideal Weight Goal Assessment Band */}
            {weightAssessment && lastWeightKg !== null && (
              <div className="card-base overflow-hidden border border-border-main">
                <WeightGoalBand
                  assessment={weightAssessment}
                  currentWeight={lastWeightKg}
                  compact={false}
                  isNeutered={pet?.is_neutered}
                />
              </div>
            )}

            {/* Geçmiş Ölçümler Listesi */}
            {weightLogs.length > 0 && (
              <div className="card-base overflow-hidden">
                <h3 className="p-4 font-bold border-b border-border-main bg-surface/50 flex justify-between items-center">
                  <span>Geçmiş Ölçümler</span>
                  <span className="text-[11px] font-semibold text-text-secondary">{weightLogs.length} Kayıt</span>
                </h3>
                <div className="divide-y divide-border-main">
                  {weightLogs.map(w => (
                    <div key={w.id} className="p-4 flex items-center justify-between hover:bg-bg-main transition-colors group">
                      <div>
                        <p className="font-bold text-text-primary text-[15px]">
                          {w.weight_kg} kg
                          {w.height_cm ? <span className="text-[13px] text-text-secondary font-semibold ml-2">· {w.height_cm} cm</span> : null}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {new Date(w.measured_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWeightLog(w)
                            setEditWeightKg(w.weight_kg)
                            setEditHeightCm(w.height_cm ?? '')
                            const d = new Date(w.measured_at)
                            setEditWeightDate(d.toISOString().split('T')[0])
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors flex items-center gap-1 min-h-[36px]"
                          title="Ölçümü Düzenle"
                        >
                          ✏️ <span>Düzenle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWeightLog(w.id)}
                          disabled={isDeletingWeight === w.id}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1 min-h-[36px]"
                          title="Ölçümü Sil"
                        >
                          🗑️ <span>{isDeletingWeight === w.id ? '...' : 'Sil'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Modal for Editing Weight Log */}
      <Modal
        isOpen={!!editingWeightLog}
        onClose={() => setEditingWeightLog(null)}
        title="Kilo Kaydını Düzenle"
      >
        <form onSubmit={handleSaveWeightEdit} className="flex flex-col gap-4">
          <div>
            <label className="text-[13px] font-bold text-text-primary block mb-1">Kilo (kg) *</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={editWeightKg}
              onChange={e => setEditWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
              required
              className="input-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-text-primary block mb-1">Boy (cm) <span className="text-text-secondary font-normal">(opsiyonel)</span></label>
            <input
              type="number"
              step="0.5"
              value={editHeightCm}
              onChange={e => setEditHeightCm(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="Örn: 35"
              className="input-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-text-primary block mb-1">Ölçüm Tarihi *</label>
            <input
              type="date"
              value={editWeightDate}
              onChange={e => setEditWeightDate(e.target.value)}
              required
              className="input-base min-h-[44px]"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingWeightLog(null)}
              className="btn-secondary px-4 py-2 text-[13px] font-bold min-h-[44px]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSavingWeightEdit}
              className="btn-primary px-6 py-2 text-[13px] font-bold min-h-[44px]"
            >
              {isSavingWeightEdit ? 'Kaydedildiği...' : 'Değişikliği Kaydet'}
            </button>
          </div>
        </form>
      </Modal>



      {/* ── MAMA EKLEME MODAL (Food Setup Modal) ── */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetModalState() }} title="Mama Ekle">
        <div className="flex flex-col gap-4">
          {/* Mode Tabs */}
          <div className="flex bg-bg-main p-1 rounded-xl border border-border-main">
            <button
              onClick={() => { setAddMode('search'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'search' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              🔍 Mamayı Ara
            </button>
            <button
              onClick={() => { setAddMode('barcode'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'barcode' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              📷 Barkod ile Bul
            </button>
            <button
              onClick={() => { setAddMode('manual'); setSelectedCatalogItem(null); setBarcodeResult(null) }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors min-h-[44px] ${addMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
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
                className="input-base min-h-[48px] text-sm"
              />

              {isSearching && <p className="text-[13px] text-text-secondary font-bold text-center py-4">Katalog aranıyor...</p>}

              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                matchedBrands.length > 0 ? (
                  <div className="p-4 text-center bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col items-center gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-[15px]">
                      <span>🏷️</span>
                      <h4>{matchedBrands[0].display_name} markası bulundu</h4>
                    </div>
                    <p className="text-xs text-amber-800 font-medium">
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
                    <p className="font-extrabold text-sm text-text-primary">{item.brand?.display_name}</p>
                    <p className="text-xs text-text-secondary font-medium">{item.official_name}</p>
                    <span className="inline-block mt-1 text-2xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
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
                  className="input-base flex-1 min-h-[48px] text-sm"
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
                <p className="text-xs text-text-secondary">
                  {selectedCatalogItem?.official_name || barcodeResult?.product_family?.official_name}
                </p>
              </div>
              <button
                onClick={() => { setSelectedCatalogItem(null); setBarcodeResult(null) }}
                className="text-xs text-red-500 font-bold hover:underline min-h-[44px] px-2"
              >
                Değiştir
              </button>
            </div>
          )}

          {/* Mode 3: Manual Input Fields with Autocomplete Combobox */}
          {addMode === 'manual' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-text-secondary">Mama Markası *</label>
                <input
                  type="text"
                  value={brandText}
                  onChange={e => {
                    const val = e.target.value
                    setBrandText(val)
                    setSelectedBrand(null)
                    setSelectedManualFamilyId(null)
                    setProductSuggestions([])
                    if (val.trim().length < 2) {
                      setShowSuggestionsDropdown(false)
                    }
                  }}
                  placeholder="Örn: Pro Plan / Royal Canin / Ev Yapımı"
                  className="input-base min-h-[44px]"
                />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-text-secondary">Ürün / Çeşit Adı</label>
                <input
                  type="text"
                  value={productText}
                  onChange={e => {
                    const val = e.target.value
                    setProductText(val)
                    setSelectedManualFamilyId(null)
                    if (selectedBrand || brandText.trim().length >= 2 || val.trim().length >= 1) {
                      fetchProductSuggestions(brandText, val)
                      setShowSuggestionsDropdown(true)
                    }
                  }}
                  onFocus={() => {
                    setShowSuggestionsDropdown(true)
                    if (selectedBrand || brandText.trim().length >= 2 || productText.trim().length >= 1) {
                      fetchProductSuggestions(brandText, productText)
                    }
                  }}
                  placeholder="Örn: Puppy Medium Optistart / Tavuklu ve Pirinçli"
                  className="input-base min-h-[44px]"
                />

                {/* Autocomplete Combobox Dropdown */}
                {showSuggestionsDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-border-main">
                    {isFetchingSuggestions ? (
                      <div className="p-3 text-xs text-text-secondary text-center font-bold animate-pulse">
                        Ürünler yükleniyor…
                      </div>
                    ) : productSuggestions.length > 0 ? (
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
                                <span className="text-2xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md shrink-0">
                                  ⏳ Doğrulama bekliyor
                                </span>
                              ) : (
                                <span className="text-2xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
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
                    ) : (
                      <div className="p-3 text-xs text-text-secondary text-center font-medium">
                        Bu marka için ürün önerisi bulunamadı
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">Mama Formu *</label>
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
          {(selectedCatalogItem || barcodeResult || addMode === 'manual') && modalStep === 1 && (
            <form onSubmit={handleNextStep} className="flex flex-col gap-4 border-t border-border-main pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-secondary">Miktar Giriş Tipi</label>
                <div className="flex bg-bg-main p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPortionMode('daily')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md min-h-[44px] ${portionMode === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
                  >
                    Günlük Toplam Gram
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortionMode('meal')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md min-h-[44px] ${portionMode === 'meal' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}
                  >
                    Öğün Başı Gram
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary">
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
                  <label className="text-xs font-bold text-text-secondary">Günlük Öğün Sayısı *</label>
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
                className="btn-primary min-h-[48px] w-full text-sm font-bold shadow-md shadow-primary/20"
              >
                İleri: Stok Durumu
              </button>
            </form>
          )}

          {modalStep === 2 && (
            <form onSubmit={handleSaveAll} className="flex flex-col gap-4 border-t border-border-main pt-4">
              <h3 className="font-extrabold text-[15px] text-text-primary">Evde ne kadar mama var?</h3>
              
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary">Paket Boyu (gram)</label>
                  <input type="number" min="1" value={packageSize} onChange={e => setPackageSize(e.target.value ? Number(e.target.value) : '')} className="input-base" placeholder="Örn: 3000" />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary">Kalan Miktar</label>
                  <select value={stockRemainingType} onChange={e => setStockRemainingType(e.target.value as any)} className="input-base">
                    <option value="unknown">Şimdi bilmiyorum</option>
                    <option value="full">Yeni açıldı / Dolu</option>
                    <option value="three_quarters">Yaklaşık 3/4</option>
                    <option value="half">Yaklaşık yarım</option>
                    <option value="quarter">Yaklaşık 1/4</option>
                    <option value="exact">Tam gramını biliyorum</option>
                  </select>
                </div>

                {stockRemainingType === 'exact' && (
                  <div>
                    <label className="text-xs font-bold text-text-secondary">Gram cinsinden miktar</label>
                    <input type="number" min="1" value={exactGrams} onChange={e => setExactGrams(e.target.value ? Number(e.target.value) : '')} className="input-base" />
                  </div>
                )}

                {stockRemainingType !== 'unknown' && stockRemainingType !== 'exact' && (
                  <div>
                    <label className="text-xs font-bold text-text-secondary">Açılmamış paket sayısı (isteğe bağlı)</label>
                    <input type="number" min="0" value={unopenedCount} onChange={e => setUnopenedCount(e.target.value ? Number(e.target.value) : '')} className="input-base" placeholder="0" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setModalStep(1)} className="btn-secondary flex-1 min-h-[48px]">Geri</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 min-h-[48px]">
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
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
              <p className="font-extrabold text-base text-text-primary">
                {editingAssignment.food_product_family?.brand?.display_name || editingAssignment.brand_free_text || 'Mama'}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary">Günlük Toplam Gram *</label>
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
              <label className="text-xs font-bold text-text-secondary">Günlük Öğün Sayısı *</label>
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
              className="btn-primary min-h-[48px] w-full text-sm font-bold mt-2"
            >
              {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>
        )}
      </Modal>

      {/* ── STOCK ACTION MODAL ── */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title={stockActionType === 'add_package' ? 'Yeni Paket Ekle' : 'Stok Miktarını Düzelt'}
      >
        <form onSubmit={handleStockModalSubmit} className="flex flex-col gap-4">
          {apiErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold rounded-xl">
              ⚠️ {apiErrorMessage}
            </div>
          )}

          {stockActionType === 'add_package' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text-secondary">
                Evdeki yeni ambalajı stoğa ekleyin. Eklenen miktar mevcut tahmini stoğunuzun üzerine ilave edilecektir.
              </p>
              <div>
                <label className="text-xs font-bold text-text-secondary">Paket Boyu (gram) *</label>
                <input
                  type="number"
                  min="1"
                  value={addPackageSize}
                  onChange={e => setAddPackageSize(e.target.value ? Number(e.target.value) : '')}
                  className="input-base"
                  placeholder="Örn: 3000"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">Paket Adedi *</label>
                <input
                  type="number"
                  min="1"
                  value={addPackageCount}
                  onChange={e => setAddPackageCount(e.target.value ? Number(e.target.value) : 1)}
                  className="input-base"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text-secondary">
                Mevcut kalan mama stoğunu güncellemek için hesaplama yöntemini seçin.
              </p>
              <div className="flex gap-2 p-1 bg-bg-main rounded-xl border border-border-main">
                <button
                  type="button"
                  onClick={() => setStockInputMode('ratio')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    stockInputMode === 'ratio' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                  }`}
                >
                  Yaklaşık Oran ile
                </button>
                <button
                  type="button"
                  onClick={() => setStockInputMode('exact')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    stockInputMode === 'exact' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                  }`}
                >
                  Tam Gram ile
                </button>
              </div>

              {stockInputMode === 'ratio' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-secondary">Paket Boyu (gram)</label>
                    <input
                      type="number"
                      min="1"
                      value={setPackageSizeInput}
                      onChange={e => setSetPackageSizeInput(e.target.value ? Number(e.target.value) : '')}
                      className="input-base"
                      placeholder="Örn: 3000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary">Açılmış Paket Kalanı</label>
                    <select
                      value={setRatioType}
                      onChange={e => setSetRatioType(e.target.value as any)}
                      className="input-base"
                    >
                      <option value="full">Yeni açıldı / Dolu (1/1)</option>
                      <option value="three_quarters">Yaklaşık 3/4</option>
                      <option value="half">Yaklaşık yarım (1/2)</option>
                      <option value="quarter">Yaklaşık 1/4</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary">Açılmamış Paket Sayısı (isteğe bağlı)</label>
                    <input
                      type="number"
                      min="0"
                      value={setUnopenedInput}
                      onChange={e => setSetUnopenedInput(e.target.value ? Number(e.target.value) : '')}
                      className="input-base"
                      placeholder="0"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-text-secondary">Mevcut Toplam Stok (gram)</label>
                  <input
                    type="number"
                    min="0"
                    value={setExactGramsInput}
                    onChange={e => setSetExactGramsInput(e.target.value ? Number(e.target.value) : '')}
                    className="input-base"
                    placeholder="Örn: 1500"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setShowStockModal(false)}
              className="btn-secondary flex-1 min-h-[44px] text-[13px] font-bold"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 min-h-[44px] text-[13px] font-bold"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
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

      {/* Confirm Modal: Clear Stock */}
      <ConfirmModal
        open={showClearStockModal}
        title="Stok Bilgisini Kaldır"
        message="Stok takibini ve mevcut stok kaydını tamamen kaldırmak istediğinize emin misiniz?"
        confirmLabel="Stok Bilgisini Kaldır"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={handleClearStockConfirm}
        onCancel={() => setShowClearStockModal(false)}
      />

      {/* Confirm Modal: Mark Depleted */}
      <ConfirmModal
        open={showMarkDepletedModal}
        title="Mama Bitti İşaretle"
        message="Mevcut mama stoğunu 0 gram (bitti) olarak güncellemek istediğinize emin misiniz?"
        confirmLabel="Mama Bitti İşaretle"
        cancelLabel="Vazgeç"
        variant="warning"
        onConfirm={handleMarkDepletedConfirm}
        onCancel={() => setShowMarkDepletedModal(false)}
      />

      {/* Confirm Modal: Hatırlatıcı Sil (native confirm yerine — OPOS Cilt 3) */}
      <ConfirmModal
        open={reminderToDelete !== null}
        title="Hatırlatıcıyı Sil"
        message="Bu hatırlatıcıyı silmek istediğinize emin misiniz?"
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={confirmDeleteReminder}
        onCancel={() => setReminderToDelete(null)}
      />

      {/* Confirm Modal: Kilo Kaydı Sil (native confirm yerine — OPOS Cilt 3) */}
      <ConfirmModal
        open={weightLogToDelete !== null}
        title="Kilo Kaydını Sil"
        message="Bu kilo kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={confirmDeleteWeightLog}
        onCancel={() => setWeightLogToDelete(null)}
      />

      {/* Inline hata göstergesi (native alert yerine — OPOS Cilt 3) */}
      {uiError && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] max-w-md w-[calc(100%-32px)] px-4 py-3 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center shadow-lg backdrop-blur-md"
        >
          {uiError}
        </div>
      )}

      {/* Modal: End Assignment with Stock Decision */}
      <Modal
        isOpen={showEndAssignmentModal}
        onClose={() => { setShowEndAssignmentModal(false); setTargetEndingAssignment(null); }}
        title="Mamayı Kullanmayı Bırak"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">{targetEndingAssignment?.food_product_family?.brand?.display_name || targetEndingAssignment?.brand_free_text || 'Bu mamanın'}</strong> kullanımını sonlandırmak üzeresiniz. Geçmiş beslenme ve tüketim kayıtlarınız korunacaktır.
          </p>

          <div className="flex flex-col gap-2 bg-bg-main p-3.5 rounded-xl border border-border-main">
            <p className="text-xs font-black text-text-primary uppercase tracking-wide">Kalan Stok Ne Yapılsın?</p>
            
            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface cursor-pointer text-[13px] font-bold text-text-primary">
              <input
                type="radio"
                name="end_stock_choice"
                value="keep"
                checked={endStockChoice === 'keep'}
                onChange={() => setEndStockChoice('keep')}
                className="accent-primary"
              />
              <span>Stoğu koru (Stok miktarına dokunma, duraklat)</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface cursor-pointer text-[13px] font-bold text-amber-700">
              <input
                type="radio"
                name="end_stock_choice"
                value="mark_depleted"
                checked={endStockChoice === 'mark_depleted'}
                onChange={() => setEndStockChoice('mark_depleted')}
                className="accent-amber-600"
              />
              <span>Mama bitti işaretle (0 gram yap)</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface cursor-pointer text-[13px] font-bold text-red-600">
              <input
                type="radio"
                name="end_stock_choice"
                value="remove"
                checked={endStockChoice === 'remove'}
                onChange={() => setEndStockChoice('remove')}
                className="accent-red-600"
              />
              <span>Stok bilgisini kaldır (Stok kaydını sil)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowEndAssignmentModal(false); setTargetEndingAssignment(null); }}
              className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold text-[13px]"
            >
              Vazgeç
            </button>
            <button
              onClick={handleEndAssignmentSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] transition-colors"
            >
              Kullanmayı Bırak
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
