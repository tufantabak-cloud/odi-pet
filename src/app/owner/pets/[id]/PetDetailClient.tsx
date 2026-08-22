'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Share2, Phone, Camera, ImageIcon, FileImage, Wallet, Home, FileText, AlertTriangle, Heart, ShieldCheck, Pencil, Inbox, Key, Scale, Move, Users, Bell, X, Lock, Check, Calendar, Plus, Eye } from 'lucide-react'

const DynamicExperienceEngine = dynamic(() => import('@/components/orchestrator/DynamicExperienceEngine'), { ssr: false })
const FamilyTab = dynamic(() => import('./FamilyTab'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });
const HealthTab = dynamic(() => import('@/components/pets/tabs/HealthTab'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });
const VeterinerTab = dynamic(() => import('@/components/pets/tabs/VeterinerTab'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });


import { TaskCategory } from '@/lib/tasks/taskDefaults'
import { AlertCircleIcon, CalendarClockIcon, CheckCircle2Icon, CheckCircleIcon, ChevronRightIcon, HeartPulseIcon, ShieldAlertIcon, SmileIcon, StarIcon, TrophyIcon, ActivityIcon, PlusIcon, FileTextIcon, HistoryIcon, MapPinIcon, BabyIcon, FileLineChartIcon, HelpCircleIcon, DownloadIcon, PillIcon, DogIcon, CatIcon, IdCardIcon, TargetIcon, DropletsIcon } from 'lucide-react'
import { VaccineIcon, ParasiteIcon, ShampooIcon, BowlIcon, CarrierIcon, BoneIcon, ScoopIcon, FirstAidIcon, StethoscopeIcon } from '@/components/icons/PetIcons'
const NutritionClient = dynamic(() => import('./nutrition/NutritionClient'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
const HumanAgeCalculator = dynamic(() => import('@/components/pets/HumanAgeCalculator'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });
const BreedHealthCard = dynamic(() => import('@/components/pets/BreedHealthCard'));
const LostPetWizard = dynamic(() => import('@/components/pets/LostPetWizard'), { ssr: false });
const MinimalGrowthChart = dynamic(() => import('@/components/pets/MinimalGrowthChart'));
const SmartScanner = dynamic(() => import('@/components/ui/SmartScanner').then(mod => mod.SmartScanner), { ssr: false })
const HealthTracker = dynamic(() => import('@/components/health-tracker/HealthTracker').then(mod => mod.HealthTracker), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> })
const EstrusTracker = dynamic(() => import('@/components/estrus-tracker/EstrusTracker').then(mod => mod.EstrusTracker))
const SmartCardBanner = dynamic(() => import('@/components/ui/SmartCardBanner'));
import PetHeroCard from './PetHeroCard'
const AllergyManager = dynamic(() => import('@/components/pets/AllergyManager'));
const MedicationManager = dynamic(() => import('@/components/pets/MedicationManager'));
const HealthTimeline = dynamic(() => import('@/components/pets/health/HealthTimeline'), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> });
import { buildPetMicroTasks } from '@/lib/microTasks/petMicroTasks'
import { PetMicroTaskCard } from '@/components/micro-tasks/PetMicroTaskCard'
import { useDismissedMicroTasks } from '@/hooks/useDismissedMicroTasks'
import type { TaskModalType } from '@/components/pets/PetTaskModals';
const PetTaskModals = dynamic(() => import('@/components/pets/PetTaskModals').then(mod => mod.PetTaskModals))
const ParasitePlanCompletionModal = dynamic(() => import('@/components/pets/ParasitePlanCompletionModal'));
const DeletePlanConfirmationModal = dynamic(() => import('@/components/ui/DeletePlanConfirmationModal').then(mod => mod.DeletePlanConfirmationModal))
const PostponeModal = dynamic(() => import('@/components/pets/common/PostponeModal').then(mod => mod.PostponeModal))
const CompletionDetailsModal = dynamic(() => import('@/components/pets/common/CompletionDetailsModal').then(mod => mod.CompletionDetailsModal))
const ConfirmModal = dynamic(() => import('@/components/ui/ConfirmModal'));
import FloatingSOS from '@/components/FloatingSOS'
const AiDocumentScanner = dynamic(() => import('@/components/ai/AiDocumentScanner'), { ssr: false });
import { assessWeight } from '@/lib/vetStandards/weightStandards'


import { getPlanDisplayCategory } from '@/lib/plans/utils'
import { getTurkishGenitiveSuffix } from '@/lib/pets/utils'
function QuickUpdateModal({ petId, config, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  // setLoading asenkron olduğu için hızlı ardışık tıklamalarda ikinci gönderim
  // butona disabled yansımadan geçebilir; ref ile senkron kilit sağlanır.
  const submittingRef = useRef(false)

  const [radioValues, setRadioValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    config?.fields?.forEach((f: any) => {
      if (f.type === 'radio' && f.defaultValue !== undefined) {
        initial[f.name] = String(f.defaultValue)
      }
    })
    return initial
  })

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
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f: any) => (
             <div key={f.name} className="flex flex-col gap-1.5">
               <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{f.label}</label>
               {f.type === 'file' ? (
                 <input name={f.name} type="file" accept="image/*" className="input-base py-2.5 text-sm" required={f.required} />
               ) : f.type === 'radio' ? (
                 <div className="flex gap-2.5 mt-1">
                   {f.options?.map((opt: any) => {
                     const valStr = String(opt.value)
                     const currentVal = radioValues[f.name] ?? String(f.defaultValue ?? '')
                     const isSelected = currentVal === valStr
                     return (
                       <label
                         key={valStr}
                         className={`flex-1 py-3 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer border active:scale-[0.98] ${
                           isSelected
                             ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                             : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                         }`}
                       >
                         <input
                           type="radio"
                           name={f.name}
                           value={valStr}
                           checked={isSelected}
                           onChange={() => setRadioValues(prev => ({ ...prev, [f.name]: valStr }))}
                           className="sr-only"
                         />
                         {opt.label}
                       </label>
                     )
                   })}
                 </div>
               ) : (
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input-base py-3 text-sm" required={f.required} />
               )}
             </div>
          ))}
          {error && <p className="text-xs text-error font-bold p-2 bg-error/10 rounded-xs text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-btn border-2 border-border-main text-text-secondary font-bold text-sm">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-sm flex items-center justify-center gap-1">{loading ? 'Kaydediliyor...' : <>Kaydet <Check size={14} className="w-3.5 h-3.5 text-white" aria-hidden="true" /></>}</button>
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
  /** Pre-fetched server data for HealthTab — eliminates duplicate client-side fetches on Sağlık tab mount */
  initialVaccines?: any[];
  initialParasites?: any[];
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

/**
 * Belirli bir timeline event'inin tipini kategorize eder.
 * @returns 'stock_status' | 'completed_record' | 'active_plan'
 */
function getEventType(event: any): 'stock_status' | 'completed_record' | 'active_plan' {
  if (!event) return 'active_plan';

  // 1. Stok / Envanter (Sanal Event)
  if (event._is_virtual && event._source === 'food_inventory') {
    return 'stock_status';
  }

  // 2. Tamamlanmış Kayıt (Geçmiş Tıbbi Veri veya Tamamlanmış Plan)
  if (
    event._source === 'vaccine_records_v2' ||
    event._source === 'parasite_records' ||
    event._source === 'growth_records' ||
    event._source === 'weight_logs' ||
    event.status === 'done' ||
    event.status === 'completed' ||
    event.is_completed === true ||
    event.computedStatus === 'done' ||
    !!event.administered_at
  ) {
    return 'completed_record';
  }

  // 3. Aktif Plan/Görev (Varsayılan)
  return 'active_plan';
}

export default function PetDetailClient({ pet, age, score, overdue, schedules, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, inventory, feedingLogs, weightLogs, assignments, payments, subscription, activeLostReport, hasPasskey = false, isAdminView = false, lastVaccineRecord, initialVaccines, initialParasites }: PetDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()


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
  const initialTab = (tabParam === 'saglik' || tabParam === 'asi' || tabParam === 'parazit' || tabParam === 'vaccines' || tabParam === 'parasite')
    ? 'saglik'
    : (tabParam === 'bakim' || tabParam === 'hijyen' || tabParam === 'aktivite' || tabParam === 'diger')
      ? 'bakim'
      : (tabParam === 'takvim' || tabParam === 'ekstra' || tabParam === 'beslenme' || tabParam === 'veteriner')
        ? tabParam
        : 'ozet'

  const [activeTab, setActiveTab] = useState<'ozet'|'saglik'|'bakim'|'takvim'|'beslenme'|'veteriner'|'ekstra'>(initialTab)
  const [isSmartScannerOpen, setIsSmartScannerOpen] = useState(false)
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
  const [deletingPlan, setDeletingPlan] = useState<{ id: string; title?: string; category?: string } | null>(null)
  const [isDeletingPlanProcessing, setIsDeletingPlanProcessing] = useState(false)
  const hasFoodBrand = Boolean(
    pet.extra_data?.food_brand ||
    nutritionLogs?.[0]?.food_brand ||
    (assignments && assignments.length > 0) ||
    inventory?.food_brand ||
    inventory?.brand_name ||
    inventory?.name
  );

  const [showNeuterBanner, setShowNeuterBanner] = useState(pet.is_neutered === null || pet.is_neutered === undefined);
  const [showFoodBanner, setShowFoodBanner] = useState(!hasFoodBrand);

  useEffect(() => {
    if (hasFoodBrand) {
      setShowFoodBanner(false);
    }
  }, [hasFoodBrand]);

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
  const [taskToComplete, setTaskToComplete] = useState<any>(null)
  const [taskToPostpone, setTaskToPostpone] = useState<any>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [medicationActionTask, setMedicationActionTask] = useState<any>(null)
  const [medicationNote, setMedicationNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [trackerRefreshKey, setTrackerRefreshKey] = useState(0)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [showPetMenuSheet, setShowPetMenuSheet] = useState(false)
  const [activeTimelineTask, setActiveTimelineTask] = useState<any>(null)
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
    setActiveTab('veteriner')
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
    const targetId = realPlanId || (typeof item === 'string' ? item : item?.id);
    
    if (targetId) {
      router.push(`/owner/plan-yap/edit/${targetId}?petId=${pet.id}`);
    }
  }

  const handleMarkDone = (item: any) => {
    setTaskToComplete(item);
  }

  const handlePostpone = (item: any) => {
    setTaskToPostpone(item);
  }

  const confirmCompleteTask = async (details: any) => {
    if (!taskToComplete) return;
    setIsDeletingPlanProcessing(true); // Re-use loading state if any, or just await
    try {
      const realId = taskToComplete.id.toString().startsWith('plan_') ? taskToComplete.id.replace('plan_', '') : taskToComplete.id;
      const res = await fetch(`/api/plans/${realId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      setTaskToComplete(null);
      router.refresh();
      setTrackerRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingPlanProcessing(false);
    }
  }

  const confirmPostponeTask = async (newDate: string, note?: string) => {
    if (!taskToPostpone) return;
    setIsDeletingPlanProcessing(true);
    try {
      const realId = taskToPostpone.id.toString().startsWith('plan_') ? taskToPostpone.id.replace('plan_', '') : taskToPostpone.id;
      const res = await fetch(`/api/plans/${realId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: newDate }) // Notu eklemek istenirse extra_data güncellenebilir
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      setTaskToPostpone(null);
      router.refresh();
      setTrackerRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingPlanProcessing(false);
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
            <span className="text-success bg-success/10 px-2 py-0.5 rounded-md font-bold tracking-wide flex items-center gap-1"><Check size={12} className="w-3 h-3 text-success" aria-hidden="true" /> Tamamlandı</span>
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
          badge = <span className="text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm flex items-center gap-1"><AlertTriangle size={14} className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" /> {mins} dk gecikti</span>
        } else if (diffMins < 1440) { // 24 hours
          const hours = Math.floor(diffMins / 60)
          badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm flex items-center gap-1"><AlertTriangle size={14} className="w-3.5 h-3.5 text-error" aria-hidden="true" /> {hours} saat gecikti</span>
        } else {
          const days = Math.floor(diffMins / 1440)
          badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm flex items-center gap-1"><AlertTriangle size={14} className="w-3.5 h-3.5 text-error" aria-hidden="true" /> {days} gün gecikti</span>
        }
      } else {
        const today = new Date()
        today.setHours(0,0,0,0)
        const targetDate = new Date(d)
        targetDate.setHours(0,0,0,0)
        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays === 0) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">Bugün</span>;
        else if (diffDays === 1) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">Yarın</span>;
        else if (diffDays === -1) badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm flex items-center gap-1"><AlertTriangle size={14} className="w-3.5 h-3.5 text-error" aria-hidden="true" /> Dün</span>;
        else if (diffDays < -1) badge = <span className="text-error bg-error/10 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm flex items-center gap-1"><AlertTriangle size={14} className="w-3.5 h-3.5 text-error" aria-hidden="true" /> {Math.abs(diffDays)} gün gecikti</span>;
        else if (diffDays <= 3) badge = <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm">{diffDays} gün kaldı</span>;
        else badge = <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold tracking-wide flex items-center gap-1"><Calendar size={14} className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> {diffDays} gün kaldı</span>;
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
    if (!item) return null
    if (typeof item === 'string') {
      if (isPlanSource(item)) return getRealPlanId(item)
      return null
    }
    if (item.id && isPlanSource(item.id)) return getRealPlanId(item.id)
    if ((item._source === 'plans' || item._source === 'health_schedules') && item._plan_id) return item._plan_id
    if (item._is_virtual && (item._source === 'plans' || item._source === 'health_schedules') && item._plan_id) return item._plan_id
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

  const renderTaskList = (title: string, list: any[], emptyMessage?: string, customEmptyContent?: React.ReactNode) => {
    if ((!list || list.length === 0) && !emptyMessage && !customEmptyContent) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
      <div className="flex flex-col gap-3">
        {title && <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-widest px-1">{title}</h4>}
        {(!list || list.length === 0) ? (
          customEmptyContent ? customEmptyContent : (
            <div className="py-6 bg-bg-main/50 rounded-card border border-dashed border-border-main text-center flex flex-col items-center gap-2">
              <Inbox size={24} className="w-6 h-6 opacity-80 text-text-secondary" aria-hidden="true" />
              <p className="text-sm font-bold text-text-secondary">{emptyMessage}</p>
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
                  <p className={`text-xs font-semibold ${cardStyle.textSub}`}>
                    {item.extra_data?.record_type === 'medication' && item.extra_data?.medication?.dosage_string
                      ? item.extra_data.medication.dosage_string
                      : item.sub_category}
                  </p>
                )}
                <div className={`text-xs font-semibold mt-1.5 ${cardStyle.textDate}`}>{formatTaskDate(item.due_date, item.due_time, isCompleted)}</div>
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
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleMarkDone(item); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer"><Check size={16} className="w-4 h-4 text-success" aria-hidden="true" /> Tamamlandı İşaretle</button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handlePostpone(item); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary-soft flex items-center gap-2 cursor-pointer"><Calendar size={16} className="w-4 h-4 text-primary" aria-hidden="true" /> Ertele</button>
                    <div className="border-t border-border-main/30 mx-2 my-1"/>
                    <button onClick={(e) => { e.stopPropagation(); handleEditTask(item); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer"><Pencil size={16} className="w-4 h-4 text-primary" aria-hidden="true" /> Düzenle</button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setDeletingPlan({ id: item.id, title: item.title || (item as any).vaccines?.name, category: getPlanDisplayCategory(item.category, item.sub_category) }); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer"><X size={16} className="w-4 h-4 text-error" aria-hidden="true" /> Sil</button>
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
            <Inbox size={24} className="w-6 h-6 opacity-80 text-text-secondary" aria-hidden="true" />
            <p className="text-sm font-bold text-text-secondary leading-relaxed">
              Bugün için planlı göreviniz yok. İleri tarihli <span className="text-primary font-bold">{upcomingTasks.length}</span> görevinizi görmek için filtreyi &apos;Tüm Zamanlar&apos; olarak değiştirin.
            </p>
          </div>
          {renderTaskList('Yaklaşan Görevler', upcomingTasks.slice(0, 3))}
        </div>
      );
    }

    const handleCtaClick = () => {
      handlePlanla(tabName);
    };

    if (!hasAnyTasks) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <div className="py-8 px-4 bg-bg-main/50 rounded-card border border-dashed border-border-main text-center flex flex-col items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-tr ${cta?.gradient || 'from-slate-200 to-slate-300'} rounded-xs flex items-center justify-center shadow-sm mb-1`}>
              <Calendar size={24} className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-extrabold text-text-primary text-base">Henüz görev planlanmamış</h3>
            <p className="text-sm text-text-secondary max-w-[260px] leading-relaxed mb-2">{cta?.desc || 'Bu kategoride henüz bir görev planlamadınız.'}</p>
            {cta && (
              <button
                onClick={handleCtaClick}
                className="btn-primary min-h-12 flex items-center justify-center px-6 text-sm font-bold rounded-btn"
              >
                + {cta.btnLabel}
              </button>
            )}
            {(tabName === 'Sağlık' || tabName === 'Aşı') && (
              <div className="w-full max-w-[260px] mt-2">
                <AiDocumentScanner 
                  petId={pet.id} 
                  onConfirm={(data) => {
                    setQuickUpdateConfig({
                      title: 'Yeni Kayıt Onayı',
                      desc: 'Yapay zeka tarafından bulunan verileri kontrol edip kaydedin.',
                      fields: [
                        { name: 'title', type: 'text', label: 'Başlık / Aşı Adı', defaultValue: data.brand || '', required: true },
                        { name: 'date', type: 'date', label: 'Tarih', defaultValue: data.date || '', required: true },
                      ],
                      customHandler: async (fd: FormData) => {
                        // Normally make an API call to save the confirmed data
                        // Mock alert for now since we don't have a real DB schema for this endpoint
                        alert(`Kaydedildi: ${fd.get('title')} - ${fd.get('date')}`);
                      }
                    });
                  }} 
                />
              </div>
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
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
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

          if (plannedTasks.length === 0 && completedTasks.length > 0) {
            plannedEmptyMessage = 'Harika! Tüm görevler tamamlandı';
          }

          return (
            <>
              {(tabName === 'Sağlık' || tabName === 'Aşı') && (
                <div className="w-full mt-1 mb-2 max-w-[260px] self-center">
                  <AiDocumentScanner 
                    petId={pet.id} 
                    onConfirm={(data) => {
                      setQuickUpdateConfig({
                        title: 'Yeni Kayıt Onayı',
                        desc: 'Yapay zeka tarafından bulunan verileri kontrol edip kaydedin.',
                        fields: [
                          { name: 'title', type: 'text', label: 'Başlık / Aşı Adı', defaultValue: data.brand || '', required: true },
                          { name: 'date', type: 'date', label: 'Tarih', defaultValue: data.date || '', required: true },
                        ],
                        customHandler: async (fd: FormData) => {
                          alert(`Kaydedildi: ${fd.get('title')} - ${fd.get('date')}`);
                        }
                      });
                    }} 
                  />
                </div>
              )}
              {renderTaskList('', filteredPlanned, plannedEmptyMessage, customEmptyContent)}
            </>
          );
        })()}
        
        {completedTasks.length > 0 && (
          <div className="mt-2">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full py-3.5 bg-bg-main hover:bg-border-main/40 text-text-secondary font-bold text-sm rounded-btn border border-dashed border-border-main transition-colors flex items-center justify-center gap-2"
            >
              {showCompleted ? 'Tamamlanmış Görevleri Gizle' : `Tamamlanmış Görevleri Gör (${filteredCompleted.length})`}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            {showCompleted && (
              <div className="mt-4 animate-fade-in flex flex-col gap-4">
                {(completedTasks.length > 0) && (
                  <div className="flex flex-col gap-3 card-base p-4 border border-[#3c6b65]/20 bg-[#edf7f6]/30 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[#3c6b65] uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
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
      assignments: assignments ?? [],
      lastVaccineRecord: lastVaccineRecord ?? null,
      inventory: inventory ?? null,
    })
  )

  return (
    <div className="flex flex-col gap-6 pb-26 pb-safe w-full max-w-6xl mx-auto">
      {generalError && (
        <div role="alert" className="p-3 bg-error/10 text-error text-sm font-bold rounded-xs text-center border border-error/20 mx-4 mt-4">
          {generalError}
        </div>
      )}

      {/* Admin Notice Banner */}
      {isAdminView && (
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-primary text-white text-sm font-bold px-5 py-4 rounded-sheet flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-500/15 border border-white/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <Key size={18} className="w-4.5 h-4.5 text-amber-300 animate-bounce shrink-0" aria-hidden="true" />
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
              onChangeCoverClick={() => setShowPetMenuSheet(true)}
              onChangeAvatarClick={() => avatarInputRef.current?.click()}
            />

            {/* Experience Orchestrator - Kilitli alanın dışına monte edildi */}
            <DynamicExperienceEngine 
              contextTags={['pet_detail']} 
              triggerEvent="on_load" 
              petId={pet.id} 
            />

            <div className="sticky top-16 z-20 bg-surface border-b border-border pointer-events-auto">
              <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden min-h-[44px] items-center" role="tablist">
                {([
                  {id:'ozet', label:'Özet'},
                  {id:'takvim', label:'Takvim'},
                  {id:'saglik', label:'Sağlık'},
                  {id:'bakim', label:'Bakım'},
                  {id:'beslenme', label:'Beslenme'},
                  {id:'veteriner', label:'Veteriner'},
                  {id:'ekstra', label:'Ekstra'},
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTab(tab.id);
                    }}
                    className={`flex-shrink-0 px-4 min-h-[44px] inline-flex items-center text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-200 cursor-pointer active:scale-[0.98] select-none pointer-events-auto ${activeTab === tab.id ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
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
                    {/* Paylaş & Ekip / Acil Durum */}
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
                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-1">Bugün</p>
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
                                <p className="text-sm font-600 text-[var(--color-text-secondary)]">Bugün planlı bakım yok</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{pet.name} ile güzel bir gün geçirin!</p>
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
                                  <span className="text-xs font-700 text-[var(--color-text-muted)] w-10 shrink-0 tabular-nums">{timeStr || '-'}</span>
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-600 text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
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
                                    <button type="button" onClick={() => { setActiveMenuId(null); handleMarkDone(plan); }}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-success bg-success/10 hover:bg-success/20 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer pointer-events-auto">
                                      <Check size={14} className="w-3.5 h-3.5 text-success" aria-hidden="true" /> Tamamlandı
                                    </button>
                                    <button type="button" onClick={() => { setActiveMenuId(null); handlePostpone(plan); }}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-text-secondary bg-text-secondary/10 hover:bg-text-secondary/20 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer pointer-events-auto">
                                      <Calendar size={14} className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" /> Ertele
                                    </button>
                                    <button type="button" onClick={() => { setActiveMenuId(null); handleEditTask(plan); }}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer pointer-events-auto">
                                      <Pencil size={14} className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Düzenle
                                    </button>
                                    <button type="button" onClick={() => { setActiveMenuId(null); setDeletingPlan({ id: plan.id, title: plan.title || (plan as any).vaccines?.name, category: getPlanDisplayCategory(plan.category, plan.sub_category) }); }}
                                      className="min-h-[44px] px-2 py-2 text-xs font-bold text-error bg-error/10 hover:bg-error/20 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer pointer-events-auto">
                                      <X size={14} className="w-3.5 h-3.5 text-error" aria-hidden="true" /> Sil
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
                        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide px-1">
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
                    {activeTaskModal && (
                      <PetTaskModals
                        petId={pet.id}
                        petName={pet.name}
                        activeModal={activeTaskModal}
                        onClose={() => setActiveTaskModal(null)}
                        onSuccess={() => router.refresh()}
                      />
                    )}
                  </div>

                  {/* SAĞ SÜTUN (Masaüstü: lg:col-span-5) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* ── Kilo ve İdeal Kilo Analizi Hesaplamaları ── */}
                    {(() => {
                      const currentWeightVal = growthRecords?.[0]?.weight_kg ?? (pet.weight ? parseFloat(pet.weight) : (pet.weight_kg ? parseFloat(pet.weight_kg) : null));
                      const prevWeightVal = growthRecords?.[1]?.weight_kg ?? null;
                      const weightDiffFromLast = (currentWeightVal != null && prevWeightVal != null) ? (currentWeightVal - prevWeightVal) : null;

                      const weightAssessment = currentWeightVal != null
                        ? assessWeight({
                            species: pet.species,
                            breed: pet.breed,
                            gender: pet.gender,
                            isNeutered: pet.is_neutered,
                            birthDate: pet.birth_date,
                            weightKg: currentWeightVal,
                          })
                        : null;

                      const lastWeightMeasuredAt = growthRecords?.[0]?.measured_at
                        ? new Date(growthRecords[0].measured_at)
                        : null;

                      const lastWeightDateStr = lastWeightMeasuredAt
                        ? lastWeightMeasuredAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : (currentWeightVal ? 'Profil kaydı' : 'Kayıt bulunamadı');

                      const nextWeightDateStr = lastWeightMeasuredAt
                        ? new Date(lastWeightMeasuredAt.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Aylık Rutin Takip';

                      return (
                        <>
                          {/* ── Tam Genişlikte (Boydan Boya) Görsel Kilo & Gelişim Analizi Kartı ── */}
                          <div className="card-base p-4 sm:p-5 flex flex-col gap-4 bg-gradient-to-br from-white via-[#FAF9FE] to-[#F4F2FD] border border-[#E2DFFA] shadow-sm rounded-3xl relative overflow-hidden w-full">
                            {/* Sol Vurgu Çubuğu */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#534AB7] to-[#7E74EA]" />

                            {/* Header: Başlık + Durum Rozeti + Bilgi Gir Butonu */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE8FA] pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-[#534AB7]/10 text-[#534AB7] flex items-center justify-center font-bold shadow-xs">
                                  <Scale size={18} />
                                </div>
                                <div>
                                  <h3 className="text-sm font-extrabold text-[#26215C] leading-tight flex items-center gap-2">
                                    Kilo & Gelişim Analizi
                                  </h3>
                                  <p className="text-[11px] font-medium text-[#6F6B99]">
                                    {pet.name} için veteriner standartlı kilo takibi
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {weightAssessment && (
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-xs ${
                                    weightAssessment.status === 'ideal'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : weightAssessment.status === 'overweight'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : weightAssessment.status === 'underweight'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {weightAssessment.status === 'ideal' && <CheckCircle2Icon size={14} className="text-emerald-600" />}
                                    {weightAssessment.status === 'overweight' && <AlertTriangle size={14} className="text-amber-600" />}
                                    {weightAssessment.status === 'underweight' && <AlertTriangle size={14} className="text-rose-600" />}
                                    <span>
                                      {weightAssessment.status === 'ideal' && 'İdeal Kilo Aralığında'}
                                      {weightAssessment.status === 'overweight' && `İdeal Kilo Üzerinde (+${weightAssessment.diffKg.toFixed(1)} kg)`}
                                      {weightAssessment.status === 'underweight' && `İdeal Kilo Altında (${weightAssessment.diffKg.toFixed(1)} kg)`}
                                      {weightAssessment.status === 'unknown' && 'Kilo Analizi Yapıldı'}
                                    </span>
                                  </div>
                                )}

                                <Link
                                  href={`/owner/pets/${pet.id}/nutrition?tab=kilo`}
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F2FD] text-[#534AB7] border border-[#E2DFFA] text-xs font-bold transition-all active:scale-[0.97] shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={14} /> Detay Gör
                                </Link>

                                <button
                                  onClick={() => setActiveTaskModal('WEIGHT_MODAL')}
                                  className="px-3 py-1.5 rounded-xl bg-[#534AB7] hover:bg-[#443C9E] text-white text-xs font-bold transition-all active:scale-[0.97] shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <PlusIcon size={14} /> Bilgi Gir
                                </button>
                              </div>
                            </div>

                            {/* 3 Detay Metrik Sütunu */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Kutu 1: Güncel Kilo & Değişim Trendi */}
                              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-[#E9E6FA] flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-[#6F6B99] uppercase tracking-wider">Güncel Kilo</span>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-2xl font-black text-[#26215C] tabular-nums">
                                    {currentWeightVal != null ? currentWeightVal.toFixed(1) : '-'}
                                  </span>
                                  {currentWeightVal != null && <span className="text-xs font-bold text-[#6F6B99]">kg</span>}
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                  {weightDiffFromLast != null ? (
                                    weightDiffFromLast > 0 ? (
                                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                        ↑ +{weightDiffFromLast.toFixed(1)} kg artış
                                      </span>
                                    ) : weightDiffFromLast < 0 ? (
                                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                        ↓ {weightDiffFromLast.toFixed(1)} kg kayıp
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                        = Kilo stabil
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[11px] font-medium text-[#6F6B99]">Son ölçüme göre değişim</span>
                                  )}
                                </div>
                              </div>

                              {/* Kutu 2: Beklenen İdeal Aralık */}
                              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-[#E9E6FA] flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-[#6F6B99] uppercase tracking-wider">Beklenen İdeal Aralık</span>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-xl font-extrabold text-[#26215C] tabular-nums">
                                    {weightAssessment ? `${weightAssessment.idealMin.toFixed(1)} – ${weightAssessment.idealMax.toFixed(1)}` : '3.5 – 6.0'}
                                  </span>
                                  <span className="text-xs font-bold text-[#6F6B99]">kg</span>
                                </div>
                                <span className="text-[11px] font-medium text-[#6F6B99] mt-1 truncate">
                                  {pet.breed || 'Genel ırk'} standart hedefi
                                </span>
                              </div>

                              {/* Kutu 3: Ölçüm Tarihleri (Son & Gelecek) */}
                              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-[#E9E6FA] flex flex-col justify-between gap-1">
                                <div>
                                  <span className="text-[11px] font-bold text-[#6F6B99] uppercase tracking-wider">Son Ölçüm</span>
                                  <p className="text-xs font-bold text-[#26215C] mt-0.5">{lastWeightDateStr}</p>
                                </div>
                                <div className="pt-1 border-t border-[#F0EEFC] flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-[#6F6B99]">Gelecek Ölçüm:</span>
                                  <span className="text-[11px] font-bold text-[#534AB7]">{nextWeightDateStr}</span>
                                </div>
                              </div>
                            </div>

                            {/* Görsel İdeal Kilo Gösterge Çubuğu */}
                            {weightAssessment && currentWeightVal != null && (
                              <div className="mt-1 pt-3 border-t border-[#ECE8FA] flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#6F6B99]">
                                  <span>Min ({weightAssessment.idealMin.toFixed(1)} kg)</span>
                                  <span className="text-[#534AB7]">İdeal Bölge</span>
                                  <span>Max ({weightAssessment.idealMax.toFixed(1)} kg)</span>
                                </div>
                                <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-inner">
                                  <div className="absolute top-0 bottom-0 bg-emerald-400/30 border-x border-emerald-500/40 left-[20%] right-[20%]" />
                                  {(() => {
                                    const minRange = Math.max(0, weightAssessment.idealMin - 2);
                                    const maxRange = weightAssessment.idealMax + 2;
                                    const percentage = Math.min(95, Math.max(5, ((currentWeightVal - minRange) / (maxRange - minRange)) * 100));
                                    return (
                                      <div
                                        className="absolute top-0 bottom-0 w-3 bg-[#534AB7] rounded-full shadow-md transform -translate-x-1/2 ring-2 ring-white"
                                        style={{ left: `${percentage}%` }}
                                        title={`Güncel: ${currentWeightVal.toFixed(1)} kg`}
                                      />
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Son Aşı & Sıradaki Reminders 2-Column Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-surface rounded-card p-3 flex flex-col items-center text-center border border-border-main/60 shadow-soft min-w-0">
                              <span className="text-xs font-semibold text-text-secondary">Son aşı</span>
                              <span className="text-base font-extrabold text-text-primary leading-tight mt-0.5 truncate max-w-full tabular-nums">{lastVaccineStr}</span>
                              <span className="text-xs font-bold text-success mt-0.5 truncate max-w-full">{lastVaccineSub}</span>
                            </div>
                            <div className="bg-surface rounded-card p-3 flex flex-col items-center text-center border border-border-main/60 shadow-soft min-w-0">
                              <span className="text-xs font-semibold text-text-secondary">Sıradaki</span>
                              <span className="text-base font-extrabold text-text-primary leading-tight mt-0.5 truncate max-w-full tabular-nums">{nextDateStr}</span>
                              <span className={`text-xs font-bold mt-0.5 truncate max-w-full ${overdueCount > 0 ? 'text-warning' : 'text-text-secondary'}`}>
                                {nextSchedule ? (nextSchedule as any).title?.slice(0, 15) || 'Bakım' : 'Yok'}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

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
                          <span className="text-xs font-bold text-text-primary truncate max-w-[180px]">
                            {(() => {
                              if (nutritionLogs?.[0]?.food_brand) {
                                const type = nutritionLogs[0].food_type ? ` (${nutritionLogs[0].food_type})` : ''
                                return `${nutritionLogs[0].food_brand}${type}`
                              }
                              const activeAssign = assignments?.find((a: any) => a && a.is_active !== false) || assignments?.[0]
                              if (activeAssign) {
                                const brandName = activeAssign.food_product_family?.brand?.display_name || activeAssign.custom_brand || activeAssign.food_product_family?.official_name || activeAssign.custom_name
                                const productName = activeAssign.food_product_family?.official_name || activeAssign.custom_name
                                const foodForm = activeAssign.food_product_family?.food_form || activeAssign.food_type
                                
                                let label = brandName || productName || 'Tanımlı Mama'
                                if (brandName && productName && brandName !== productName && !productName.includes(brandName)) {
                                  label = `${brandName} ${productName}`
                                }
                                if (foodForm) {
                                  label += ` (${foodForm})`
                                }
                                return label
                              }
                              return 'Mama tanımlanmadı'
                            })()}
                          </span>
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


      {/* Plan Silme Onay Modali (P0/P1 UX - Tıbbi Kayıt Koruma Güvenceli) */}
      {deletingPlan && (
        <DeletePlanConfirmationModal
          open={!!deletingPlan}
          title={deletingPlan.title ? `${deletingPlan.title} planını silmek istiyor musunuz?` : undefined}
          categoryName={deletingPlan.category}
          isDeleting={isDeletingPlanProcessing}
          onCancel={() => {
            if (!isDeletingPlanProcessing) setDeletingPlan(null);
          }}
          onConfirm={async () => {
            if (!deletingPlan) return;
            setIsDeletingPlanProcessing(true);
            try {
              await handleDeleteTask(deletingPlan.id);
            } finally {
              setIsDeletingPlanProcessing(false);
              setDeletingPlan(null);
            }
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
        <HealthTracker refreshTrigger={trackerRefreshKey} petId={pet.id} onEditTask={(t) => setActiveTimelineTask(t)} onMarkDone={(t) => handleMarkDone(t)} onPostpone={(t) => handlePostpone(t)} />
      </div>

      {pet.gender === 'female' && !pet.is_neutered && (
        <EstrusTracker petId={pet.id} petSpecies={pet.species} />
      )}

      <HealthTimeline schedules={localSchedules} />

      </div>
      )}

      {activeTab === 'beslenme' && (
        <div className="flex flex-col gap-3 p-4">
          {showFoodBanner && (
            <SmartCardBanner
              title="Beslenme Profili Eksik"
              description="Hangi mamayı yediğini bilmemiz, günlük kalori takibini %30 daha isabetli yapmamızı sağlar."
              actionLabel="Marka Ekle"
              icon={<BowlIcon width={24} height={24} />}
              colorTheme="orange"
              onAction={() => {
                setQuickUpdateConfig({
                  title: 'Beslenme Bilgisi',
                  desc: 'Hangi mamayı yiyor?',
                  fields: [
                    { name: 'food_brand', type: 'text', label: 'Mama Markası', placeholder: 'Örn: N&D, ProPlan...', required: true }
                  ],
                  customHandler: async (fd: FormData) => {
                    const food_brand = fd.get('food_brand');
                    await fetch(`/api/pets/${pet.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ extra_data: { ...(pet.extra_data || {}), food_brand } })
                    });
                    setShowFoodBanner(false);
                    router.refresh();
                  }
                });
              }}
            />
          )}
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
        {activeTab === 'saglik' && showNeuterBanner && (
          <SmartCardBanner
            title="Sağlık Profili Eksik"
            description={`${pet.name} kısırlaştırıldı mı? Metabolizma hızı değişeceği için aşı ve kilo takibi daha kesin sonuçlar verecektir.`}
            actionLabel="Güncelle"
            icon={<HeartPulseIcon size={24} />}
            colorTheme="purple"
            onAction={() => {
              setQuickUpdateConfig({
                title: 'Kısırlaştırma Durumu',
                desc: `${pet.name} kısırlaştırıldı mı? Metabolizma hızı değişeceği için aşı ve kilo takibi daha kesin sonuçlar verecektir.`,
                fields: [
                  {
                    name: 'is_neutered',
                    type: 'radio',
                    label: 'Kısırlaştırma Seçeneği',
                    defaultValue: pet.is_neutered === true ? 'true' : 'false',
                    options: [
                      { value: 'true', label: 'Evet, Kısırlaştırıldı' },
                      { value: 'false', label: 'Hayır, Kısırlaştırılmadı' }
                    ]
                  }
                ],
                customHandler: async (fd: FormData) => {
                  const val = fd.get('is_neutered');
                  const isNeutered = val === 'true';
                  await fetch(`/api/pets/${pet.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_neutered: isNeutered })
                  });
                  setShowNeuterBanner(false);
                  router.refresh();
                }
              });
            }}
          />
        )}
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
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Scale size={20} className="w-5 h-5 text-white" aria-hidden="true" />
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
                          <FileText size={16} className="w-4 h-4 text-white" aria-hidden="true" /> {module.logBtnLabel}
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
            <HealthTab 
              petId={pet.id} 
              petName={pet.name}
              onMarkDone={handleMarkDone}
              onPostpone={handlePostpone}
              onEdit={handleEditTask}
              initialVaccines={initialVaccines}
              initialParasites={initialParasites}
              initialVetRecords={appointments}
            />
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

        {/* Veteriner Süreçleri & Klinik Yönetim Kartı */}
        <div 
          className="card-base p-5 border border-border-main/60 hover:border-primary/50 transition-all cursor-pointer group active:scale-[0.99]" 
          onClick={() => setActiveTab('veteriner')}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <StethoscopeIcon width={24} height={24} className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-text-primary mb-0.5">Veteriner & Klinik Yönetimi</h3>
                <p className="text-xs text-text-secondary">Klinik, hekim, randevu ve takip süreçlerini Veteriner sekmesinden yönetin.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary hover:underline shrink-0">Sekmeye Git &rarr;</span>
          </div>
        </div>

        {/* İlaçlar */}
        <MedicationManager petId={pet.id} initialMedications={medications || []} />

        {/* Alerjiler */}
        <AllergyManager petId={pet.id} initialAllergies={allergies || []} />
      </div>
      </div>
      )}

      {/* ── Veteriner Sekmesi ── */}
      {activeTab === 'veteriner' && (
        <div className="p-4">
          <VeterinerTab 
            petId={pet.id} 
            petName={pet.name} 
            petMicrochipNo={pet.microchip_no} 
            petSpecies={pet.species}
            petBreed={pet.breed}
          />
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

      {/* TIMELINE TASK ACTION SHEET */}
      {activeTimelineTask && (() => {
        const eventType = getEventType(activeTimelineTask);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-end animate-fade-in"
            onClick={() => setActiveTimelineTask(null)}>
            <div className="bg-surface w-full rounded-t-[28px] p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] shadow-2xl border-t border-border"
              onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
              <p className="text-base font-semibold text-text-primary mb-5 text-center flex items-center justify-center gap-2">
                <CalendarClockIcon className="w-5 h-5 text-primary shrink-0" /> {activeTimelineTask.title || activeTimelineTask.vaccine_name || 'Görev Aksiyonları'}
              </p>

              <div className="flex flex-col gap-2.5">
                
                {/* 1. AKTİF PLAN AKSİYONLARI */}
                {eventType === 'active_plan' && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        handleMarkDone(activeTimelineTask);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-sm font-bold text-success flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center">
                          <Check size={18} />
                        </div>
                        <span>Tamamlandı Olarak İşaretle</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        handlePostpone(activeTimelineTask);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-text-primary flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-text-secondary flex items-center justify-center">
                          <Calendar size={18} />
                        </div>
                        <span>Tarihi Ertele</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        handleEditTask(activeTimelineTask);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-sm font-bold text-primary flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <Pencil size={18} />
                        </div>
                        <span>Düzenle (Tam Görünüm)</span>
                      </div>
                    </button>
                  </>
                )}

                {/* 2. TAMAMLANMIŞ / KORUMA / TAKİP AKSİYONLARI */}
                {eventType === 'completed_record' && (
                  <>
                    {/* Eğer kaçırılmış bir koruma periyoduysa, Yeni Doz planlamaya yönlendir */}
                    {activeTimelineTask._source === 'vaccine_records_v2' && (
                      <button
                        onClick={() => {
                          setActiveTimelineTask(null);
                          router.push(`/owner/plan-yap/asi?pet_id=${pet.id}`);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-sm font-bold text-success flex items-center justify-between transition-colors active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center">
                            <Plus size={18} />
                          </div>
                          <span>Yeni Doz Planla</span>
                        </div>
                      </button>
                    )}
                    {activeTimelineTask._source === 'parasite_records' && (
                      <button
                        onClick={() => {
                          setActiveTimelineTask(null);
                          router.push(`/owner/plan-yap/parazit?pet_id=${pet.id}`);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-sm font-bold text-success flex items-center justify-between transition-colors active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center">
                            <Plus size={18} />
                          </div>
                          <span>Yeni Doz Planla</span>
                        </div>
                      </button>
                    )}
                    {(activeTimelineTask._source === 'growth_records' || activeTimelineTask._source === 'weight_logs') && (
                      <button
                        onClick={() => {
                          setActiveTimelineTask(null);
                          router.push(`/owner/pets/${pet.id}/nutrition?tab=kilo`);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-sm font-bold text-success flex items-center justify-between transition-colors active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center">
                            <Plus size={18} />
                          </div>
                          <span>Yeni Ölçüm Ekle</span>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        handleEditTask(activeTimelineTask);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-sm font-bold text-primary flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <Eye size={18} />
                        </div>
                        <span>Kaydı Görüntüle / Düzenle</span>
                      </div>
                    </button>
                  </>
                )}

                {/* 3. STOK DURUMU AKSİYONLARI */}
                {eventType === 'stock_status' && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        router.push(`/owner/pets/${pet.id}/nutrition?tab=stok`);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-sm font-bold text-success flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center">
                          <Plus size={18} />
                        </div>
                        <span>Stok Yenile / Dolum Ekle</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTimelineTask(null);
                        router.push(`/owner/pets/${pet.id}/nutrition`);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-text-primary flex items-center justify-between transition-colors active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-text-secondary flex items-center justify-center">
                          <Eye size={18} />
                        </div>
                        <span>Stok Detayını Görüntüle</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEK ÜÇ NOKTA (...) MENÜ MODALI */}
      {showPetMenuSheet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowPetMenuSheet(false)}>
          <div className="bg-surface w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] shadow-2xl border-t sm:border border-border"
            onClick={e => e.stopPropagation()}>
            
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4 sm:hidden" />
            <p className="text-base font-semibold text-text-primary mb-5 text-center flex items-center justify-center gap-2">
              {pet.species === 'cat' ? (
                <CatIcon className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <DogIcon className="w-5 h-5 text-primary shrink-0" />
              )} 
              <span>{pet.name} Profil Yönetimi</span>
            </p>

            <div className="flex flex-col gap-2.5">
              {/* Kapak Fotoğrafı Değiştir */}
              <button
                type="button"
                onClick={() => {
                  setShowPetMenuSheet(false)
                  coverInputRef.current?.click()
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98]">
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
                  type="button"
                  onClick={() => {
                    setShowPetMenuSheet(false)
                    setCoverAdjustingUrl(pet.cover_url)
                    setZoom(1.0)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98]">
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
                type="button"
                onClick={() => {
                  setShowPetMenuSheet(false)
                  avatarInputRef.current?.click()
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98]">
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
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Pencil size={18} />
                  </div>
                  <span>Evcil Hayvan Bilgilerini Düzenle</span>
                </div>
                <ChevronRightIcon size={16} className="text-text-muted" />
              </Link>

              {/* Sağlık Kartını Paylaş */}
              <Link
                href={`/owner/pets/${pet.id}/share`}
                onClick={() => setShowPetMenuSheet(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border text-sm font-bold text-text-primary flex items-center justify-between transition-colors cursor-pointer active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Share2 size={18} />
                  </div>
                  <span>Sağlık Kartını Paylaş</span>
                </div>
                <ChevronRightIcon size={16} className="text-text-muted" />
              </Link>

              {/* İptal */}
              <button
                type="button"
                onClick={() => setShowPetMenuSheet(false)}
                className="w-full py-3.5 rounded-xl border border-border text-sm font-bold text-text-secondary mt-2 hover:bg-surface-1 transition-colors cursor-pointer active:scale-[0.98]">
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
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary flex items-center justify-center gap-2">
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
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary flex items-center justify-center gap-2">
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
                className="w-full py-3 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary flex items-center justify-center gap-2">
                <FileImage size={18} />
                Dosyadan Seç
              </button>

              {/* İptal */}
              <button
                onClick={() => setShowCoverSourceSheet(false)}
                className="w-full py-3 rounded-xl text-sm text-text-secondary mt-1">
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
                Parmağınızla veya fareyle kaydırın
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Hizalama Hızlı Butonları */}
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-2">Hızlı Hizalama</label>
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
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Yakınlaştır / Uzaklaştır</label>
                  <span className="text-xs font-bold text-primary">{Math.round(zoom * 100)}%</span>
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
                  className="flex-[2] btn-primary py-3 disabled:opacity-50 text-sm shadow-md flex items-center justify-center gap-1"
                >{savingAdjust ? 'Kaydediliyor...' : <>Konumu Kaydet <Check size={14} className="w-3.5 h-3.5 text-white" aria-hidden="true" /></>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {taskToComplete && (
        <CompletionDetailsModal
          isOpen={true}
          taskTitle={taskToComplete.title || (taskToComplete as any).vaccines?.name || 'Görev'}
          category={taskToComplete.category?.toLowerCase() as any || 'saglik'}
          onClose={() => setTaskToComplete(null)}
          onComplete={confirmCompleteTask}
        />
      )}

      {taskToPostpone && (
        <PostponeModal
          isOpen={true}
          taskTitle={taskToPostpone.title || (taskToPostpone as any).vaccines?.name || 'Görev'}
          currentDate={taskToPostpone.due_date || new Date().toISOString().split('T')[0]}
          onClose={() => setTaskToPostpone(null)}
          onPostpone={confirmPostponeTask}
        />
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
              
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner animate-pulse">
                <PillIcon className="w-8 h-8 text-indigo-600" />
              </div>

              <div>
                <h4 className="text-xl font-semibold text-slate-800">{medicationActionTask.title}</h4>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm font-extrabold px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full shadow-sm">
                     {medicationActionTask.extra_data?.medication?.dosage_string || medicationActionTask.extra_data?.medication?.dose || '1 Doz'}
                  </span>
                  <button 
                    onClick={() => setShowNoteInput(prev => !prev)}
                    className="text-sm font-extrabold px-3 py-1 bg-white border border-slate-200 border-dashed text-slate-600 rounded-full hover:bg-slate-50 transition-all flex items-center gap-1"
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

              <div className="w-full flex justify-between items-center bg-white/50 border border-slate-200/50 rounded-2xl p-4 mt-2">
                <span className="text-sm font-bold text-slate-600">Saat</span>
                <span className="text-base font-bold text-slate-800">{medicationActionTask.due_time?.slice(0, 5) || '12:00'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => handleMedicationSkip(medicationActionTask)}
                className="py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <X size={16} className="w-4 h-4 text-red-700" aria-hidden="true" /> <span>Atla</span>
              </button>
              <button
                onClick={() => handleMedicationSnooze(medicationActionTask)}
                className="py-3.5 bg-[#FAF1E6] hover:bg-[#F3E5D4] text-[#8C6239] font-extrabold text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Bell size={16} className="w-4 h-4 text-[#8C6239]" aria-hidden="true" /> <span>Ertele</span>
              </button>
              <button
                onClick={() => handleMedicationConfirm(medicationActionTask, medicationNote)}
                className="py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check size={16} className="w-4 h-4 text-white" aria-hidden="true" /> <span>Onayla</span>
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

      {markFoundConfirmOpen && (
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
      )}
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
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                  <Users size={20} className="w-5 h-5 text-purple-700" aria-hidden="true" />
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
                className="w-9 h-9 rounded-full bg-bg-main hover:bg-border-main flex items-center justify-center text-text-secondary transition-colors"
              >
                <X size={16} className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-5 overflow-y-auto flex-1">
              <FamilyTab
                petId={pet.id}
                petName={pet.name}
                plan={subscription?.['status'] === 'active' || subscription?.['status'] === 'trialing' ? 'pro' : 'free'}
                initialSos={pet.sos_contacts}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
