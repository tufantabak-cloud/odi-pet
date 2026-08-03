'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Share2, Phone, Camera, ImageIcon, FileImage, Wallet, Home, FileText, AlertTriangle, Heart, ShieldCheck, Pencil } from 'lucide-react'
import FamilyTab from './FamilyTab'
import HealthTab from '@/components/pets/tabs/HealthTab'

import SmartTaskWizard from '@/components/tasks/SmartTaskWizard'
import { TaskCategory } from '@/lib/tasks/taskDefaults'
import { AlertCircleIcon, CalendarClockIcon, CheckCircle2Icon, CheckCircleIcon, ChevronRightIcon, HeartPulseIcon, ShieldAlertIcon, SmileIcon, StarIcon, TrophyIcon, ActivityIcon, PlusIcon, FileTextIcon, HistoryIcon, MapPinIcon, BabyIcon, FileLineChartIcon, HelpCircleIcon, DownloadIcon, PillIcon, DogIcon, CatIcon, IdCardIcon, TargetIcon, DropletsIcon } from 'lucide-react'
import { VaccineIcon, ParasiteIcon, ShampooIcon, BowlIcon, CarrierIcon, BoneIcon, ScoopIcon, FirstAidIcon } from '@/components/icons/PetIcons'
import NutritionClient from './nutrition/NutritionClient'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import HumanAgeCalculator from '@/components/pets/HumanAgeCalculator'
import BreedHealthCard from '@/components/pets/BreedHealthCard'
import LostPetWizard from '@/components/pets/LostPetWizard'
import MinimalGrowthChart from '@/components/pets/MinimalGrowthChart'
import { SmartScanner } from '@/components/ui/SmartScanner'
import FloatingSOS from '@/components/FloatingSOS'
import { HealthTracker } from '@/components/health-tracker/HealthTracker'
import { EstrusTracker } from '@/components/estrus-tracker/EstrusTracker'
import PetHeroCard from './PetHeroCard'
import AllergyManager from '@/components/pets/AllergyManager'
import MedicationManager from '@/components/pets/MedicationManager'
import { buildPetMicroTasks } from '@/lib/microTasks/petMicroTasks'
import { PetMicroTaskCard } from '@/components/micro-tasks/PetMicroTaskCard'
import { useDismissedMicroTasks } from '@/hooks/useDismissedMicroTasks'
import { PetTaskModals, TaskModalType } from '@/components/pets/PetTaskModals'
import ParasitePlanCompletionModal from '@/components/pets/ParasitePlanCompletionModal'
import ConfirmModal from '@/components/ui/ConfirmModal'

import { getPlanDisplayCategory } from '@/lib/plans/utils'
import { getTurkishGenitiveSuffix } from '@/lib/pets/utils'
function QuickUpdateModal({ petId, config, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  // setLoading asenkron olduğu için hızlı ardışık tıklamalarda ikinci gönderim
  // butona disabled yansımadan geçebilir; ref ile senkron kilit sağlanır.
  const submittingRef = useRef(false)

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (submittingRef.current) return // çift gönderimi engelle
    submittingRef.current = true
    setLoading(true)
    setError('')
    const fd = new FormData(e.target)
    
    if (config.customHandler) {
      try {
        await config.customHandler(fd);
        router.refresh();
        onDone();
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        submittingRef.current = false;
      }
      return;
    }

    try {
      const endpoint = config.endpoint || `/api/pets/${petId}`
      const method = config.method || 'PATCH'
      const res = await fetch(endpoint, { method, body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Hata oluştu')
      }
      router.refresh()
      onDone()
    } catch(err: any) {
      setError(err.message)
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-modal p-6 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-text-primary mb-1">{config.title}</h3>
        <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f: any) => (
             <div key={f.name} className="flex flex-col gap-1.5">
               <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{f.label}</label>
               {f.type === 'file' ? (
                 <input name={f.name} type="file" accept="image/*" className="input-base py-2.5 text-[13px]" required={f.required} />
               ) : (
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input-base py-3 text-sm" required={f.required} />
               )}
             </div>
          ))}
          {error && <p className="text-xs text-error font-bold p-2 bg-error/10 rounded-xs text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-btn border-2 border-border-main text-text-secondary font-bold text-sm">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-sm">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const genderLabel: Record<string, string> = { male: 'Erkek', female: 'Dişi', unknown: 'Bilinmiyor' }

/** Modül adı → DB category eşleştirmesi */
const TAB_CATEGORY_MAP: Record<string, TaskCategory> = {
  'Sağlık':    'Saglik',
  'Aşı':       'Medikal',
  'Parazit':   'Medikal',
  'Bakım':     'Bakım',
  'Beslenme':  'Beslenme',
  'Hijyen':    'Hijyen',
  'Aktivite':  'Aktiviteler',
  'Veteriner': 'Veteriner',
  'Diğer':     'Diger',
}

/** Tuvalet eğitimi alt kategorileri — Hijyen'den Aktiviteler'e taşındı */
const TOILET_TRAINING_SUBS = ['Kedi Tuvalet', 'Köpek Tuvalet'];

/** Türe göre schedule'ın kategorisini düzeltir (eski Hijyen → Aktiviteler migration) */
const migrateScheduleCategory = (s: any) => {
  // plans tablosundan gelen veriler zaten dönüştürülmüş, tekrar migrate etme
  if (s._source === 'plans') {
    const stat = s.status === 'completed' ? 'done' : s.status;
    return { ...s, status: stat };
  }
  let cat = s.category === 'Temizlik' ? 'Hijyen' : s.category;
  if (cat === 'Hijyen' && TOILET_TRAINING_SUBS.includes(s.sub_category)) {
    cat = 'Aktiviteler';
  }
  // İç Parazit ve Dış Parazit görevlerini Sağlık'tan Aşı (Medikal) kategorisine taşı
  if ((cat === 'Saglik' || cat === 'Parazit') && (s.sub_category?.includes('Parazit') || s.title?.includes('Parazit'))) {
    cat = 'Medikal';
  }
  let stat = s.status === 'completed' ? 'done' : s.status;
  return { ...s, category: cat, status: stat };
};

/** Görevin tarih ve saatini birleştirerek Date nesnesi üretir */
const getTaskDateTime = (s: any) => {
  if (!s.due_date) return new Date(0)
  const dateStr = s.due_date.includes('T') ? s.due_date.split('T')[0] : s.due_date
  const timeStr = s.due_time || '12:00:00'
  return new Date(`${dateStr}T${timeStr}`)
};

/** Tab'a ait CTA bilgileri — türe göre dinamik */
function getTabCtaInfo(species: string | undefined): Record<string, { icon: React.ReactNode; btnLabel: string; desc: string; title: string; gradient: string }> {
  const isDog = species === 'Köpek' || species === 'dog';
  // const isCat = species === 'Kedi' || species === 'cat';
  return {
    'Sağlık':    { icon: <FirstAidIcon width={28} height={28} />, btnLabel: 'Sağlık Görevi Planla', desc: 'Kilo ölçümü, semptom takibi, ilaç kullanımı planlayın.', title: 'Sağlık Takibi', gradient: 'from-red-100 to-rose-50' },
    'Aşı':       { icon: <VaccineIcon width={28} height={28} />, btnLabel: 'Aşı Görevi Planla', desc: 'Aşı ve bağışıklık hatırlatmaları oluşturun.', title: 'Aşı Takibi', gradient: 'from-blue-100 to-sky-50' },
    'Parazit':   { icon: <ParasiteIcon width={28} height={28} />, btnLabel: 'Parazit Görevi Planla', desc: 'İç ve dış parazit koruma hatırlatmaları oluşturun.', title: 'Parazit Koruması', gradient: 'from-teal-100 to-emerald-50' },
    'Bakım':     { icon: <ShampooIcon width={28} height={28} />, btnLabel: 'Bakım Görevi Planla', desc: isDog ? 'Banyo, tırnak kesimi ve tüy bakımı planlayın.' : 'Tırnak kesimi, kulak temizliği ve tüy bakımı planlayın.', title: 'Bakım Rutini', gradient: 'from-pink-100 to-fuchsia-50' },
    'Beslenme':  { icon: <BowlIcon width={28} height={28} />, btnLabel: 'Beslenme Görevi Planla', desc: 'Mama siparişi ve diyet değişikliği planlayın.', title: 'Beslenme Planı', gradient: 'from-orange-100 to-amber-50' },
    'Hijyen':    { icon: <ScoopIcon width={28} height={28} />, btnLabel: 'Hijyen Görevi Planla', desc: isDog ? 'Çiş pedi temizliği, yatak ve ortam hijyeni planlayın.' : 'Kum kabı temizleme, yatak ve ortam hijyeni planlayın.', title: 'Hijyen Takibi', gradient: 'from-teal-100 to-emerald-50' },
    'Aktivite':  { icon: <BoneIcon width={28} height={28} />, btnLabel: 'Aktivite Görevi Planla', desc: isDog ? 'Yürüyüş, dışarı tuvalet eğitimi, oyun ve egzersiz rutinleri oluşturun.' : 'Kedi tuvalet eğitimi, oyun ve eğitim seansları planlayın.', title: 'Aktivite Planı', gradient: 'from-green-100 to-lime-50' },
    'Veteriner': { icon: <CarrierIcon width={28} height={28} />, btnLabel: 'Veteriner Görevi Planla', desc: 'Genel kontrol and takip randevuları oluşturun.', title: 'Veteriner Takibi', gradient: 'from-purple-100 to-indigo-50' },
  };
}

export interface PetDetailProps {
  pet: any;
  age: { text: string; label: string };
  score: number;
  overdue: number;
  schedules: any[];
  diseases: any[];
  allergies: any[];
  medications: any[];
  growthRecords: any[];
  appointments: any[];
  nutritionLogs: any[];
  inventory: any;
  feedingLogs: any[];
  weightLogs: any[];
  assignments: any[];
  payments: any[];
  subscription: any;
  activeLostReport?: any;
  hasPasskey?: boolean;
  isAdminView?: boolean;
  lastVaccineRecord?: { vaccine_name?: string; administered_at?: string; status?: string | null } | null;
}

export function getTaskCardStyle(isOverdue: boolean, isCompleted: boolean) {
  if (isOverdue) {
    return {
      bg: 'bg-red-50/70 border border-red-100/50',
      hoverBg: 'hover:bg-red-50/90',
      textTitle: 'text-red-950',
      textSub: 'text-red-800',
      textDate: 'text-red-600 animate-pulse',
      textDots: 'text-red-800 hover:text-red-950',
      iconBorder: 'border-red-100/50',
      badgeBg: 'bg-red-100/80',
      badgeText: 'text-red-950',
      iconColor: 'text-red-700'
    };
  } else if (!isCompleted) {
    return {
      bg: 'bg-primary-soft/70 border border-primary/10',
      hoverBg: 'hover:bg-primary-soft/90',
      textTitle: 'text-text-primary',
      textSub: 'text-text-secondary',
      textDate: 'text-primary',
      textDots: 'text-text-secondary hover:text-primary',
      iconBorder: 'border-primary/10',
      badgeBg: 'bg-primary-soft',
      badgeText: 'text-primary',
      iconColor: 'text-primary'
    };
  }
  return {
    bg: 'bg-[#edf7f6]',
    hoverBg: 'hover:bg-[#e0f4f1]',
    textTitle: 'text-[#0f3a35]',
    textSub: 'text-[#3c6b65]',
    textDate: 'text-[#5a8680]',
    textDots: 'text-[#3c6b65] hover:text-[#0f3a35]',
    iconBorder: 'border-[#edf7f6]',
    badgeBg: 'bg-emerald-100/80',
    badgeText: 'text-emerald-950',
    iconColor: 'text-emerald-700'
  };
}

export default function PetDetailClient({ pet, age, score, overdue, schedules, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, inventory, feedingLogs, weightLogs, assignments, payments, subscription, activeLostReport, hasPasskey = false, isAdminView = false, lastVaccineRecord }: PetDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // url-param → url-safe section id (div id ve scroll için)
  const TAB_URL_MAP: Record<string, string> = {
    'ozet':     'ozet',
    'saglik':   'saglik',
    'asi':      'asi',
    'bakim':    'bakim',
    'beslenme': 'beslenme',
    'hijyen':   'hijyen',
    'aktivite': 'aktivite',
    'veteriner':'veteriner',
    'diger':    'diger',
    'raporlar': 'raporlar',
  }
  // url-param → Turkish module.name (openSections için)
  const SECTION_NAME_MAP: Record<string, string> = {
    'ozet': 'Özet', 'saglik': 'Sağlık', 'asi': 'Aşı', 'parazit': 'Parazit',
    'bakim': 'Bakım', 'beslenme': 'Beslenme', 'hijyen': 'Hijyen',
    'aktivite': 'Aktivite', 'veteriner': 'Veteriner',
    'diger': 'Diğer', 'raporlar': 'Raporlar & Belgeler',
  }
  // Turkish module.name → url-safe id (div id için)
  const MODULE_ID_MAP: Record<string, string> = {
    'Özet': 'ozet', 'Sağlık': 'saglik', 'Aşı': 'asi', 'Parazit': 'parazit',
    'Bakım': 'bakim', 'Beslenme': 'beslenme', 'Hijyen': 'hijyen',
    'Aktivite': 'aktivite', 'Veteriner': 'veteriner',
    'Diğer': 'diger', 'Raporlar & Belgeler': 'raporlar',
  }

  const tabParam = searchParams?.get('tab')
  const initialTab = (tabParam === 'saglik' || tabParam === 'asi' || tabParam === 'parazit' || tabParam === 'vaccines' || tabParam === 'parasite' || tabParam === 'veteriner')
    ? 'saglik'
    : (tabParam === 'bakim' || tabParam === 'hijyen' || tabParam === 'aktivite' || tabParam === 'diger')
      ? 'bakim'
      : (tabParam === 'takvim' || tabParam === 'ekstra' || tabParam === 'beslenme')
        ? tabParam
        : 'ozet'

  const [activeTab, setActiveTab] = useState<'ozet'|'saglik'|'bakim'|'takvim'|'beslenme'|'ekstra'>(initialTab)
  const { filterVisibleTasks, dismissTask } = useDismissedMicroTasks()

  // Canlı saat — her dakika yenilenerek gecikme etiketlerini ve overdue sayısını günceller
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(tick)
  }, [])

  const initialSection = SECTION_NAME_MAP[tabParam ?? ''] ?? null
  const [openSections, setOpenSections] = useState<Set<string>>(
    initialSection ? new Set([initialSection]) : new Set()
  )

  const [showCoverSourceSheet, setShowCoverSourceSheet] = useState(false)
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(() => {
    return tabParam === 'family' || tabParam === 'share'
  })
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string|null>(null)
  const [selectedPosition, setSelectedPosition] = useState<'top'|'center'|'bottom'>('center')
  const [selectedScale, setSelectedScale] = useState(1)

  async function handleSavePosition() {
    const formData = new FormData()
    formData.append('cover_position', selectedPosition)
    formData.append('cover_scale', selectedScale.toString())
    if (pendingCoverUrl) {
      formData.append('cover_url', pendingCoverUrl)
    }
    
    await fetch(`/api/pets/${pet.id}`, {
      method: 'PATCH',
      body: formData
    })
    
    setShowPositionModal(false)
    setPendingCoverUrl(null)
    router.refresh()
  }

  // URL'den gelen tab varsa o bölüme scroll et
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (!tabParam) return
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${tabParam}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Dinamik bölüm açma ve scroll dinleyicisi
  useEffect(() => {
    const handleOpenSection = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sectionName = customEvent.detail?.section;
      if (sectionName) {
        setOpenSections(prev => {
          const next = new Set(prev);
          next.add(sectionName);
          return next;
        });
        setTimeout(() => {
          const el = document.getElementById('section-raporlar');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };
    window.addEventListener('open-pet-section', handleOpenSection);
    return () => window.removeEventListener('open-pet-section', handleOpenSection);
  }, [])
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [activeTaskModal, setActiveTaskModal] = useState<TaskModalType>(null)
  const [parasiteCompletionTask, setParasiteCompletionTask] = useState<any>(null)
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [isSmartScannerOpen, setIsSmartScannerOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [medicationActionTask, setMedicationActionTask] = useState<any>(null)
  const [medicationNote, setMedicationNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [trackerRefreshKey, setTrackerRefreshKey] = useState(0)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [showPetMenuSheet, setShowPetMenuSheet] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverAdjustingUrl, setCoverAdjustingUrl] = useState<string | null>(null)
  const [savingAdjust, setSavingAdjust] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleDragStart = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleDragEnd = () => {
    setDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDragging(true)
      setDragStart({ 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    })
  }

  const handleTouchEnd = () => {
    setDragging(false)
  }

  const saveCoverAdjustment = async () => {
    if (!coverAdjustingUrl) return
    setSavingAdjust(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error("Kullanıcı oturumu bulunamadı.")

      const coverPosValue = `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`

      // Profil & Kapak Kaydet
      const { error: updateError } = await supabase
        .from('pets')
        .update({ 
          cover_url: coverAdjustingUrl,
          cover_position: coverPosValue
        })
        .eq('id', pet.id)
      if (updateError) throw updateError

      // Galeriye Ekle
      const { error: galleryError } = await supabase
        .from('pet_gallery')
        .insert({
          pet_id: pet.id,
          user_id: userId,
          image_url: coverAdjustingUrl
        })
      if (galleryError) console.error("Galeriye kaydedilemedi:", galleryError)

      setCoverAdjustingUrl(null)
      router.refresh()
    } catch (err: any) {
      setGeneralError("Kapak fotoğrafı ayarlanamadı: " + err.message)
      setTimeout(() => setGeneralError(null), 5000)
    } finally {
      setSavingAdjust(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverUploading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error("Kullanıcı oturumu bulunamadı.")

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `covers/${userId}/${Date.now()}.${ext}`
      
      // 1. Supabase Storage'a Yükle
      const { error: uploadError } = await supabase.storage
        .from('pet-avatars')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      // 2. Doğrudan Sürükle-Bırak Pozisyonlama Modalı Aç
      setZoom(1.0)
      setPan({ x: 0, y: 0 })
      setCoverAdjustingUrl(publicUrl)
    } catch (err: any) {
      setGeneralError("Kapak fotoğrafı yüklenemedi: " + err.message)
      setTimeout(() => setGeneralError(null), 5000)
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error("Kullanıcı oturumu bulunamadı.")

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('pet-avatars')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('pets')
        .update({ avatar_url: publicUrl })
        .eq('id', pet.id)
      if (updateError) throw updateError

      router.refresh()
    } catch (err: any) {
      setGeneralError("Profil fotoğrafı yüklenemedi: " + err.message)
      setTimeout(() => setGeneralError(null), 5000)
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }
  
  const [lostWizardOpen, setLostWizardOpen] = useState(false)
  const [markFoundLoading, setMarkFoundLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [markFoundConfirmOpen, setMarkFoundConfirmOpen] = useState(false)



  const [plannedTimeFilter, setPlannedTimeFilter] = useState<string>('Bugün + Gecikenler')
  const [plannedSubCatFilter, setPlannedSubCatFilter] = useState<string>('Tümü')
  const [completedTimeFilter, setCompletedTimeFilter] = useState<string>('Tümü')
  const [completedSubCatFilter, setCompletedSubCatFilter] = useState<string>('Tümü')
  const [filterSheetType, setFilterSheetType] = useState<'planned' | 'completed' | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)



  const handleEditVetInfo = () => {
    setQuickUpdateConfig({
      title: 'Veteriner Bilgileri',
      desc: 'Veteriner klinik bilgilerinizi güncelleyin.',
      endpoint: `/api/pets/${pet.id}`,
      method: 'PATCH',
      fields: [
        { name: 'vet_company', type: 'text', label: 'Klinik / Şirket Adı', placeholder: 'Örn: Pati Veteriner Kliniği', defaultValue: pet.vet_company || '', required: true },
        { name: 'vet_name', type: 'text', label: 'Veteriner Adı (Opsiyonel)', placeholder: 'Örn: Dr. Ali Yılmaz', defaultValue: pet.vet_name || '', required: false },
        { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx', defaultValue: pet.vet_phone || '', required: false },
        { name: 'vet_email', type: 'email', label: 'E-posta (Opsiyonel)', placeholder: 'klinik@email.com', defaultValue: pet.vet_email || '', required: false }
      ]
    })
  }

  // OPOS Cilt 3: native confirm() yerine ConfirmModal kullanılır.
  const handleMarkFound = () => setMarkFoundConfirmOpen(true)

  const confirmMarkFound = async () => {
    setMarkFoundConfirmOpen(false)
    setMarkFoundLoading(true)
    setGeneralError(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      })
      if (!res.ok) throw new Error('Hata oluştu')
      router.refresh()
    } catch(err) {
      setGeneralError('İşlem başarısız oldu.')
      setTimeout(() => setGeneralError(null), 3000)
    } finally {
      setMarkFoundLoading(false)
    }
  }

  const tabCtaInfo = getTabCtaInfo(pet.species);

  const [localSchedules, setLocalSchedules] = useState<any[]>(() =>
    schedules ? [...schedules].map(migrateScheduleCategory).sort((a: any, b: any) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime()) : []
  )

  useEffect(() => {
    if (schedules) {
      setLocalSchedules([...schedules].map(migrateScheduleCategory).sort((a: any, b: any) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime()))
    }
  }, [schedules])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel(`public:schedules_and_plans:pet_${pet.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_schedules', filter: `pet_id=eq.${pet.id}` },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `pet_id=eq.${pet.id}` },
        () => {
          router.refresh()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [pet.id, router])

  const handleEditTask = (item: any) => {
    const realPlanId = resolveRealPlanId(item);
    if (realPlanId) {
      router.push(`/owner/plan-yap/edit/${realPlanId}`);
    } else {
      // health_schedules kaynaklı kayıtlar için edit sayfası desteği yok; modal fallback
      setTaskToEdit(item);
      setTaskWizardOpen(true);
    }
  }

  const handleTaskClick = (item: any) => {
    if (item.extra_data?.record_type === 'medication' && item.status !== 'done') {
      setMedicationActionTask(item);
      setMedicationNote('');
      setShowNoteInput(false);
      return;
    }
    const realPlanId = resolveRealPlanId(item);
    if (realPlanId) {
      router.push(`/owner/plan-yap/edit/${realPlanId}`);
    } else {
      setTaskToEdit(item);
      setTaskWizardOpen(true);
    }
  }

  const handleMedicationConfirm = async (task: any, noteText: string) => {
    const previous = localSchedules
    setLocalSchedules(prev => prev.map(s => s.id === task.id ? { ...s, status: 'done', notes: noteText || s.notes } : s));
    if (!task.id.toString().startsWith('mock-')) {
      try {
        const planId = getRealPlanId(task.id);
        let payload: any = { status: 'completed' };
        if (noteText) payload.note = noteText;
        
        if (task.extra_data?.record_type === 'medication' && task.extra_data?.medication) {
          const currentStock = task.extra_data.medication.stock ?? 0;
          const nextStock = Math.max(0, currentStock - 1);
          payload.extra_data = {
            ...task.extra_data,
            medication: {
              ...task.extra_data.medication,
              stock: nextStock
            }
          };
        }

        const res = await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('İlaç kaydı güncellenemedi')
      } catch (err: any) {
        setLocalSchedules(previous)
        setGeneralError('İlaç kaydı güncellenemedi. Lütfen tekrar deneyin.')
        setTimeout(() => setGeneralError(null), 4000)
        console.error('[PetDetailClient] handleMedicationConfirm:', err)
        setMedicationActionTask(null);
        return
      }
    }
    setMedicationActionTask(null);
    setMedicationNote('');
    setShowNoteInput(false);
    setTrackerRefreshKey(prev => prev + 1);
    router.refresh();
  };

  const handleMedicationSnooze = async (task: any) => {
    setLocalSchedules(prev => prev.map(s => {
      if (s.id !== task.id) return s;
      const d = getTaskDateTime(s);
      d.setMinutes(d.getMinutes() + 30);
      
      const dueDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
      const dueTime = d.toLocaleTimeString('tr-TR', { 
        timeZone: 'Europe/Istanbul', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
      return { ...s, due_date: dueDate, due_time: dueTime };
    }));
    
    if (!task.id.toString().startsWith('mock-')) {
      const d = getTaskDateTime(task);
      d.setMinutes(d.getMinutes() + 30);
      try {
        const planId = getRealPlanId(task.id);
        await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduled_at: d.toISOString() })
        });
      } catch (err) {
        console.error('[handleMedicationSnooze] Error:', err);
      }
    }
    setMedicationActionTask(null);
    setMedicationNote('');
    setShowNoteInput(false);
    setTrackerRefreshKey(prev => prev + 1);
    router.refresh();
  };

  const handleMedicationSkip = async (task: any) => {
    const previous = localSchedules
    setLocalSchedules(prev => prev.map(s => s.id === task.id ? { ...s, status: 'done' } : s));
    if (!task.id.toString().startsWith('mock-')) {
      try {
        const planId = getRealPlanId(task.id);
        const res = await fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });
        if (!res.ok) throw new Error('İlaç görevi atlanamadı')
      } catch (err: any) {
        setLocalSchedules(previous)
        setGeneralError('İşlem kaydedilemedi. Lütfen tekrar deneyin.')
        setTimeout(() => setGeneralError(null), 4000)
        console.error('[PetDetailClient] handleMedicationSkip:', err)
        setMedicationActionTask(null);
        return
      }
    }
    setMedicationActionTask(null);
    setMedicationNote('');
    setShowNoteInput(false);
    setTrackerRefreshKey(prev => prev + 1);
    router.refresh();
  };

  const handlePlanla = (tabName: string) => {
    if (tabName === 'Beslenme') {
      router.push(`/owner/pets/${pet.id}/nutrition`)
      return
    }
    const routeMap: Record<string, string> = {
      'Sağlık': 'saglik',
      'Aşı': 'asi',
      'Parazit': 'parazit',
      'Bakım': 'bakim',
      'Hijyen': 'hijyen',
      'Aktivite': 'aktivite',
      'Veteriner': 'saglik'
    }
    const routeKey = routeMap[tabName]
    if (routeKey) {
      router.push(`/owner/plan-yap/${routeKey}?pet_id=${pet.id}`)
    } else {
      router.push(`/owner/plan-yap?pet_id=${pet.id}`)
    }
  }

  const getSchedulesForTab = (tabName: string) => {
    const dbCat = TAB_CATEGORY_MAP[tabName]
    if (!dbCat) return []
    return localSchedules.filter((s: any) => {
      if (s.category !== dbCat) return false;
      if (tabName === 'Sağlık') {
        if (s.sub_type === 'Kilo & Boy Ölçümü' || (s.title && s.title.includes('Kilo & Boy'))) return false;
      }
      if (tabName === 'Aşı') {
        return (s.sub_category || '').includes('Aşı') || !(s.sub_category || '').includes('Parazit');
      }
      if (tabName === 'Parazit') {
        return (s.sub_category || '').includes('Parazit') || (s.title || '').toLowerCase().includes('parazit');
      }
      return true;
    }).filter((s: any) => s.status !== 'done')
  }

  const getCompletedSchedulesForTab = (tabName: string) => {
    const dbCat = TAB_CATEGORY_MAP[tabName]
    if (!dbCat) return []
    return localSchedules.filter((s: any) => {
      if (s.category !== dbCat) return false;
      if (tabName === 'Sağlık') {
        if (s.sub_type === 'Kilo & Boy Ölçümü' || (s.title && s.title.includes('Kilo & Boy'))) return false;
      }
      if (tabName === 'Aşı') {
        return (s.sub_category || '').includes('Aşı') || !(s.sub_category || '').includes('Parazit');
      }
      if (tabName === 'Parazit') {
        return (s.sub_category || '').includes('Parazit') || (s.title || '').toLowerCase().includes('parazit');
      }
      return true;
    }).filter((s: any) => s.status === 'done')
  }

  const getSchedulesForPeriod = (period: 'week' | 'all' | 'overdue' | 'done') => {
    const now = new Date()
    
    return localSchedules.filter((s: any) => {
      if (period === 'done') return s.status === 'done'
      if (s.status === 'done') return false
      
      try {
        const d = getTaskDateTime(s)
        
        if (period === 'overdue') return d < now
        
        // For planned tasks (week/all), we show tasks that are NOT overdue
        if (d < now) return false
        
        if (period === 'all') return true
        
        const end = new Date(now)
        if (period === 'week') end.setDate(now.getDate() + 7)
        
        return d <= end
      } catch { return false }
    }).sort((a: any, b: any) => {
      if (period === 'done') return getTaskDateTime(b).getTime() - getTaskDateTime(a).getTime()
      return getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime()
    })
  }

  const formatTaskDate = (dueDateStr: string, dueTimeStr: string | null, isDone?: boolean) => {
    try {
      const d = new Date(dueDateStr)
      if (isNaN(d.getTime())) return dueDateStr
      const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
      
      let timeText = ''
      if (dueTimeStr) {
        const parts = dueTimeStr.split(':')
        if (parts.length >= 2) {
          timeText = ` - ${parts[0]}:${parts[1]}`
        }
      }
      const dateText = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}${timeText}`
      
      if (isDone) {
        return (
          <span className="inline-flex items-center flex-wrap gap-1.5">
            <span>{dateText}</span>
            <span className="text-success bg-success/10 px-2 py-0.5 rounded-md font-bold tracking-wide">✓ Tamamlandı</span>
          </span>
        )
      }
      
      const nowDate = new Date(now)
      const dateOnlyStr = dueDateStr.includes('T') ? dueDateStr.split('T')[0] : dueDateStr
      const timeStr = dueTimeStr || '12:00:00'
      const taskDateTime = new Date(`${dateOnlyStr}T${timeStr}`)
      
      const isOverdue = taskDateTime < nowDate
      
      let badge = null;
      
      if (isOverdue) {
        const diffMs = nowDate.getTime() - taskDateTime.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))
        
        if (diffMins < 60) {
          const mins = Math.max(1, diffMins)
          // Minor delay (0-60 min): Amber warning
          badge = <span className="text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⚠️ {mins} dk gecikti</span>
        } else if (diffMins < 1440) { // 24 hours
          const hours = Math.floor(diffMins / 60)
          badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⚠️ {hours} saat gecikti</span>
        } else {
          const days = Math.floor(diffMins / 1440)
          badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⚠️ {days} gün gecikti</span>
        }
      } else {
        const today = new Date()
        today.setHours(0,0,0,0)
        const targetDate = new Date(d)
        targetDate.setHours(0,0,0,0)
        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays === 0) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⏳ Bugün</span>;
        else if (diffDays === 1) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⏳ Yarın</span>;
        else if (diffDays === -1) badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⚠️ Dün</span>;
        else if (diffDays < -1) badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⚠️ {Math.abs(diffDays)} gün gecikti</span>;
        else if (diffDays <= 3) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">⏳ {diffDays} gün kaldı</span>;
        else badge = <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold tracking-wide">🗓️ {diffDays} gün kaldı</span>;
      }
      
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5">
          <span>{dateText}</span>
          {badge}
        </span>
      )
    } catch { return dueDateStr }
  }

  /** plans tablosundan gelen kayıtları tespit et */
  const isPlanSource = (id: string) => id.toString().startsWith('plan_')
  const getRealPlanId = (id: string) => id.replace('plan_', '')

  /**
   * Bir kaydın gerçek plan id'sini bulur — gerçek plan (plan_xxx) veya
   * tekrarlayan planın sanal bir occurrence'ı (virtual_..., _plan_id taşır)
   * için çalışır. Sanal event'lerin kendi id'si DB'de yoktur; düzenleme
   * her zaman kaynak plana yönlendirilmelidir.
   */
  const resolveRealPlanId = (item: any): string | null => {
    if (isPlanSource(item.id)) return getRealPlanId(item.id)
    if (item._is_virtual && item._source === 'plans' && item._plan_id) return item._plan_id
    return null
  }

  const handleDeleteTask = async (id: string) => {
    const previous = localSchedules
    setLocalSchedules(prev => prev.filter(s => s.id !== id))
    setActiveMenuId(null)
    if (!id.toString().startsWith('mock-')) {
      try {
        if (isPlanSource(id)) {
          const res = await fetch(`/api/plans/${getRealPlanId(id)}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Görev silinemedi')
        } else {
          const { error } = await createBrowserSupabaseClient().from('health_schedules').delete().eq('id', id)
          if (error) throw new Error(error.message)
        }
        router.refresh()
      } catch (err: any) {
        // Sessiz yutma yok: iyimser güncellemeyi geri al ve kullanıcıyı bilgilendir.
        setLocalSchedules(previous)
        setGeneralError('Görev silinemedi. Lütfen tekrar deneyin.')
        setTimeout(() => setGeneralError(null), 4000)
        console.error('[PetDetailClient] handleDeleteTask:', err)
        return
      }
    }
    setTrackerRefreshKey(prev => prev + 1)
  }

  const handleMarkCompleted = async (id: string) => {
    setActiveMenuId(null);
    const item = localSchedules.find(s => s.id === id);
    if (!item) return;

    if (item._source === 'plans' && item._plan_category === 'parazit') {
      setParasiteCompletionTask(item);
      return;
    }

    const completeTaskInDb = async () => {
      const previous = localSchedules
      setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done' } : s));
      if (!id.toString().startsWith('mock-')) {
        try {
          if (isPlanSource(id)) {
            const planId = getRealPlanId(id);
            let payload: any = { status: 'completed' };

            if (item.extra_data?.record_type === 'medication' && item.extra_data?.medication) {
              const currentStock = item.extra_data.medication.stock ?? 0;
              const nextStock = Math.max(0, currentStock - 1);
              payload.extra_data = {
                ...item.extra_data,
                medication: {
                  ...item.extra_data.medication,
                  stock: nextStock
                }
              };
            }

            const res = await fetch(`/api/plans/${planId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error('Görev tamamlanamadı')
          } else {
            const { error } = await createBrowserSupabaseClient().from('health_schedules').update({ status: 'completed' }).eq('id', id);
            if (error) throw new Error(error.message)
          }
          router.refresh();
        } catch (err: any) {
          // Sessiz yutma yok: aksi halde görev tamamlanmış görünür ama DB'de değişmez.
          setLocalSchedules(previous)
          setGeneralError('Görev tamamlanamadı. Lütfen tekrar deneyin.')
          setTimeout(() => setGeneralError(null), 4000)
          console.error('[PetDetailClient] completeTaskInDb:', err)
          return
        }
      }
      setTrackerRefreshKey(prev => prev + 1);
    };

    if (item.sub_category === 'Kilo Takibi') {
      setQuickUpdateConfig({
        title: 'Kilo Takibi Tamamlanıyor',
        desc: 'Bu görevi tamamlamak için evcil hayvanınızın güncel kilosunu giriniz.',
        fields: [
          { name: 'weight_kg', type: 'number', label: 'Güncel Kilo (kg)', placeholder: 'Örn: 4.5', required: true },
          { name: 'height_cm', type: 'number', label: 'Boy (cm) (Opsiyonel)', required: false }
        ],
        customHandler: async (fd: FormData) => {
          const res = await fetch(`/api/pets/${pet.id}/growth`, {
            method: 'POST',
            body: fd
          });
          if (!res.ok) throw new Error('Gelişim verisi kaydedilemedi, lütfen tekrar deneyin.');
          await completeTaskInDb();
        }
      });
      return;
    }

    if (item.category === 'Medikal' || item.sub_category === 'Aşı' || item.sub_category?.includes('Parazit')) {
      setQuickUpdateConfig({
        title: `${item.title || item.sub_category} Tamamlanıyor`,
        desc: 'Uygulanan ilacın veya aşının markasını not olarak ekleyiniz.',
        fields: [
          { name: 'medicine_brand', type: 'text', label: 'İlaç/Aşı Markası', placeholder: 'Örn: Nexgard, Nobivac', required: true },
        ],
        customHandler: async (fd: FormData) => {
          const brand = fd.get('medicine_brand');
          if (!id.toString().startsWith('mock-') && brand) {
            if (isPlanSource(id)) {
              await fetch(`/api/plans/${getRealPlanId(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed', note: brand })
              })
            } else {
              await createBrowserSupabaseClient().from('health_schedules').update({ 
                status: 'completed',
                notes: brand 
              }).eq('id', id);
            }
          }
          setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done', notes: brand } : s));
          setTrackerRefreshKey(prev => prev + 1);
          router.refresh();
        }
      });
      return;
    }

    await completeTaskInDb();
  }

  const handlePostpone = async (id: string) => {
    const item = localSchedules.find(s => s.id === id)
    if (!item) return

    const d = getTaskDateTime(item)
    d.setDate(d.getDate() + 1)

    const newDueDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
    const preservedTime = item.due_time || '12:00:00'

    setLocalSchedules(prev => prev.map(s => {
      if (s.id !== id) return s
      return { ...s, due_date: newDueDate, due_time: preservedTime }
    }))
    setActiveMenuId(null)

    if (!id.toString().startsWith('mock-')) {
      try {
        if (isPlanSource(id)) {
          const scheduledAtIso = new Date(`${newDueDate}T${preservedTime}`).toISOString()
          await fetch(`/api/plans/${getRealPlanId(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_at: scheduledAtIso })
          })
        } else {
          await createBrowserSupabaseClient().from('health_schedules').update({ due_date: newDueDate }).eq('id', id)
        }
        router.refresh()
      } catch (err) {
        console.error('[handlePostpone] Error:', err)
      }
    }
    setTrackerRefreshKey(prev => prev + 1)
  }

  const toggleSection = (name: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }




  const applyTimeFilter = (taskDate: Date, filter: string) => {
    if (filter === 'Tümü') return true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const taskDateStr = taskDate.toISOString().split('T')[0];
    
    if (filter === 'Bugün') return taskDateStr === todayStr;
    
    if (filter === 'Bugün + Gecikenler') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return taskDate <= today;
    }
    
    const diffMs = taskDate.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (filter === 'Geçen hafta') return diffDays < 0 && diffDays >= -7;
    if (filter === 'Gelecek hafta') return diffDays > 0 && diffDays <= 7;
    if (filter === 'Geçen ay') return diffDays < 0 && diffDays >= -30;
    if (filter === 'Gelecek ay') return diffDays > 0 && diffDays <= 30;
    if (filter === 'Geçen sene') return diffDays < 0 && diffDays >= -365;
    if (filter === 'Gelecek yıl') return diffDays > 0 && diffDays <= 365;
    
    return true;
  }

  const formatFrequency = (days: number | null | undefined, label?: string | null): string => {
    if (label) return label;
    if (!days) return 'Her Yıl';
    if (days === 30) return 'Ayda Bir';
    if (days === 60) return '2 Ayda Bir';
    if (days === 90) return '3 Ayda Bir';
    if (days === 365) return 'Her Yıl';
    return `${days} Günde Bir`;
  };

  const renderTaskList = (title: string, list: any[], emptyMessage?: string, customEmptyContent?: React.ReactNode, emptyIcon: string = '✨') => {
    if ((!list || list.length === 0) && !emptyMessage && !customEmptyContent) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
      <div className="flex flex-col gap-3">
        {title && <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-widest px-1">{title}</h4>}
        {(!list || list.length === 0) ? (
          customEmptyContent ? customEmptyContent : (
            <div className="py-6 bg-bg-main/50 rounded-card border border-dashed border-border-main text-center flex flex-col items-center gap-2">
              <span className="text-2xl opacity-80">{emptyIcon}</span>
              <p className="text-[13px] font-bold text-text-secondary">{emptyMessage}</p>
            </div>
          )
        ) : (
          list.map((item: any) => {
          const isCompleted = item.status === 'done';
          const now = new Date();
          const isOverdue = !isCompleted && getTaskDateTime(item) < now;

          // Determine styling based on status
          const cardStyle = getTaskCardStyle(isOverdue, isCompleted);

          return (
            <div key={item.id} onClick={() => handleTaskClick(item)} className={`flex items-center justify-between p-4 ${cardStyle.bg} ${cardStyle.hoverBg} rounded-card transition-colors cursor-pointer`}>
              <div className="flex-1 min-w-0 pr-3">
                <p className={`font-extrabold text-sm line-clamp-2 break-words ${cardStyle.textTitle}`}>
                  {item.title || item.vaccines?.name || 'Görev'}
                  {item.sub_category === 'Zorunlu Aşılar' && (
                    <span className="font-normal opacity-80 ml-1">/ {formatFrequency(item.vaccines?.frequency_days, item.vaccines?.frequency_label || item.frequency_label)}</span>
                  )}
                </p>
                {item.sub_category && item.sub_category !== (item.title || item.vaccines?.name) && (
                  <p className={`text-[11px] font-semibold ${cardStyle.textSub}`}>
                    {item.extra_data?.record_type === 'medication' && item.extra_data?.medication?.dosage_string
                      ? item.extra_data.medication.dosage_string
                      : item.sub_category}
                  </p>
                )}
                <div className={`text-[11px] font-semibold mt-1.5 ${cardStyle.textDate}`}>{formatTaskDate(item.due_date, item.due_time, isCompleted)}</div>
              </div>
              <div className="relative shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                  className={`${cardStyle.textDots} p-2 transition-colors focus:outline-none cursor-pointer`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
                {activeMenuId === item.id && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-md shadow-xl border border-border-main/50 py-2 z-[200]">
                    <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                    <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary-soft flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                    <div className="border-t border-border-main/30 mx-2 my-1"/>
                    <button onClick={(e) => { e.stopPropagation(); handleEditTask(item); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                  </div>
                )}
              </div>
            </div>
          );
          })
        )}
      </div>
    );
  }

  const TIME_FILTER_OPTIONS = ['Bugün + Gecikenler', 'Tümü', 'Geçen sene', 'Geçen ay', 'Geçen hafta', 'Bugün', 'Gelecek hafta', 'Gelecek ay', 'Gelecek yıl'];

  const renderTabFiltersAndTasks = (tabName: string) => {
    const plannedTasks = getSchedulesForTab(tabName);
    const completedTasks = getCompletedSchedulesForTab(tabName);

    // Extract unique sub categories
    const plannedSubCats = Array.from(new Set(plannedTasks.map(t => t.sub_category).filter(Boolean))) as string[];
    const completedSubCats = Array.from(new Set(completedTasks.map(t => t.sub_category).filter(Boolean))) as string[];
    
    // Filter functions
    const filterList = (list: any[], timeFilter: string, subCatFilter: string) => list.filter(item => {
      if (subCatFilter !== 'Tümü' && item.sub_category !== subCatFilter) return false;
      if (timeFilter !== 'Tümü') {
         if (!applyTimeFilter(getTaskDateTime(item), timeFilter)) return false;
      }
      return true;
    });

    const filteredPlanned = filterList(plannedTasks, plannedTimeFilter, plannedSubCatFilter);
    const filteredCompleted = filterList(completedTasks, completedTimeFilter, completedSubCatFilter);
    const hasAnyTasks = plannedTasks.length > 0 || completedTasks.length > 0;
    const cta = (tabCtaInfo as any)[tabName];

    const upcomingTasks = plannedTasks.filter(item => {
      const diffMs = getTaskDateTime(item).getTime() - new Date().getTime();
      return diffMs > 0;
    }).sort((a,b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime());

    let customEmptyContent: React.ReactNode = undefined;
    if (filteredPlanned.length === 0 && plannedTimeFilter === 'Bugün + Gecikenler' && upcomingTasks.length > 0) {
      customEmptyContent = (
        <div className="flex flex-col gap-4">
          <div className="py-6 bg-bg-main/50 rounded-card border border-dashed border-border-main text-center flex flex-col items-center gap-2 px-4">
            <span className="text-2xl opacity-80">✨</span>
            <p className="text-[13px] font-bold text-text-secondary leading-relaxed">
              Bugün için planlı göreviniz yok. İleri tarihli <span className="text-primary font-bold">{upcomingTasks.length}</span> görevinizi görmek için filtreyi &apos;Tüm Zamanlar&apos; olarak değiştirin.
            </p>
          </div>
          {renderTaskList('Yaklaşan Görevler', upcomingTasks.slice(0, 3))}
        </div>
      );
    }

    const handleCtaClick = () => {
      if (tabName === 'Veteriner' && !pet.vet_company && !pet.vet_name && !pet.vet_phone && !pet.vet_email) {
        setQuickUpdateConfig({
          title: 'Veteriner Bilgisi',
          desc: 'Veteriner görevi planlayabilmek için veteriner bilgisini girin.',
          fields: [
            { name: 'vet_company', type: 'text', label: 'Klinik / Şirket Adı', placeholder: 'Örn: Pati Veteriner Kliniği', required: true },
            { name: 'vet_name', type: 'text', label: 'Veteriner Adı (Opsiyonel)', placeholder: 'Örn: Dr. Ali Yılmaz', required: false },
            { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx', required: false },
            { name: 'vet_email', type: 'email', label: 'E-posta (Opsiyonel)', placeholder: 'klinik@email.com', required: false }
          ],
          onSuccess: () => handlePlanla('Veteriner')
        });
      } else {
        handlePlanla(tabName);
      }
    };

    if (!hasAnyTasks) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <div className="py-8 px-4 bg-bg-main/50 rounded-card border border-dashed border-border-main text-center flex flex-col items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-tr ${cta?.gradient || 'from-slate-200 to-slate-300'} rounded-xs flex items-center justify-center shadow-sm mb-1`}>
              <span className="text-2xl">🗓️</span>
            </div>
            <h3 className="font-extrabold text-text-primary text-base">Henüz görev planlanmamış</h3>
            <p className="text-[13px] text-text-secondary max-w-[260px] leading-relaxed mb-2">{cta?.desc || 'Bu kategoride henüz bir görev planlamadınız.'}</p>
            {cta && (
              <button
                onClick={handleCtaClick}
                className="btn-primary min-h-[50px] flex items-center justify-center px-6 text-[13px] font-bold rounded-btn"
              >
                + {cta.btnLabel}
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        {(plannedTasks.length > 0) && (
          <div className="flex flex-col gap-3 card-base p-4 border border-border-main/50 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
              <button 
                onClick={() => setFilterSheetType('planned')}
                className="text-xs font-bold text-primary bg-primary-soft px-3 py-1.5 rounded-btn border border-primary/20 flex items-center gap-1.5 hover:bg-primary hover:text-white transition-colors"
              >
                {plannedTimeFilter === 'Tümü' ? 'Tüm Zamanlar' : plannedTimeFilter}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            {plannedSubCats.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setPlannedSubCatFilter('Tümü')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${plannedSubCatFilter === 'Tümü' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-primary hover:border-primary/30'}`}
                >
                  Tüm Kategoriler
                </button>
                {plannedSubCats.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPlannedSubCatFilter(cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${plannedSubCatFilter === cat ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-primary hover:border-primary/30'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(() => {
          let plannedEmptyMessage = 'Bu filtrelere uygun planlanmış görev bulunmuyor.';
          let plannedEmptyIcon = '✨';

          if (plannedTasks.length === 0 && completedTasks.length > 0) {
            plannedEmptyMessage = 'Harika! Tüm görevler tamamlandı';
            plannedEmptyIcon = '✅';
          }

          return renderTaskList('', filteredPlanned, plannedEmptyMessage, customEmptyContent, plannedEmptyIcon);
        })()}
        
        {completedTasks.length > 0 && (
          <div className="mt-2">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full py-3.5 bg-bg-main hover:bg-border-main/40 text-text-secondary font-bold text-[13px] rounded-btn border border-dashed border-border-main transition-colors flex items-center justify-center gap-2"
            >
              {showCompleted ? 'Tamamlanmış Görevleri Gizle' : `Tamamlanmış Görevleri Gör (${filteredCompleted.length})`}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            {showCompleted && (
              <div className="mt-4 animate-fade-in flex flex-col gap-4">
                {(completedTasks.length > 0) && (
                  <div className="flex flex-col gap-3 card-base p-4 border border-[#3c6b65]/20 bg-[#edf7f6]/30 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[13px] font-semibold text-[#3c6b65] uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
                      <button 
                        onClick={() => setFilterSheetType('completed')}
                        className="text-xs font-bold text-[#3c6b65] bg-[#edf7f6] px-3 py-1.5 rounded-btn border border-[#3c6b65]/30 flex items-center gap-1.5 hover:bg-[#3c6b65] hover:text-white transition-colors"
                      >
                        {completedTimeFilter === 'Tümü' ? 'Tüm Zamanlar' : completedTimeFilter}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    {completedSubCats.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <button
                          onClick={() => setCompletedSubCatFilter('Tümü')}
                          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${completedSubCatFilter === 'Tümü' ? 'bg-[#3c6b65] text-white border-[#3c6b65] shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-[#3c6b65] hover:border-[#3c6b65]/40'}`}
                        >
                          Tüm Kategoriler
                        </button>
                        {completedSubCats.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setCompletedSubCatFilter(cat)}
                            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${completedSubCatFilter === cat ? 'bg-[#3c6b65] text-white border-[#3c6b65] shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-[#3c6b65] hover:border-[#3c6b65]/40'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {renderTaskList('', filteredCompleted, 'Bu filtrelere uygun tamamlanmış görev bulunmuyor.')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const microTasks = filterVisibleTasks(
    pet.id,
    buildPetMicroTasks({
      pet,
      vaccinePlans: schedules?.filter(
        (s: any) => (s.sub_category || '').includes('Aşı') || (s.title || '').toLowerCase().includes('aşı')
      ) ?? [],
      parasitePlans: schedules?.filter(
        (s: any) => (s.sub_category || '').includes('Parazit') || (s.title || '').toLowerCase().includes('parazit')
      ) ?? [],
      carePlans: schedules?.filter(
        (s: any) => s._plan_category === 'bakim' || s.category === 'Bakım' || s.category === 'bakim'
      ) ?? [],
      latestWeight: growthRecords?.[0] ?? null,
      nutritionProfile: nutritionLogs?.[0] ?? null,
    })
  )

  return (
    <div className="flex flex-col gap-6 pb-[100px] pb-safe w-full max-w-6xl mx-auto">
      {generalError && (
        <div role="alert" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xs text-center border border-error/20 mx-4 mt-4">
          {generalError}
        </div>
      )}

      {/* Admin Notice Banner */}
      {isAdminView && (
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-primary text-white text-[13px] font-bold px-5 py-4 rounded-sheet flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-500/15 border border-white/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-lg animate-bounce">🔑</span>
            <span>Yönetici Görünümü: Bu evcil hayvanın bilgilerini görüntülüyorsunuz.</span>
          </div>
          {pet.owner_id && (
            <Link 
              href={`/admin/users/${pet.owner_id}`}
              className="bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all px-4 py-2 rounded-btn text-xs font-semibold tracking-tight self-stretch sm:self-auto text-center"
            >
              Sahip Profiline Dön
            </Link>
          )}
        </div>
      )}

      {/* ── Yeni Pet Hero Kartı ── */}
      {(() => {
        const h = new Date().getHours();
        const greeting = h < 18 ? 'İYİ GÜNLER' : 'İYİ AKŞAMLAR';
        
        const haloColor = score >= 75 ? '#22C55E' : score >= 40 ? '#EAB308' : '#EF4444';
        const healthStatus = score >= 75 
          ? {label: 'İyi durumda', bg: 'var(--color-success-soft)', color: 'var(--color-success)'} 
          : score >= 40 
          ? {label: 'Takip gerekli', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)'} 
          : {label: 'Acil durum', bg: 'var(--color-danger-soft)', color: 'var(--color-danger)'};

        // Kilo
        const primaryWeight = growthRecords?.[0]?.weight_kg ? `${growthRecords[0].weight_kg}` : '-';

        // Son Aşı (kanonik vaccine_records_v2 verisi)
        let lastVaccineStr = '-';
        let lastVaccineSub = 'Kayıt yok';
        const EXCLUDED_VACCINE_STATUSES = new Set(['cancelled', 'migrated_to_plan', 'overdue', 'pending', 'upcoming', 'scheduled', 'planned']);
        const ALLOWED_VACCINE_STATUSES = new Set(['completed', 'done']);

        if (lastVaccineRecord?.administered_at) {
          const vStatus = lastVaccineRecord.status;
          const isAllowed = !vStatus || ALLOWED_VACCINE_STATUSES.has(vStatus);
          const isExcluded = vStatus ? EXCLUDED_VACCINE_STATUSES.has(vStatus) : false;

          if (isAllowed && !isExcluded) {
            try {
              const d = new Date(lastVaccineRecord.administered_at);
              if (!isNaN(d.getTime())) {
                const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
                lastVaccineStr = `${d.getDate()} ${months[d.getMonth()]}`;
                lastVaccineSub = lastVaccineRecord.vaccine_name || 'Tamamlandı';
              }
            } catch {}
          }
        }

        // Sıradaki
        const now = new Date();
        const upcomingSchedules = localSchedules.filter((s: any) => s.status !== 'done').sort((a: any, b: any) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime());
        const nextSchedule = upcomingSchedules[0]; // Geçmiş veya gelecek, ilk yapılmamış görev
        const nextDateObj = nextSchedule ? getTaskDateTime(nextSchedule) : null;
        const nextDateStr = nextDateObj ? `${nextDateObj.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][nextDateObj.getMonth()]}` : '-';
        
        const overdueCount = upcomingSchedules.filter((s: any) => getTaskDateTime(s) < now).length;

        // Bugün
        const todaySchedules = upcomingSchedules; // Tüm yaklaşan/geciken görevleri ekliyoruz, içeride "Bugün" olanları render edeceğiz.
        
        return (
          <div className="flex flex-col">
            {/* 1. Pet Hero — KİLİTLİ BÖLGE: PetHeroCard.tsx dosyasını düzenle */}
            <PetHeroCard
              pet={pet}
              score={score}
              age={age}
              coverInputRef={coverInputRef}
              avatarInputRef={avatarInputRef}
              activeLostReport={activeLostReport}
              onLostReport={() => setLostWizardOpen(true)}
              onMarkFound={handleMarkFound}
              latestWeight={primaryWeight !== '-' ? primaryWeight : null}
              onMenuOpen={() => setShowPetMenuSheet(true)}
              onChangeCoverClick={() => setShowCoverSourceSheet(true)}
              onChangeAvatarClick={() => avatarInputRef.current?.click()}
            />

            <div className="sticky top-16 z-20 bg-surface border-b border-border">
              <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden min-h-[44px] items-center" role="tablist">
                {([
                  {id:'ozet', label:'Özet'},
                  {id:'takvim', label:'Takvim'},
                  {id:'saglik', label:'Sağlık'},
                  {id:'bakim', label:'Bakım'},
                  {id:'beslenme', label:'Beslenme'},
                  {id:'ekstra', label:'Ekstra'},
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-4 min-h-[44px] inline-flex items-center text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'ozet' && (
              <div className="p-4 flex flex-col gap-6">
                <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start flex flex-col gap-4">
                  
                  {/* SOL SÜTUN (Masaüstü: lg:col-span-7) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* Paylaş + Acil Durum */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsShareModalOpen(true)}
                        className="relative w-full h-11 rounded-btn bg-white border border-border-main flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 focus:outline-none cursor-pointer shadow-xs"
                      >
                        <Share2 size={18} className="text-primary" />
                        <span className="text-sm font-bold text-text-primary">Paylaş & Ekip</span>
                      </button>
                      <FloatingSOS
                        fullWidth={true}
                        petId={pet.id}
                        petName={pet.name}
                        vetPhone={(pet as any).vet_phone ?? undefined}
                        vetName={pet.vet_name ?? undefined}
                        sosContacts={pet.sos_contacts}
                        onLostReport={() => setLostWizardOpen(true)}
                        onMarkFound={handleMarkFound}
                      />
                    </div>

                    {/* 3. Bugün */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-1">Bugün</p>
                      <div className="bg-[var(--color-surface)] rounded-card overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-sm)] divide-y divide-[var(--color-border)]">
                        {(() => {
                          const filteredToday = todaySchedules.filter((plan: any) => {
                            const taskDT = getTaskDateTime(plan);
                            const isOverdue = taskDT < now;
                            const today = new Date(now); today.setHours(0,0,0,0);
                            const target = new Date(taskDT); target.setHours(0,0,0,0);
                            const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
                            return diffDays <= 1 || isOverdue;
                          });

                          if (filteredToday.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2">
                                <p className="text-[13px] font-600 text-[var(--color-text-secondary)]">Bugün planlı bakım yok</p>
                                <p className="text-[11px] text-[var(--color-text-muted)]">{pet.name} ile güzel bir gün geçirin!</p>
                              </div>
                            );
                          }

                          return filteredToday.map((plan: any) => {
                            const taskDT = getTaskDateTime(plan);
                            const isOverdue = taskDT < now;
                            const timeStr = plan.due_time ? plan.due_time.slice(0, 5) : '';
                            
                            let badge = ''; let dotColor = ''; let badgeBg = ''; let badgeColor = '';
                            const today = new Date(now); today.setHours(0,0,0,0);
                            const target = new Date(taskDT); target.setHours(0,0,0,0);
                            const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
                            if (isOverdue) {
                              const dm = Math.floor((now.getTime() - taskDT.getTime()) / 60000)
                              const hours = Math.floor(dm / 60)
                              if (dm < 60) {
                                badge = `${Math.max(1, dm)} dk gecikti`
                              } else if (hours < 24) {
                                badge = `${hours} sa gecikti`
                              } else {
                                badge = `${Math.floor(hours / 24)} gün gecikti`
                              }
                              dotColor = 'var(--color-danger)'; badgeBg = 'var(--color-danger-soft)'; badgeColor = 'var(--color-danger)'
                            } else if (diffDays === 0) {
                              badge = `Bugün${timeStr ? ' '+timeStr : ''}`
                              dotColor = 'var(--color-warning)'; badgeBg = 'var(--color-warning-soft)'; badgeColor = 'var(--color-warning)'
                            } else if (diffDays === 1) {
                              badge = 'Yarın'
                              dotColor = 'var(--color-primary)'; badgeBg = 'var(--color-primary-soft)'; badgeColor = 'var(--color-primary)'
                            }

                            const isActionsOpen = activeMenuId === plan.id;
                            return (
                              <div key={plan.id}>
                                <button type="button"
                                  onClick={() => setActiveMenuId(prev => prev === plan.id ? null : plan.id)}
                                  className="w-full text-left flex items-center gap-3 px-[var(--space-4)] py-3 hover:bg-[var(--color-surface-secondary)] transition-colors group">
                                  <span className="text-[11px] font-700 text-[var(--color-text-muted)] w-10 shrink-0 tabular-nums">{timeStr || '-'}</span>
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-600 text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                      {plan.title || (plan as any).vaccines?.name || 'Sağlık İşlemi'}
                                    </p>
                                    <p className="text-2xs text-[var(--color-text-muted)] mt-0.5">{getPlanDisplayCategory(plan.category, plan.sub_category)}</p>
                                  </div>
                                  <span className="text-2xs font-700 px-2 py-1 rounded-xs shrink-0 whitespace-nowrap"
                                    style={{ background: badgeBg, color: badgeColor }}>
                                    {badge}
                                  </span>
                                </button>
                                {isActionsOpen && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pb-3 pt-1 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => handleMarkCompleted(plan.id)}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-success bg-success/10 hover:bg-success/20 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                                      ✓ Tamamlandı
                                    </button>
                                    <button onClick={() => handlePostpone(plan.id)}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-text-secondary bg-text-secondary/10 hover:bg-text-secondary/20 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                                      📅 +1 Gün
                                    </button>
                                    <button onClick={() => { setActiveMenuId(null); handleEditTask(plan); }}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                                      ✏️ Düzenle
                                    </button>
                                    <button onClick={() => handleDeleteTask(plan.id)}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-error bg-error/10 hover:bg-error/20 rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                                      ❌ Sil
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* MicroTasks */}
                    {microTasks.length > 0 && (
                      <div className="mt-2 space-y-3">
                        <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide px-1">
                          Profilini güçlendir
                        </p>
                        {microTasks.slice(0, 3).map(task => (
                          <PetMicroTaskCard
                            key={task.id}
                            task={task}
                            petId={pet.id}
                            onDismiss={(id) => dismissTask(pet.id, id)}
                            onDirectAction={(action) => setActiveTaskModal(action as TaskModalType)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Modal, microTasks listesinden bağımsız render edilir:
                        aksi halde modal açıkken liste boşalırsa modal da kaybolur. */}
                    <PetTaskModals
                      petId={pet.id}
                      petName={pet.name}
                      activeModal={activeTaskModal}
                      onClose={() => setActiveTaskModal(null)}
                      onSuccess={() => router.refresh()}
                    />
                  </div>

                  {/* SAĞ SÜTUN (Masaüstü: lg:col-span-5) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* 2. 3 Metrik */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: primaryWeight,
                          unit: primaryWeight !== '-' ? 'kg' : '',
                          label: 'Kilo',
                          sub: primaryWeight !== '-' ? 'Son ölçüm' : 'Kayıt yok',
                          subType: 'neutral' as const,
                        },
                        {
                          value: lastVaccineStr,
                          unit: '',
                          label: 'Son aşı',
                          sub: lastVaccineSub,
                          subType: lastVaccineStr !== '-' ? 'success' as const : 'neutral' as const,
                        },
                        {
                          value: nextDateStr,
                          unit: '',
                          label: 'Sıradaki',
                          sub: nextSchedule ? (nextSchedule as any).title?.slice(0,10) || 'Bakım' : 'Yok',
                          subType: overdueCount > 0 ? 'warning' as const : 'neutral' as const,
                        },
                      ].map((m) => (
                        <div key={m.label} className="bg-surface rounded-card p-3 flex flex-col items-center text-center border border-border-main/60 shadow-soft min-w-0">
                          <div className="flex items-baseline gap-0.5 max-w-full truncate">
                            <span className="text-base xs:text-lg font-extrabold text-text-primary leading-none tabular-nums truncate">{m.value}</span>
                            {m.unit && <span className="text-[11px] font-bold text-text-secondary ml-0.5">{m.unit}</span>}
                          </div>
                          <span className="text-[11px] font-semibold text-text-secondary mt-1 truncate max-w-full">{m.label}</span>
                          <span className={`text-[11px] font-bold mt-0.5 truncate max-w-full ${
                            m.subType === 'success' ? 'text-success' :
                            m.subType === 'warning' ? 'text-warning' :
                            'text-text-secondary'
                          }`}>{m.sub}</span>
                        </div>
                      ))}
                    </div>

                    {/* Temel Bilgiler Kartı */}
                    <div className="bg-surface rounded-card p-4 border border-border-main/60 shadow-soft flex flex-col gap-3">
                      <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary" />
                        Temel Bilgiler
                      </h3>
                      <div className="flex flex-col gap-2.5 divide-y divide-border-main/40">
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-semibold text-text-secondary">Mikroçip No</span>
                          <span className="text-xs font-bold text-text-primary font-mono">{pet.microchip_no || 'Henüz girilmedi'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2.5">
                          <span className="text-xs font-semibold text-text-secondary">Veteriner</span>
                          <span className="text-xs font-bold text-text-primary truncate max-w-[180px]">{pet.vet_company || pet.vet_name || 'Kayıtlı veteriner yok'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2.5">
                          <span className="text-xs font-semibold text-text-secondary">Beslenme</span>
                          <span className="text-xs font-bold text-text-primary truncate max-w-[180px]">{nutritionLogs?.[0]?.food_brand || assignments?.[0]?.food_product_family?.official_name || 'Mama tanımlanmadı'}</span>
                        </div>
                      </div>
                    </div>

                    {pet.birth_date && (
                      <HumanAgeCalculator 
                        species={pet.species} 
                        birthDate={pet.birth_date} 
                        weightKg={growthRecords && growthRecords.length > 0 ? growthRecords[0].weight_kg : undefined} 
                        petName={pet.name} 
                      />
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )
      })()}
      {/* SmartTaskWizard Modal */}
      {taskWizardOpen && (
        <SmartTaskWizard
          petId={pet.id}
          petSpecies={pet.species}
          taskToEdit={taskToEdit}
          onClose={() => { setTaskWizardOpen(false); setTaskToEdit(null) }}
          onDone={(newTask?: any) => {
            if (newTask) {
              const newTasksArray = Array.isArray(newTask) ? newTask : [newTask];
              const normalizedNewTasks = newTasksArray.map(migrateScheduleCategory);
              setLocalSchedules(prev => {
                const updated = [...prev];
                normalizedNewTasks.forEach(task => {
                  const idx = updated.findIndex(s => s.id === task.id);
                  if (idx >= 0) {
                    updated[idx] = task;
                  } else {
                    updated.push(task);
                  }
                });
                return updated.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
              });
            }
            setTrackerRefreshKey(prev => prev + 1);
            router.refresh();
            setTaskWizardOpen(false);
            setTaskToEdit(null);
          }}
        />
      )}

      {/* Quick Update Modal */}
      {quickUpdateConfig && (
        <QuickUpdateModal 
          petId={pet.id} 
          config={quickUpdateConfig} 
          onClose={() => setQuickUpdateConfig(null)} 
          onDone={() => {
            if (quickUpdateConfig.onSuccess) {
              quickUpdateConfig.onSuccess()
            }
            setQuickUpdateConfig(null)
          }} 
        />
      )}

      {/* Parasite Plan Completion Modal */}
      {parasiteCompletionTask && (
        <ParasitePlanCompletionModal
          planId={parasiteCompletionTask._plan_id}
          petId={pet.id}
          onClose={() => setParasiteCompletionTask(null)}
          onSuccess={(brandOrNotes) => {
            setLocalSchedules(prev => prev.map(s => s.id === parasiteCompletionTask.id ? { ...s, status: 'done', notes: brandOrNotes || s.notes } : s));
            setTrackerRefreshKey(prev => prev + 1);
            router.refresh();
            setParasiteCompletionTask(null);
          }}
        />
      )}

      {/* Smart Scanner Modal */}
      {isSmartScannerOpen && (
        <SmartScanner
          petId={pet.id}
          onClose={() => setIsSmartScannerOpen(false)}
          onSave={async (data: any) => {
            // SmartScanner onSave'e doğrudan parsedData geçiyor,
            // { record_type, parsed } yapısı yok.
            // Alan varlığına göre tipi çıkar:
            const inferredType: string =
              data.food_brand || data.food_product
                ? 'food_packaging'
                : data.active_ingredient || data.product_name
                ? 'medicine_packaging'
                : 'vaccine_card'; // varsayılan: aşı karnesi

            try {
              if (inferredType === 'vaccine_card') {
                await fetch(`/api/pets/${pet.id}/treatments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    disease_name: data.title || data.vaccine_name || 'Aşı Kaydı',
                    category:     'Aşı Uygulaması',
                    status:       'Tamamlandı',
                    start_date:   data.date || new Date().toISOString().split('T')[0],
                    clinic_name:  data.vet_name   || '',
                    notes:        data.lot_number ? 'Lot: ' + data.lot_number : '',
                  }),
                });
              } else if (inferredType === 'food_packaging') {
                await fetch(`/api/pets/${pet.id}/nutrition/profile`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    food_brand:   data.food_brand,
                    food_product: data.food_product,
                    food_type:    data.food_type,
                  }),
                });
              } else if (inferredType === 'medicine_packaging') {
                await fetch(`/api/pets/${pet.id}/treatments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    disease_name: data.title || data.product_name || 'Tedavi Kaydı',
                    category:     data.active_ingredient
                                    ? 'İlaç Tedavisi'
                                    : 'İç/Dış Parazit Uygulaması',
                    status:       'Tamamlandı',
                    start_date:   new Date().toISOString().split('T')[0],
                    notes:        data.active_ingredient || '',
                  }),
                });
              }
            } catch (err) {
              console.error('[PetDetailClient] SmartScanner onSave error:', err);
            } finally {
              setIsSmartScannerOpen(false);
              router.refresh();
            }
          }}
        />
      )}

      {activeTab === 'takvim' && (
      <div className="p-4 flex flex-col gap-3">
      {/* Timeline - Görev Takibi */}
      <div className="mt-4">
        <h3 className="text-base font-bold text-text-primary mb-3">
          Görev Takibi
        </h3>
        <HealthTracker refreshTrigger={trackerRefreshKey} petId={pet.id} onEditTask={(t) => handleEditTask(t)} />
      </div>

      {pet.gender === 'female' && !pet.is_neutered && (
        <EstrusTracker petId={pet.id} petSpecies={pet.species} />
      )}

      </div>
      )}

      {activeTab === 'beslenme' && (
        <div className="flex flex-col gap-3 p-4">
          <NutritionClient
            pet={pet}
            profile={nutritionLogs?.[0] ?? null}
            inventory={inventory ?? null}
            feedingLogs={feedingLogs ?? []}
            weightLogs={weightLogs ?? []}
            assignments={assignments ?? []}
            nutritionPlans={(localSchedules || []).filter((s: any) => s._source === 'plans' && (s._plan_category === 'beslenme' || s.category === 'Beslenme' || s.category === 'beslenme'))}
            embedded={true}
          />
        </div>
      )}

      {/* ── Sağlık & Bakım Accordion (Tab Filtrelemeli) ── */}
      {(activeTab === 'saglik' || activeTab === 'bakim') && (
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-text-primary px-1">
            {activeTab === 'saglik' ? 'Sağlık ve Bakım' : 'Bakım'}
          </h2>
          {activeTab === 'saglik' && (
            <Link
              href={`/owner/pets/${pet.id}/nutrition?tab=kilo`}
              className="card-base p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 group hover:border-amber-400/80 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
                  ⚖️
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                    Kilo & Gelişim Takibi
                    <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Beslenme Modülünde</span>
                  </h4>
                  <p className="text-xs text-text-secondary font-medium mt-0.5">
                    Kilo değişimi (gr), gram farkları, ideal kilo hedefi ve geçmiş ölçümler Beslenme modülünde takip edilmektedir.
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm group-hover:translate-x-1 transition-transform shrink-0">
                →
              </div>
            </Link>
          )}

          {activeTab === 'bakim' && (
            <div className="flex flex-col gap-6 py-2">
              {[
                {
                  name: 'Bakım',
                  title: 'Bakım Rutinleri',
                  desc: `${pet.name} için banyo, tırnak kesimi ve tüy bakımı kayıtları`,
                  icon: <ShampooIcon width={24} height={24} />,
                  headerIcon: <ShampooIcon width={22} height={22} />,
                  color: 'text-pink-600',
                  bg: 'bg-pink-50',
                  planBtnLabel: 'Bakım Planla',
                  planBtnBg: 'bg-primary hover:bg-primary-hover',
                  logBtnLabel: 'Bakım Kaydı Ekle',
                  planUrl: `/owner/plan-yap/bakim?pet_id=${pet.id}`,
                  logUrl: `/owner/plan-yap/bakim?pet_id=${pet.id}&mode=log`,
                  emptyDesc: 'Bakım takvimi veya hatırlatıcı oluşturmak için "Bakım Planla" veya yapılan bakımı kaydetmek için "Bakım Kaydı Ekle" butonunu kullanabilirsiniz.'
                },
                {
                  name: 'Hijyen',
                  title: 'Hijyen Takibi',
                  desc: `${pet.name} için kum kabı, çiş pedi ve ortam hijyeni kayıtları`,
                  icon: <ScoopIcon width={24} height={24} />,
                  headerIcon: <ScoopIcon width={22} height={22} />,
                  color: 'text-teal-600',
                  bg: 'bg-teal-50',
                  planBtnLabel: 'Hijyen Planla',
                  planBtnBg: 'bg-teal-600 hover:bg-teal-700',
                  logBtnLabel: 'Hijyen Kaydı Ekle',
                  planUrl: `/owner/plan-yap/hijyen?pet_id=${pet.id}`,
                  logUrl: `/owner/plan-yap/hijyen?pet_id=${pet.id}&mode=log`,
                  emptyDesc: 'Hijyen takvimi oluşturmak için "Hijyen Planla" veya hijyen işlemini kaydetmek için "Hijyen Kaydı Ekle" butonunu kullanabilirsiniz.'
                },
                {
                  name: 'Aktivite',
                  title: 'Egzersiz & Aktivite',
                  desc: `${pet.name} için yürüyüş, oyun seansı ve tuvalet/eğitim rutinleri`,
                  icon: <BoneIcon width={24} height={24} />,
                  headerIcon: <BoneIcon width={22} height={22} />,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  planBtnLabel: 'Aktivite Planla',
                  planBtnBg: 'bg-emerald-600 hover:bg-emerald-700',
                  logBtnLabel: 'Aktivite Kaydı Ekle',
                  planUrl: `/owner/plan-yap/aktivite?pet_id=${pet.id}`,
                  logUrl: `/owner/plan-yap/aktivite?pet_id=${pet.id}&mode=log`,
                  emptyDesc: 'Aktivite ve egzersiz takvimi oluşturmak için "Aktivite Planla" veya tamamlanan aktiviteyi kaydetmek için "Aktivite Kaydı Ekle" butonunu kullanabilirsiniz.'
                }
              ].map((module) => {
                const pending = getSchedulesForTab(module.name);
                const completed = getCompletedSchedulesForTab(module.name);
                const hasAnyTasks = pending.length > 0 || completed.length > 0;

                return (
                  <div key={module.name} id={`section-${MODULE_ID_MAP[module.name] ?? module.name}`} className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
                      <div className="flex items-center gap-3">
                        {module.headerIcon}
                        <div>
                          <h3 className="font-extrabold text-text-primary text-base">{module.title}</h3>
                          <p className="text-xs text-text-secondary">{module.desc}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={module.planUrl}
                          className={`min-h-[44px] px-4 py-2.5 rounded-xl ${module.planBtnBg} text-white font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5`}
                        >
                          {module.planBtnLabel}
                        </Link>
                        <Link
                          href={module.logUrl}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          📋 {module.logBtnLabel}
                        </Link>
                      </div>
                    </div>

                    {/* Family/Ownership management has been moved to the Paylaş & Ekip modal on Özet tab */}

                    {hasAnyTasks ? (
                      renderTabFiltersAndTasks(module.name)
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-border-main text-center bg-bg-main/50 flex flex-col items-center justify-center gap-2">
                        <div className={`w-12 h-12 rounded-2xl ${module.bg} ${module.color} flex items-center justify-center font-bold text-xl shadow-xs`}>
                          {module.icon}
                        </div>
                        <p className="text-sm text-text-primary font-bold">Henüz {module.name} Kaydı Yok</p>
                        <p className="text-xs text-text-secondary/80 max-w-sm leading-relaxed mb-1">
                          {module.emptyDesc}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {activeTab === 'saglik' && (
          <>
            <HealthTab petId={pet.id} petName={pet.name} />
            <BreedHealthCard breed={pet.breed} />
          </>
        )}
      </div>
      )}

      {/* ── Ekstra Sekmesi ── */}
      {activeTab === 'ekstra' && (
      <div className="p-4 flex flex-col gap-3">
      {/* ── Ek Bilgiler ve Araçlar ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text-primary px-1">Ek Bilgiler ve Araçlar</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'Galeri', label: 'Galeri', icon: <Camera size={22} className="text-white" />, gradient: 'from-blue-500 to-indigo-500' },
            { id: 'Eşleştirme', label: 'Eşleştirme', icon: <Heart size={22} className="text-white" />, gradient: 'from-rose-400 to-pink-500' },
            { id: 'Bütçe', label: 'Bütçe', icon: <Wallet size={22} className="text-white" />, gradient: 'from-emerald-400 to-teal-500' },
            { id: 'Sahiplendir', label: 'Sahiplendir', icon: <Home size={22} className="text-white" />, gradient: 'from-amber-400 to-orange-500' },
            { id: 'Raporlar', label: 'Raporlar', icon: <FileText size={22} className="text-white" />, gradient: 'from-violet-500 to-purple-600' },
            { 
              id: 'Kayip', 
              label: activeLostReport ? 'İlan Aktif' : 'Kayıp İlanı', 
              icon: <AlertTriangle size={22} className="text-white" />, 
              gradient: activeLostReport ? 'from-red-600 to-red-700 animate-pulse' : 'from-red-500 to-rose-600' 
            },
          ]).map((item) => {
            const isActive = openSections.has(item.id === 'Raporlar' ? 'Raporlar & Belgeler' : item.id) || (item.id === 'Kayip' && activeLostReport)
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Kayip') {
                    setLostWizardOpen(true)
                  } else if (item.id === 'Galeri') {
                    router.push(`/owner/pets/${pet.id}/gallery`)
                  } else if (item.id === 'Eşleştirme') {
                    router.push(`/owner/pets/${pet.id}/match`)
                  } else if (item.id === 'Bütçe') {
                    router.push(`/owner/pets/${pet.id}/budget`)
                  } else if (item.id === 'Sahiplendir') {
                    router.push(`/owner/pets/${pet.id}/adoption`)
                  } else if (item.id === 'Raporlar') {
                    router.push(`/owner/pets/${pet.id}/reports`)
                  }
                }}
                data-testid={item.id === 'Bütçe' ? 'budget-module-button' : item.id === 'Raporlar' ? 'health-card-button' : undefined}
                className={`relative overflow-hidden rounded-[20px] p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm border ${isActive ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'border-border-main/50 bg-white hover:bg-slate-50'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br ${item.gradient} text-white shadow-inner`}>
                  {item.icon}
                </div>
                <span className={`text-xs font-semibold tracking-tight ${isActive ? 'text-primary' : 'text-text-secondary'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Veteriner Bilgileri */}
        {(pet.vet_company || pet.vet_name || pet.vet_phone || pet.vet_email) ? (
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest">Veteriner Bilgileri</h3>
              <button onClick={handleEditVetInfo} className="text-xs font-bold text-primary hover:underline">Düzenle</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-xl shrink-0">🩺</div>
              <div>
                {pet.vet_company && <p className="font-bold text-text-primary">{pet.vet_company}</p>}
                {pet.vet_name && <p className="font-semibold text-text-secondary text-sm">{pet.vet_name}</p>}
                {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-sm text-primary font-semibold hover:underline block mt-0.5">{pet.vet_phone}</a>}
                {pet.vet_email && <a href={`mailto:${pet.vet_email}`} className="text-sm text-primary font-semibold hover:underline block">{pet.vet_email}</a>}
              </div>
            </div>
          </div>
        ) : (
          <div className="card-base p-5 border border-dashed border-border-main hover:border-primary/50 transition-colors cursor-pointer group" onClick={handleEditVetInfo}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-primary-soft flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors text-xl shrink-0">🩺</div>
              <div>
                <h3 className="text-[13px] font-semibold text-text-primary mb-0.5">Veteriner Ekle</h3>
                <p className="text-xs text-text-secondary">Aşı, muayene ve acil durumlar için hekiminizi kaydedin.</p>
              </div>
            </div>
          </div>
        )}

        {/* İlaçlar */}
        <MedicationManager petId={pet.id} initialMedications={medications || []} />

        {/* Alerjiler */}
        <AllergyManager petId={pet.id} initialAllergies={allergies || []} />
      </div>
      </div>
      )}


      {/* ── Time Filter Bottom Sheet ── */}
      {filterSheetType && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end" onClick={() => setFilterSheetType(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-fade-in relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-border-main rounded-full mx-auto mb-6 opacity-50"></div>
            <h3 className="text-lg font-semibold text-center text-text-primary mb-6 flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {filterSheetType === 'planned' ? 'Zaman Filtresi' : 'Tamamlanmış Zaman Filtresi'}
            </h3>
            <div className="flex flex-col">
              {TIME_FILTER_OPTIONS.map((opt) => {
                const isActive = filterSheetType === 'planned' ? plannedTimeFilter === opt : completedTimeFilter === opt;
                return (
                <button
                  key={opt}
                  onClick={() => { 
                    if (filterSheetType === 'planned') setPlannedTimeFilter(opt);
                    else setCompletedTimeFilter(opt);
                    setFilterSheetType(null); 
                  }}
                  className={`flex items-center justify-between py-4 border-b border-border-main/40 last:border-0 ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <span className={`text-base ${isActive ? 'font-bold' : 'font-semibold'}`}>{opt}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary bg-primary-soft' : 'border-border-main'}`}>
                    {isActive && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                  </div>
                </button>
                )
              })}
            </div>
          </div>
        </div>
      )}




      {/* Hidden cover & avatar inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* TEK ÜÇ NOKTA (...) MENÜ MODALI */}
      {showPetMenuSheet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-end animate-fade-in"
          onClick={() => setShowPetMenuSheet(false)}>
          <div className="bg-surface w-full rounded-t-[28px] p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] shadow-2xl border-t border-border"
            onClick={e => e.stopPropagation()}>
            
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            <p className="text-base font-semibold text-text-primary mb-5 text-center flex items-center justify-center gap-2">
              <span>🐾</span> {pet.name} Profil Yönetimi
            </p>

            <div className="flex flex-col gap-2.5">
              {/* Kapak Fotoğrafı Değiştir */}
              <button
                onClick={() => {
                  setShowPetMenuSheet(false)
                  setShowCoverSourceSheet(true)
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Camera size={18} />
                  </div>
                  <span>Kapak Fotoğrafını Değiştir</span>
                </div>
                <ChevronRightIcon size={16} className="text-text-muted" />
              </button>

              {/* Kapak Konumu Ayarla */}
              {pet.cover_url && (
                <button
                  onClick={() => {
                    setShowPetMenuSheet(false)
                    setCoverAdjustingUrl(pet.cover_url)
                    setZoom(1.0)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <TargetIcon size={18} />
                    </div>
                    <span>Kapak Konumunu Ayarla (Sürükle)</span>
                  </div>
                  <ChevronRightIcon size={16} className="text-text-muted" />
                </button>
              )}

              {/* Profil Fotoğrafını Değiştir */}
              <button
                onClick={() => {
                  setShowPetMenuSheet(false)
                  avatarInputRef.current?.click()
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <ImageIcon size={18} />
                  </div>
                  <span>Profil Fotoğrafını Değiştir (Avatar)</span>
                </div>
                <ChevronRightIcon size={16} className="text-text-muted" />
              </button>

              {/* Profili Düzenle */}
              <Link
                href={`/owner/pets/${pet.id}/edit`}
                onClick={() => setShowPetMenuSheet(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Pencil size={18} />
                  </div>
                  <span>Evcil Hayvan Bilgilerini Düzenle</span>
                </div>
                <ChevronRightIcon size={16} className="text-text-muted" />
              </Link>

              {/* İptal */}
              <button
                onClick={() => setShowPetMenuSheet(false)}
                className="w-full py-3.5 rounded-xl border border-border text-sm font-bold text-text-secondary mt-2 hover:bg-surface-1 transition-colors">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverSourceSheet && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-end"
          onClick={() => setShowCoverSourceSheet(false)}>
          <div className="bg-surface w-full rounded-t-[24px] p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
            onClick={e => e.stopPropagation()}>
            
            <p className="text-base font-bold text-text-primary mb-4 text-center">
              Kapak Fotoğrafı
            </p>

            <div className="flex flex-col gap-2">
              
              {/* Kamera */}
              <button
                onClick={() => {
                  setShowCoverSourceSheet(false)
                  if (coverInputRef.current) {
                    coverInputRef.current.capture = 'environment'
                    coverInputRef.current.click()
                  }
                }}
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-[13px] font-medium text-text-primary flex items-center justify-center gap-2">
                <Camera size={18} />
                Fotoğraf Çek
              </button>

              {/* Galeri */}
              <button
                onClick={() => {
                  setShowCoverSourceSheet(false)
                  if (coverInputRef.current) {
                    coverInputRef.current.removeAttribute('capture')
                    coverInputRef.current.click()
                  }
                }}
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-[13px] font-medium text-text-primary flex items-center justify-center gap-2">
                <ImageIcon size={18} />
                Galeriden Seç
              </button>

              {/* Dosya */}
              <button
                onClick={() => {
                  setShowCoverSourceSheet(false)
                  if (coverInputRef.current) {
                    coverInputRef.current.removeAttribute('capture')
                    coverInputRef.current.accept = 'image/*'
                    coverInputRef.current.click()
                  }
                }}
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-[13px] font-medium text-text-primary flex items-center justify-center gap-2">
                <FileImage size={18} />
                Dosyadan Seç
              </button>

              {/* İptal */}
              <button
                onClick={() => setShowCoverSourceSheet(false)}
                className="w-full py-3 rounded-xl text-[13px] text-text-secondary mt-1">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kapak Fotoğrafı Sürükle & Zoom Konumlandırma Modalı */}
      {coverAdjustingUrl && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-modal overflow-hidden shadow-2xl animate-fade-in border border-white/10">
            <div className="p-4 border-b border-border text-center">
              <h3 className="text-base font-semibold text-text-primary">Kapak Fotoğrafı Konumlandır</h3>
              <p className="text-xs text-text-secondary mt-0.5">Fotoğrafı sürükleyerek görünmesini istediğiniz merkezi belirleyin</p>
            </div>

            {/* Sürükleme Çerçevesi */}
            <div className="relative w-full h-[220px] overflow-hidden bg-black cursor-grab active:cursor-grabbing select-none border-y border-border"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={coverAdjustingUrl}
                alt="Kapak Önizleme"
                className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                style={{
                  transformOrigin: 'center center',
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
                }}
              />
              
              {/* İpucu Katmanı */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/65 text-white text-2xs font-semibold backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow-md">
                <span>✋</span> Parmağınızla veya fareyle kaydırın
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Hizalama Hızlı Butonları */}
              <div>
                <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block mb-2">Hızlı Hizalama</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPan({ x: 0, y: 35 })}
                    className="py-2 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-xs font-bold text-text-primary transition-colors">
                    Üst Odağı
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1.0); }}
                    className="py-2 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-xs font-bold text-text-primary transition-colors">
                    Tam Orta (Sıfırla)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPan({ x: 0, y: -35 })}
                    className="py-2 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-xs font-bold text-text-primary transition-colors">
                    Alt Odağı
                  </button>
                </div>
              </div>

              {/* Zoom Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Yakınlaştır / Uzaklaştır</label>
                  <span className="text-[11px] font-bold text-primary">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range" min={1.0} max={2.5} step={0.05}
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-text-muted mt-1 font-medium">
                  <span>%100 (Varsayılan Tam Sığdır)</span>
                  <span>%250 (Yakınlaştır)</span>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCoverAdjustingUrl(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-bold text-sm hover:bg-surface-1 transition-colors"
                >İptal</button>
                <button
                  type="button"
                  onClick={saveCoverAdjustment}
                  disabled={savingAdjust}
                  className="flex-[2] btn-primary py-3 disabled:opacity-50 text-sm shadow-md"
                >{savingAdjust ? 'Kaydediliyor...' : 'Konumu Kaydet ✓'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {medicationActionTask && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex justify-center items-end" onClick={() => setMedicationActionTask(null)}>
          <div className="bg-[#FAF6F2] w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-fade-in relative flex flex-col gap-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <button onClick={() => setMedicationActionTask(null)} className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h3 className="text-lg font-semibold text-slate-800">İlaç</h3>
              <div className="w-8" />
            </div>

            <div className="flex flex-col items-center gap-4 text-center mt-2">
              {medicationActionTask.extra_data?.medication?.stock_enabled && (
                <div className="text-xs font-bold text-slate-500 bg-slate-200/40 px-3 py-1 rounded-full">
                  {medicationActionTask.extra_data.medication.stock} {medicationActionTask.extra_data.medication.unit} kaldı
                </div>
              )}
              
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-inner animate-pulse">
                💊
              </div>

              <div>
                <h4 className="text-xl font-semibold text-slate-800">{medicationActionTask.title}</h4>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[13px] font-extrabold px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full shadow-sm">
                     {medicationActionTask.extra_data?.medication?.dosage_string || medicationActionTask.extra_data?.medication?.dose || '1 Doz'}
                  </span>
                  <button 
                    onClick={() => setShowNoteInput(prev => !prev)}
                    className="text-[13px] font-extrabold px-3 py-1 bg-white border border-slate-200 border-dashed text-slate-600 rounded-full hover:bg-slate-50 transition-all flex items-center gap-1"
                  >
                    <span>+ Not</span>
                  </button>
                </div>
              </div>

              {showNoteInput && (
                <input
                  type="text"
                  placeholder="Görevin notu..."
                  value={medicationNote}
                  onChange={e => setMedicationNote(e.target.value)}
                  className="w-full mt-2 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              )}

              <div className="w-full flex justify-between items-center bg-[#FAF6F2] border border-slate-200/50 rounded-2xl p-4 mt-2">
                <span className="text-sm font-bold text-slate-600">Saat</span>
                <span className="text-base font-bold text-slate-800">{medicationActionTask.due_time?.slice(0, 5) || '12:00'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => handleMedicationSkip(medicationActionTask)}
                className="py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>❌ Atla</span>
              </button>
              <button
                onClick={() => handleMedicationSnooze(medicationActionTask)}
                className="py-3.5 bg-[#FAF1E6] hover:bg-[#F3E5D4] text-[#8C6239] font-extrabold text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>🔔 Ertele</span>
              </button>
              <button
                onClick={() => handleMedicationConfirm(medicationActionTask, medicationNote)}
                className="py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>✓ Onayla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {lostWizardOpen && (
        <LostPetWizard
          pet={pet}
          onComplete={() => { setLostWizardOpen(false); router.refresh(); }}
          onCancel={() => setLostWizardOpen(false)}
        />
      )}

      {/* Kayıp ilanını kapatma onayı — OPOS Cilt 3 (native confirm yerine) */}
      <ConfirmModal
        open={markFoundConfirmOpen}
        title="Dostunuz Bulundu mu?"
        message={`${pet.name} bulundu olarak işaretlenecek ve kayıp ilanı kapatılacaktır.`}
        confirmLabel="Evet, Bulundu"
        cancelLabel="İptal"
        variant="default"
        onConfirm={confirmMarkFound}
        onCancel={() => setMarkFoundConfirmOpen(false)}
      />
      {/* Bakım Ekibi & Sahiplik Paylaşımı Modal */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-2xl max-h-[90vh] rounded-modal shadow-2xl border border-border-main flex flex-col overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border-main flex items-center justify-between bg-bg-main/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl shadow-xs">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-text-primary leading-tight">
                    {pet.name}'{getTurkishGenitiveSuffix(pet.name)} Bakım Ekibi & Sahiplik
                  </h3>
                  <p className="text-xs text-text-secondary">Yetkili aile üyeleri, ortak sahiplik ve bekleyen davetler</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-9 h-9 rounded-full bg-bg-main hover:bg-border-main flex items-center justify-center text-text-secondary transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-5 overflow-y-auto flex-1">
              <FamilyTab
                petId={pet.id}
                petName={pet.name}
                plan={subscription?.plan ?? 'free'}
                initialSos={pet.sos_contacts}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
