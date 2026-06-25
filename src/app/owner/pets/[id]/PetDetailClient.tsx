'use client'

import Link from 'next/link'
import Image from 'next/image'
import FamilyTab from './FamilyTab'
import ReportsTab from './ReportsTab'
import GalleryTab from '@/components/pets/tabs/GalleryTab'
import MatchTab from '@/components/pets/tabs/MatchTab'
import BudgetTab from '@/components/pets/tabs/BudgetTab'
import AdoptionTab from '@/components/pets/tabs/AdoptionTab'

import SmartTaskWizard from '@/components/tasks/SmartTaskWizard'
import { TaskCategory } from '@/lib/tasks/taskDefaults'
import { FirstAidIcon, VaccineIcon, ShampooIcon, BowlIcon, CarrierIcon, ScoopIcon, BoneIcon, HouseIcon, ParasiteIcon } from '@/components/icons/PetIcons'
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

function QuickUpdateModal({ petId, config, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  async function handleSubmit(e: any) {
    e.preventDefault()
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
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-[17px] font-extrabold text-text-primary mb-1">{config.title}</h3>
        <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f: any) => (
             <div key={f.name} className="flex flex-col gap-1.5">
               <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">{f.label}</label>
               {f.type === 'file' ? (
                 <input name={f.name} type="file" accept="image/*" className="input-base py-2.5 text-[13px]" required={f.required} />
               ) : (
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input-base py-3 text-[14px]" required={f.required} />
               )}
             </div>
          ))}
          {error && <p className="text-[12px] text-error font-bold p-2 bg-error/10 rounded-lg text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-[14px]">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
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
    'Diğer':     { icon: <HouseIcon width={28} height={28} />, btnLabel: 'Diğer Görev Planla', desc: 'Diğer kategori görevleri ve hatırlatmaları oluşturun.', title: 'Diğer Görevler', gradient: 'from-gray-100 to-slate-50' },
  };
}

const getTurkishGenitiveSuffix = (name: string) => {
  if (!name) return 'nin';
  const vowels = 'aıoueiöü';
  const lastChar = name.slice(-1).toLowerCase();
  const isVowel = vowels.includes(lastChar);
  
  let lastVowel = 'e';
  for (let i = name.length - 1; i >= 0; i--) {
    const char = name[i].toLowerCase();
    if (vowels.includes(char)) {
      lastVowel = char;
      break;
    }
  }
  
  const isBack = 'aıou'.includes(lastVowel);
  const isRounded = 'ouöü'.includes(lastVowel);
  
  if (isVowel) {
    if (isBack) return isRounded ? 'nun' : 'nın';
    return isRounded ? 'nün' : 'nin';
  } else {
    if (isBack) return isRounded ? 'un' : 'ın';
    return isRounded ? 'ün' : 'in';
  }
};

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
  payments: any[];
  subscription: any;
  activeLostReport?: any;
  hasPasskey?: boolean;
  isAdminView?: boolean;
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
      iconBorder: 'border-red-100/50'
    };
  } else if (!isCompleted) {
    return {
      bg: 'bg-primary-soft/70 border border-primary/10',
      hoverBg: 'hover:bg-primary-soft/90',
      textTitle: 'text-text-primary',
      textSub: 'text-text-secondary',
      textDate: 'text-primary',
      textDots: 'text-text-secondary hover:text-primary',
      iconBorder: 'border-primary/10'
    };
  }
  return {
    bg: 'bg-[#edf7f6]',
    hoverBg: 'hover:bg-[#e0f4f1]',
    textTitle: 'text-[#0f3a35]',
    textSub: 'text-[#3c6b65]',
    textDate: 'text-[#5a8680]',
    textDots: 'text-[#3c6b65] hover:text-[#0f3a35]',
    iconBorder: 'border-[#edf7f6]'
  };
}

export default function PetDetailClient({ pet, age, score, overdue, schedules, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, payments, subscription, activeLostReport, hasPasskey = false, isAdminView = false }: PetDetailProps) {
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
    'ozet': 'Özet', 'saglik': 'Sağlık', 'asi': 'Aşı',
    'bakim': 'Bakım', 'beslenme': 'Beslenme', 'hijyen': 'Hijyen',
    'aktivite': 'Aktivite', 'veteriner': 'Veteriner',
    'diger': 'Diğer', 'raporlar': 'Raporlar',
  }
  // Turkish module.name → url-safe id (div id için)
  const MODULE_ID_MAP: Record<string, string> = {
    'Özet': 'ozet', 'Sağlık': 'saglik', 'Aşı': 'asi',
    'Bakım': 'bakim', 'Beslenme': 'beslenme', 'Hijyen': 'hijyen',
    'Aktivite': 'aktivite', 'Veteriner': 'veteriner',
    'Diğer': 'diger', 'Raporlar': 'raporlar',
  }

  const initialSection = SECTION_NAME_MAP[searchParams?.get('tab') ?? ''] ?? null
  const [openSections, setOpenSections] = useState<Set<string>>(
    initialSection ? new Set([initialSection]) : new Set()
  )

  // URL'den gelen tab varsa o bölüme scroll et
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (!tabParam) return
    const sectionId = TAB_URL_MAP[tabParam]
    if (!sectionId) return
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
    return () => clearTimeout(timer)
  }, [])
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [timelineFilter, setTimelineFilter] = useState('Aşı & Parazit')
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [isSmartScannerOpen, setIsSmartScannerOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any>(null)
  const [wizardInitialCategory, setWizardInitialCategory] = useState<TaskCategory | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [trackerRefreshKey, setTrackerRefreshKey] = useState(0)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (timelineScrollRef.current) {
      const todayElement = timelineScrollRef.current.querySelector('[data-istoday="true"]');
      if (todayElement) {
        setTimeout(() => {
          todayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 100);
      }
    }
  }, []);
  
  const [lostWizardOpen, setLostWizardOpen] = useState(false)
  const [markFoundLoading, setMarkFoundLoading] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)



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

  const handleMarkFound = async () => {
    if (!confirm('Dostunuz bulundu mu? İlan kapatılacaktır.')) return;
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

  const localOverdue = (localSchedules ?? []).filter((s: any) => s.status !== 'done' && getTaskDateTime(s) < new Date()).length

  const openWizardWithCategory = (cat: TaskCategory) => {
    setWizardInitialCategory(cat)
    setTaskToEdit(null)
    setTaskWizardOpen(true)
  }

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
      
      const now = new Date()
      const dateOnlyStr = dueDateStr.includes('T') ? dueDateStr.split('T')[0] : dueDateStr
      const timeStr = dueTimeStr || '12:00:00'
      const taskDateTime = new Date(`${dateOnlyStr}T${timeStr}`)
      
      const isOverdue = taskDateTime < now
      
      let badge = null;
      
      if (isOverdue) {
        const diffMs = now.getTime() - taskDateTime.getTime()
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

  const handleDeleteTask = async (id: string) => {
    setLocalSchedules(prev => prev.filter(s => s.id !== id))
    setActiveMenuId(null)
    if (!id.toString().startsWith('mock-')) {
      try {
        if (isPlanSource(id)) {
          await fetch(`/api/plans/${getRealPlanId(id)}`, { method: 'DELETE' })
        } else {
          await createBrowserSupabaseClient().from('health_schedules').delete().eq('id', id)
        }
        router.refresh()
      } catch {}
    }
    setTrackerRefreshKey(prev => prev + 1)
  }

  const handleMarkCompleted = async (id: string) => {
    setActiveMenuId(null);
    const item = localSchedules.find(s => s.id === id);
    if (!item) return;

    const completeTaskInDb = async () => {
      setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done' } : s));
      if (!id.toString().startsWith('mock-')) {
        try {
          if (isPlanSource(id)) {
            await fetch(`/api/plans/${getRealPlanId(id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' })
            })
          } else {
            await createBrowserSupabaseClient().from('health_schedules').update({ status: 'completed' }).eq('id', id);
          }
          router.refresh();
        } catch {}
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
    setLocalSchedules(prev => prev.map(s => {
      if (s.id !== id) return s
      const d = new Date(s.due_date)
      d.setDate(d.getDate() + 1)
      return { ...s, due_date: d.toISOString() }
    }))
    setActiveMenuId(null)
    const item = localSchedules.find(s => s.id === id)
    if (item && !id.toString().startsWith('mock-')) {
      const d = new Date(item.due_date); d.setDate(d.getDate() + 1)
      try {
        if (isPlanSource(id)) {
          await fetch(`/api/plans/${getRealPlanId(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_at: d.toISOString() })
          })
        } else {
          await createBrowserSupabaseClient().from('health_schedules').update({ due_date: d.toISOString() }).eq('id', id)
        }
        router.refresh()
      } catch {}
    }
    setTrackerRefreshKey(prev => prev + 1)
  }

  const scrollToTasks = () => {
    setTimelineFilter('Aşı & Parazit')
    const tasksElement = document.getElementById('pet-tasks')
    if (tasksElement) {
      tasksElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const toggleSection = (name: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }


  // Build unified timeline
  const timeline: any[] = [
    ...(localSchedules ?? []).filter((r: any) => r.status === 'done' && r.category === 'Medikal').map((r: any) => {
      const isParasite = (r.title || '').toLowerCase().includes('parazit') || (r.sub_category || '').toLowerCase().includes('parazit')
      return { 
        type: isParasite ? 'parasite' : 'vaccine', 
        date: r.due_date, 
        label: r.title || 'Aşı/Parazit', 
        sub: isParasite ? 'Parazit Koruması' : 'Aşı Uygulaması', 
        icon: isParasite ? '🦠' : '💉' 
      }
    }),
    ...(diseases ?? []).map((r: any) => ({ type: 'disease', date: r.diagnosis_date, label: r.disease_name, sub: r.status, icon: '🩺' })),
    ...(medications ?? []).map((r: any) => ({ type: 'medication', date: r.start_date, label: r.medication_name, sub: r.dosage, icon: '💊' })),
    ...(appointments ?? []).map((r: any) => ({ type: 'vet', date: r.scheduled_at?.split('T')[0], label: r.clinics?.name || 'Randevu', sub: r.status, icon: '🏥' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const filterMap: Record<string, string[]> = {
    'Aşı & Parazit': ['vaccine', 'parasite'],
    'Kilo & Boy': ['growth'],
    'Tedaviler': ['disease', 'medication'],
    'Veteriner': ['vet'],
  }

  const filteredTimeline = timeline.filter(e => filterMap[timelineFilter]?.includes(e.type))

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
        {title && <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">{title}</h4>}
        {(!list || list.length === 0) ? (
          customEmptyContent ? customEmptyContent : (
            <div className="py-6 bg-bg-main/50 rounded-[20px] border border-dashed border-border-main text-center flex flex-col items-center gap-2">
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
            <div key={item.id} onClick={() => { setTaskToEdit(item); setTaskWizardOpen(true) }} className={`flex items-center justify-between p-4 ${cardStyle.bg} ${cardStyle.hoverBg} rounded-[20px] transition-colors cursor-pointer`}>
              <div className="flex-1 min-w-0 pr-3">
                <p className={`font-extrabold text-[14px] line-clamp-2 break-words ${cardStyle.textTitle}`}>
                  {item.title || item.vaccines?.name || 'Görev'}
                  {item.sub_category === 'Zorunlu Aşılar' && (
                    <span className="font-normal opacity-80 ml-1">/ {formatFrequency(item.vaccines?.frequency_days, item.vaccines?.frequency_label || item.frequency_label)}</span>
                  )}
                </p>
                {item.sub_category && item.sub_category !== (item.title || item.vaccines?.name) && <p className={`text-[11px] font-semibold ${cardStyle.textSub}`}>{item.sub_category}</p>}
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
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                    <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                    <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary-soft flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                    <div className="border-t border-border-main/30 mx-2 my-1"/>
                    <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
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
          <div className="py-6 bg-bg-main/50 rounded-[20px] border border-dashed border-border-main text-center flex flex-col items-center gap-2 px-4">
            <span className="text-2xl opacity-80">✨</span>
            <p className="text-[13px] font-bold text-text-secondary leading-relaxed">
              Bugün için planlı göreviniz yok. İleri tarihli <span className="text-primary font-black">{upcomingTasks.length}</span> görevinizi görmek için filtreyi &apos;Tüm Zamanlar&apos; olarak değiştirin.
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
      } else if (tabName === 'Beslenme' && (!nutritionLogs || nutritionLogs.length === 0)) {
        setQuickUpdateConfig({
          title: 'Beslenme Bilgisi',
          desc: 'Beslenme görevi planlayabilmek için önce kullanılan mamayı kaydedin.',
          endpoint: `/api/pets/${pet.id}/nutrition/profile`,
          method: 'POST',
          fields: [
            { name: 'food_brand', type: 'text', label: 'Mama Markası', placeholder: 'Örn: Royal Canin', required: true },
            { name: 'food_type', type: 'select', label: 'Mama Türü', options: [{label: 'Kuru Mama', value: 'kuru'}, {label: 'Yaş Mama', value: 'yas'}, {label: 'Ödül Maması', value: 'odul'}], required: true },
            { name: 'daily_grams', type: 'number', label: 'Günlük Tüketim (Gram)', placeholder: 'Örn: 120', required: true }
          ],
          onSuccess: () => handlePlanla('Beslenme')
        });
      } else {
        handlePlanla(tabName);
      }
    };

    if (!hasAnyTasks) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <div className="py-8 px-4 bg-bg-main/50 rounded-[20px] border border-dashed border-border-main text-center flex flex-col items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-tr ${cta?.gradient || 'from-slate-200 to-slate-300'} rounded-2xl flex items-center justify-center shadow-sm mb-1`}>
              <span className="text-2xl">🗓️</span>
            </div>
            <h3 className="font-extrabold text-text-primary text-[15px]">Henüz görev planlanmamış</h3>
            <p className="text-[13px] text-text-secondary max-w-[260px] leading-relaxed mb-2">{cta?.desc || 'Bu kategoride henüz bir görev planlamadınız.'}</p>
            {cta && (
              <button
                onClick={handleCtaClick}
                className="btn-primary min-h-[50px] flex items-center justify-center px-6 text-[13px] font-bold rounded-xl"
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
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
              <button 
                onClick={() => setFilterSheetType('planned')}
                className="text-[12px] font-bold text-primary bg-primary-soft px-3 py-1.5 rounded-xl border border-primary/20 flex items-center gap-1.5 hover:bg-primary hover:text-white transition-colors"
              >
                {plannedTimeFilter === 'Tümü' ? 'Tüm Zamanlar' : plannedTimeFilter}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            {plannedSubCats.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setPlannedSubCatFilter('Tümü')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${plannedSubCatFilter === 'Tümü' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-primary hover:border-primary/30'}`}
                >
                  Tüm Kategoriler
                </button>
                {plannedSubCats.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPlannedSubCatFilter(cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${plannedSubCatFilter === cat ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-primary hover:border-primary/30'}`}
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
              className="w-full py-3.5 bg-bg-main hover:bg-border-main/40 text-text-secondary font-bold text-[13px] rounded-2xl border border-dashed border-border-main transition-colors flex items-center justify-center gap-2"
            >
              {showCompleted ? 'Tamamlanmış Görevleri Gizle' : `Tamamlanmış Görevleri Gör (${filteredCompleted.length})`}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            {showCompleted && (
              <div className="mt-4 animate-fade-in flex flex-col gap-4">
                {(completedTasks.length > 0) && (
                  <div className="flex flex-col gap-3 card-base p-4 border border-[#3c6b65]/20 bg-[#edf7f6]/30 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[13px] font-black text-[#3c6b65] uppercase tracking-widest flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrele</h3>
                      <button 
                        onClick={() => setFilterSheetType('completed')}
                        className="text-[12px] font-bold text-[#3c6b65] bg-[#edf7f6] px-3 py-1.5 rounded-xl border border-[#3c6b65]/30 flex items-center gap-1.5 hover:bg-[#3c6b65] hover:text-white transition-colors"
                      >
                        {completedTimeFilter === 'Tümü' ? 'Tüm Zamanlar' : completedTimeFilter}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    {completedSubCats.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <button
                          onClick={() => setCompletedSubCatFilter('Tümü')}
                          className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${completedSubCatFilter === 'Tümü' ? 'bg-[#3c6b65] text-white border-[#3c6b65] shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-[#3c6b65] hover:border-[#3c6b65]/40'}`}
                        >
                          Tüm Kategoriler
                        </button>
                        {completedSubCats.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setCompletedSubCatFilter(cat)}
                            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${completedSubCatFilter === cat ? 'bg-[#3c6b65] text-white border-[#3c6b65] shadow-sm' : 'bg-bg-main text-text-secondary border-border-main hover:text-[#3c6b65] hover:border-[#3c6b65]/40'}`}
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

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto">
      {generalError && (
        <div role="alert" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl text-center border border-error/20 mx-4 mt-4">
          {generalError}
        </div>
      )}

      {/* Admin Notice Banner */}
      {isAdminView && (
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-primary text-white text-[13px] font-bold px-5 py-4 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-500/15 border border-white/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-lg animate-bounce">🔑</span>
            <span>Yönetici Görünümü: Bu evcil hayvanın bilgilerini görüntülüyorsunuz.</span>
          </div>
          {pet.owner_id && (
            <Link 
              href={`/admin/users/${pet.owner_id}`}
              className="bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all px-4 py-2 rounded-xl text-[12px] font-black tracking-tight self-stretch sm:self-auto text-center"
            >
              Sahip Profiline Dön
            </Link>
          )}
        </div>
      )}

      {/* Back & AI Chat */}
      <div className="flex flex-row items-center justify-between gap-2 -mb-2 w-full">
        <Link 
          href={isAdminView ? (pet.owner_id ? `/admin/users/${pet.owner_id}` : '/admin/pets') : '/owner/dashboard'} 
          className="flex items-center gap-1 sm:gap-2 text-[12.5px] sm:text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
          Dön
        </Link>
        <Link 
          href={`/owner/ai-vet?petId=${pet.id}`}
          className="flex items-center justify-center gap-1.5 min-h-[50px] px-2.5 sm:px-4 rounded-xl bg-primary text-white text-[12px] sm:text-[13px] font-bold hover:bg-primary-hover hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-md shadow-primary/15 whitespace-nowrap shrink-0"
        >
          <span>🧠</span> {pet.name}'{getTurkishGenitiveSuffix(pet.name)} AI Asistanı
        </Link>
      </div>

      {/* ── Pet Hero Kartı ── */}
      <div className="card-base overflow-hidden flex flex-col group/card relative">
        {/* Mor üst şerit */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>

        {/* Hero içerik */}
        <div className="p-4 flex flex-row gap-4 items-center relative">
          {/* Düzenle ikonu */}
          <Link
            href={`/owner/pets/${pet.id}/edit`}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-bg-main border border-border-main flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/40 transition-all z-10"
            title="Profili Düzenle"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </Link>

          {/* Avatar + Sağlık Skoru Halkası */}
          <div className="relative shrink-0">
            {/* Skor halkası (dış) */}
            {(() => {
              const r = 48; const circ = 2 * Math.PI * r
              const fill = circ * (score / 100)
              const scoreColor = score >= 75 ? '#22C55E' : score >= 40 ? '#EAB308' : '#EF4444'
              return (
                <div className="relative w-[108px] h-[108px] flex items-center justify-center">
                  <svg width="108" height="108" viewBox="0 0 108 108" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="54" cy="54" r={r} fill="none" stroke="#F1F5F9" strokeWidth="5"/>
                    <circle cx="54" cy="54" r={r} fill="none" stroke={scoreColor} strokeWidth="5"
                      strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
                  </svg>
                  {/* Avatar */}
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-soft to-white overflow-hidden flex items-center justify-center text-primary text-[32px] font-black ring-2 ring-border-main">
                    {pet.avatar_url
                      ? <Image src={pet.avatar_url} fill={true} sizes="80px" priority={true} className="object-cover" alt={pet.name}/>
                      : pet.name.charAt(0)
                    }
                  </div>
                  {/* Skor metni (sağ üst) */}
                  <div className="absolute top-0 -right-2 z-20 flex flex-col items-center justify-center w-[46px] h-[46px] rounded-full bg-white border-[2.5px] shadow-sm" style={{ borderColor: score >= 75 ? '#22C55E' : score >= 40 ? '#EAB308' : '#EF4444' }}>
                    <span className="text-[12px] font-black leading-none mt-0.5" style={{ color: score >= 75 ? '#22C55E' : score >= 40 ? '#A16207' : '#EF4444' }}>{score}%</span>
                    <span className="text-[10px] font-bold text-text-secondary/80 leading-none whitespace-nowrap mt-[2px] tracking-tight">Sağlık</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Bilgiler */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5 pr-10">
            <h1 className="text-[20px] font-extrabold text-text-primary leading-tight truncate">{pet.name}</h1>
            <p className="text-text-secondary font-medium text-[13px]">
              {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
            </p>
            {/* Chip'ler */}
            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
              {pet.birth_date && (
                <span className="text-[12px] bg-bg-main border border-border-main px-2.5 py-1 rounded-lg font-semibold text-text-secondary">
                  🎂 {age.text}
                </span>
              )}
              {growthRecords && growthRecords[0]?.weight_kg && (
                <span className="text-[12px] bg-bg-main border border-border-main px-2.5 py-1 rounded-lg font-semibold text-text-secondary">
                  {growthRecords[0].weight_kg} kg
                </span>
              )}
              {pet.gender && (
                <span className="text-[12px] bg-bg-main border border-border-main px-2.5 py-1 rounded-lg font-semibold text-text-secondary capitalize">
                  {genderLabel[pet.gender] ?? pet.gender}
                </span>
              )}
              {pet.microchip_no && (
                <span className="text-[12px] bg-bg-main border border-border-main px-2.5 py-1 rounded-lg font-semibold text-text-secondary">
                  📡 Çipli
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alt buton çifti: Paylaş + Acil Durum */}
        <div className="mx-4 mb-4 flex gap-2.5">
          {/* Paylaş */}
          <Link
            href={`/owner/pets/${pet.id}/share`}
            className="flex-1 h-11 rounded-[14px] bg-primary-soft border border-primary/20 flex items-center justify-center gap-2 text-primary font-black text-[13px] hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Paylaş
          </Link>
          {/* Acil Durum */}
          <div className="flex-1">
            <FloatingSOS
              petId={pet.id}
              petName={pet.name}
              vetPhone={pet.vet_phone}
              vetName={pet.vet_name}
              sosContacts={pet.sos_contacts}
              fullWidth={true}
              onLostReport={activeLostReport ? undefined : () => setLostWizardOpen(true)}
              onMarkFound={activeLostReport ? () => { handleMarkFound(); } : undefined}
            />
          </div>
        </div>
      </div>

      {/* ── Profili Zenginleştir Widget ── */}
      {(() => {
        const enrichTasks: { label: string; onClick?: () => void; link?: string }[] = []
        if (!pet.avatar_url) enrichTasks.push({ label: 'Fotoğraf Ekle', link: `/owner/pets/${pet.id}/edit#temel-section` })
        if (!pet.breed) enrichTasks.push({ label: 'Irk Bilgisi Gir', link: `/owner/pets/${pet.id}/edit#temel-section` })
        if (!pet.vet_name) enrichTasks.push({ label: 'Veteriner Bilgisi Gir', link: `/owner/pets/${pet.id}/edit#veteriner-section` })
        if (!localSchedules || !localSchedules.some(s => s.category === 'Medikal')) enrichTasks.push({ label: 'İlk Aşısını Gir', onClick: () => openWizardWithCategory('Medikal') })
        if (!pet.microchip_no) enrichTasks.push({ label: 'Kimlik & Çip Bilgisi', link: `/owner/pets/${pet.id}/edit#veteriner-section` })
        if (!growthRecords || !growthRecords[0]?.weight_kg) enrichTasks.push({ label: 'Kilo & Boy Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Gelişim Bilgisi', desc: 'Gelişimi takip edebilmek için güncel kilo ve boyunu girin.', endpoint: `/api/pets/${pet.id}/growth`, method: 'POST', fields: [{ name: 'weight_kg', type: 'number', label: 'Kilo (kg)', placeholder: 'Örn: 4.5', required: true }, { name: 'height_cm', type: 'number', label: 'Boy (cm)', placeholder: 'Örn: 35.5', required: false }] }) })
        if (!nutritionLogs || nutritionLogs.length === 0) enrichTasks.push({ label: 'Kullandığı Mamayı Ekle', onClick: () => { setOpenSections(prev => new Set(prev).add('Beslenme')); } })
        if (!pet.sos_contacts?.[0]?.phone) enrichTasks.push({ label: 'SOS Ağı Kur', link: `/owner/pets/${pet.id}/edit#sos-section` })
        if (!hasPasskey) enrichTasks.push({ label: 'Biyometrik Giriş Tanımla', link: '/owner/profile?biometric=true' })
        
        if (enrichTasks.length === 0) return null
        const totalTasks = 9
        const completedTasks = totalTasks - enrichTasks.length
        const progress = completedTasks === totalTasks ? 100 : Math.max(15, Math.round((completedTasks / totalTasks) * 100))
        return (
          <div className="card-base border-l-4 border-l-primary shadow-sm bg-gradient-to-br from-white to-primary/5 overflow-hidden">
            <button onClick={() => setEnrichOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left">
              <h2 className="text-[14px] font-extrabold text-text-primary flex items-center gap-2">
                🌟 Profili Zenginleştir
                <span className="text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">% {progress}</span>
              </h2>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-text-secondary shrink-0 transition-transform duration-300 ${enrichOpen ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="px-5 pb-3"><div className="w-full bg-border-main rounded-full h-1.5 overflow-hidden"><div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}/></div></div>
            {enrichOpen && (
              <div className="px-5 pb-5">
                <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">Odi.Pet'in akıllı özelliklerinden tam faydalanmak için aşağıdaki eksik bilgileri tamamlayın.</p>
                <div className="flex flex-wrap gap-2">
                  {enrichTasks.map((t, i) => (
                    t.onClick ? (
                      <button key={i} onClick={t.onClick} className="text-[12px] font-bold px-3 py-2 rounded-xl border border-border-main bg-white text-text-secondary hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-1.5 shadow-sm">
                        <span className="text-[14px] text-primary">+</span> {t.label}
                      </button>
                    ) : (
                      <Link key={i} href={t.link || '#'} className="text-[12px] font-bold px-3 py-2 rounded-xl border border-border-main bg-white text-text-secondary hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-1.5 shadow-sm">
                        <span className="text-[14px] text-primary">+</span> {t.label}
                      </Link>
                    )
                  ))}
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
          initialCategory={wizardInitialCategory}
          onClose={() => { setTaskWizardOpen(false); setTaskToEdit(null); setWizardInitialCategory(null) }}
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
            setWizardInitialCategory(null);
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

      {/* Smart Scanner Modal */}
      {isSmartScannerOpen && (
        <SmartScanner
          petId={pet.id}
          onClose={() => setIsSmartScannerOpen(false)}
          onSave={async (data: any) => {
            const { record_type, parsed } = data
            try {
              if (record_type === 'vaccine_card') {
                await fetch(`/api/pets/${pet.id}/treatments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    disease_name: parsed.title || parsed.vaccine_name || 'Aşı Kaydı',
                    category: 'Aşı Uygulaması',
                    status: 'Tamamlandı',
                    start_date: parsed.date || new Date().toISOString().split('T')[0],
                    clinic_name: parsed.vet_name || '',
                    notes: parsed.lot_number ? 'Lot: ' + parsed.lot_number : '',
                  }),
                })
              } else if (record_type === 'food_packaging') {
                await fetch(`/api/pets/${pet.id}/nutrition/profile`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    food_brand: parsed.food_brand,
                    food_product: parsed.food_product,
                    food_type: parsed.food_type,
                  }),
                })
              } else if (record_type === 'medicine_packaging' || record_type === 'parasite_product') {
                await fetch(`/api/pets/${pet.id}/treatments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    disease_name: parsed.title || parsed.product_name || 'Tedavi Kaydı',
                    category: record_type === 'parasite_product' ? 'İç/Dış Parazit Uygulaması' : 'İlaç Tedavisi',
                    status: 'Tamamlandı',
                    start_date: new Date().toISOString().split('T')[0],
                    notes: parsed.active_ingredient || '',
                  }),
                })
              }
            } catch (err) {
              console.error('Tarama kaydedilemedi:', err)
            } finally {
              setIsSmartScannerOpen(false)
              router.refresh()
            }
          }}
        />
      )}

      {/* ── Layer 2: Görevler & Ajanda (Daima Görünür) ── */}
      <div className="flex flex-col gap-4" id="pet-tasks">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[16px] font-black text-text-primary">Görevler & Ajanda</h2>
            {localOverdue > 0 && (
              <button
                onClick={() => setSelectedDate(new Date(new Date().setHours(0,0,0,0)))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors cursor-pointer"
              >
                <span className="text-[14px]">🚨</span>
                <span className="text-[12px] font-bold">{localOverdue} Gecikmiş</span>
              </button>
            )}
          </div>

          {/* Weekly Timeline Strip */}
          <div ref={timelineScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x mt-1">
            {Array.from({length: 61}).map((_, idx) => {
              const i = idx - 30;
              const date = new Date();
              date.setHours(0,0,0,0);
              date.setDate(date.getDate() + i);
              const isToday = i === 0;
              const isSelected = selectedDate.getTime() === date.getTime();
              const daysTasks = localSchedules.filter((s: any) => {
                const td = getTaskDateTime(s);
                td.setHours(0,0,0,0);
                return td.getTime() === date.getTime();
              });
              return (
                <button key={i} data-istoday={isToday} onClick={() => setSelectedDate(date)} className={`snap-center flex-shrink-0 w-[60px] h-[72px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border-2 ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-main/50 bg-white hover:border-primary/30'} ${isToday && !isSelected ? 'border-text-secondary/20 bg-bg-main/50' : ''}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-primary' : 'text-text-secondary'}`}>{isToday ? 'BGN' : date.toLocaleDateString('tr-TR', {weekday: 'short'})}</span>
                  <span className={`text-[18px] font-black leading-none ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{date.getDate()}</span>
                  <div className="flex gap-1 mt-1.5 h-1.5">
                    {daysTasks.slice(0,3).map((t: any, idx) => {
                      const isDone = t.status === 'done';
                      return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-text-secondary/40' : 'bg-primary'}`} />
                    })}
                    {daysTasks.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-border-main" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected Day Tasks */}
          <div className="bg-white rounded-3xl border border-border-main/60 p-5 shadow-sm min-h-[140px] flex flex-col gap-4">
            {(() => {
              const isToday = selectedDate.getTime() === new Date(new Date().setHours(0,0,0,0)).getTime();
              const dayPrefix = isToday ? 'Bugün' : selectedDate.toLocaleDateString('tr-TR', {weekday: 'long'});
              const now = new Date();
              const overdueTasks = isToday ? localSchedules.filter((s: any) => s.status !== 'done' && getTaskDateTime(s) < now).sort((a,b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime()) : [];
              const dayTasks = localSchedules.filter((s: any) => {
                const td = new Date(getTaskDateTime(s));
                td.setHours(0,0,0,0);
                const isThisDate = td.getTime() === selectedDate.getTime();
                if (!isThisDate) return false;
                if (isToday) return getTaskDateTime(s) >= now || s.status === 'done';
                return true;
              }).sort((a,b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime());

              if (dayTasks.length === 0 && overdueTasks.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-3 opacity-60">
                    <span className="text-4xl">✨</span>
                    <p className="text-[14px] font-bold text-text-secondary">
                      {isToday ? 'Bugün için planlı görev yok. Harika!' : `${dayPrefix} günü için planlı görev yok.`}
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-4">
                  {overdueTasks.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                        <h3 className="text-[12px] font-black text-error uppercase tracking-widest">Gecikmiş Görevler</h3>
                      </div>
                      {overdueTasks.map((t: any) => {
                        const title = t.title || t.vaccines?.name || t.category;
                        return (
                          <div key={t.id} onClick={() => { setTaskToEdit(t); setTaskWizardOpen(true) }} className="flex items-start justify-between group bg-error/5 p-3.5 rounded-2xl border border-error/10 hover:bg-error/10 transition-colors cursor-pointer">
                            <div className="flex items-start gap-3">
                              <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(t.id); }} className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full border-2 border-error/40 hover:bg-error hover:border-error text-transparent hover:text-white transition-colors flex-shrink-0">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
                                <span className="text-[14px] font-bold text-error line-clamp-2 break-words">
                                  {title}
                                  {t.sub_category === 'Zorunlu Aşılar' && (
                                    <span className="font-normal opacity-80 ml-1">/ {formatFrequency(t.vaccines?.frequency_days, t.vaccines?.frequency_label || t.frequency_label)}</span>
                                  )}
                                </span>
                                <span className="text-[11px] font-bold text-error/70 flex items-center gap-1">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  {formatTaskDate(t.due_date, t.due_time, false)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); handlePostpone(t.id); }} className="px-2 py-1.5 bg-white/60 hover:bg-white text-error font-bold text-[11px] rounded-lg border border-error/20 transition-colors shadow-sm whitespace-nowrap">
                                📅 +1 Gün
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === t.id ? null : t.id) }} className="p-1 text-error/50 hover:text-error transition-colors focus:outline-none rounded-lg hover:bg-white/50">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                                </svg>
                              </button>
                              {activeMenuId === t.id && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                                  <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(t.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamla</button>
                                  <div className="border-t border-border-main/30 mx-2 my-1"/>
                                  <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(t); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Regular Tasks Section */}
                  {dayTasks.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {overdueTasks.length > 0 && (
                        <div className="flex items-center gap-2 mb-1 mt-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          <h3 className="text-[12px] font-black text-primary uppercase tracking-widest">{dayPrefix}</h3>
                        </div>
                      )}
                      {dayTasks.map((t: any) => {
                        const isDone = t.status === 'done';
                        const title = t.title || t.vaccines?.name || t.category;
                        return (
                          <div key={t.id} onClick={() => { if(!isDone) { setTaskToEdit(t); setTaskWizardOpen(true); } }} className={`flex items-start justify-between group p-3.5 rounded-2xl border transition-colors ${isDone ? 'bg-text-secondary/5 border-transparent' : 'cursor-pointer bg-white border-border-main/50 hover:border-primary/30 hover:bg-primary/5'}`}>
                            <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                              <button onClick={(e) => { e.stopPropagation(); if(!isDone) handleMarkCompleted(t.id); }} className={`mt-0.5 w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors flex-shrink-0 ${isDone ? 'bg-text-secondary/20 border-text-secondary/20 text-text-secondary' : 'border-primary/40 hover:bg-primary hover:border-primary text-transparent hover:text-white'}`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <span className={`text-[14px] font-bold line-clamp-2 break-words ${isDone ? 'text-text-secondary/60 line-through' : 'text-text-primary'}`}>
                                {title}
                                {t.sub_category === 'Zorunlu Aşılar' && (
                                  <span className="font-normal opacity-80 ml-1">/ {formatFrequency(t.vaccines?.frequency_days, t.vaccines?.frequency_label || t.frequency_label)}</span>
                                )}
                              </span>
                            </div>
                            {!isDone && (
                              <div className="flex items-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handlePostpone(t.id); }} className="px-2 py-1.5 bg-text-secondary/5 hover:bg-text-secondary/10 text-text-secondary font-bold text-[11px] rounded-lg border border-transparent hover:border-border-main transition-colors whitespace-nowrap">
                                  📅 +1 Gün
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === t.id ? null : t.id) }} className="p-1 text-text-secondary/50 hover:text-text-secondary transition-colors focus:outline-none rounded-lg hover:bg-bg-main">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                                  </svg>
                                </button>
                                {activeMenuId === t.id && (
                                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                                    <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(t.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamla</button>
                                    <div className="border-t border-border-main/30 mx-2 my-1"/>
                                    <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(t); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>



      <HealthTracker refreshTrigger={trackerRefreshKey} petId={pet.id} onEditTask={(t) => { setTaskToEdit(t); setTaskWizardOpen(true); }} />

      {pet.gender === 'female' && !pet.is_neutered && (
        <EstrusTracker petId={pet.id} petSpecies={pet.species} />
      )}

      <MinimalGrowthChart 
        records={growthRecords} 
        petSpecies={pet.species as 'cat' | 'dog'}
        petBreed={pet.breed}
        petBirthDate={pet.birth_date}
        petGender={pet.gender as 'male' | 'female' | 'unknown'}
        isNeutered={pet.is_neutered ?? false}
        onAddRecord={() => setQuickUpdateConfig({ 
          title: 'Gelişim Bilgisi', 
          desc: 'Gelişimi takip edebilmek için güncel kilo ve boyunu girin.', 
          endpoint: `/api/pets/${pet.id}/growth`, 
          method: 'POST', 
          fields: [
            { name: 'recorded_at', type: 'date', label: 'Tarih', defaultValue: new Date().toISOString().split('T')[0], required: true },
            { name: 'weight_kg', type: 'number', label: 'Kilo (kg)', placeholder: 'Örn: 4.5', required: true }, 
            { name: 'height_cm', type: 'number', label: 'Boy (cm)', placeholder: 'Örn: 35.5', required: false }
          ] 
        })}
      />

      {pet.birth_date && (
        <HumanAgeCalculator 
          species={pet.species} 
          birthDate={pet.birth_date} 
          weightKg={growthRecords && growthRecords.length > 0 ? growthRecords[0].weight_kg : undefined} 
          petName={pet.name} 
        />
      )}

      {/* ── Layer 2: Sağlık ve Bakım Accordion ── */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-black text-text-primary px-1">Sağlık ve Bakım</h2>
        {([
          { name: 'Sağlık', icon: <FirstAidIcon width={22} height={22} />, color: 'text-red-500', bg: 'bg-red-50' },
          { name: 'Aşı', icon: <VaccineIcon width={22} height={22} />, color: 'text-blue-500', bg: 'bg-blue-50' },
          { name: 'Parazit', icon: <ParasiteIcon width={22} height={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { name: 'Bakım', icon: <ShampooIcon width={22} height={22} />, color: 'text-pink-500', bg: 'bg-pink-50' },
          { name: 'Beslenme', icon: <BowlIcon width={22} height={22} />, color: 'text-orange-500', bg: 'bg-orange-50' },
          { name: 'Hijyen', icon: <ScoopIcon width={22} height={22} />, color: 'text-teal-500', bg: 'bg-teal-50' },
          { name: 'Aktivite', icon: <BoneIcon width={22} height={22} />, color: 'text-green-500', bg: 'bg-green-50' },
          { name: 'Veteriner', icon: <CarrierIcon width={22} height={22} />, color: 'text-purple-500', bg: 'bg-purple-50' },
          { name: 'Diğer', icon: <HouseIcon width={22} height={22} />, color: 'text-gray-500', bg: 'bg-gray-50' },
        ] as Array<{ name: string; icon: React.ReactNode; color: string; bg: string }>).map((module) => {
          const isOpen = openSections.has(module.name)
          const pending = getSchedulesForTab(module.name)
          const overdueCount = pending.filter((s: any) => getTaskDateTime(s) < new Date()).length
          const cta = tabCtaInfo[module.name]
          return (
            <div key={module.name} id={`section-${MODULE_ID_MAP[module.name] ?? module.name}`} className="card-base overflow-hidden border border-border-main/60">
              <button
                onClick={() => toggleSection(module.name)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-main/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${module.bg} flex items-center justify-center ${module.color} shrink-0`}>
                  {module.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] font-extrabold text-text-primary">{module.name}</span>
                  {pending.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {overdueCount > 0 && <span className="text-[11px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">{overdueCount} gecikmiş</span>}
                      {(pending.length - overdueCount) > 0 && <span className="text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">{pending.length - overdueCount} planlandı</span>}
                    </div>
                  )}
                </div>
                {isOpen && (pending.length > 0 || getCompletedSchedulesForTab(module.name).length > 0) && cta && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (module.name === 'Veteriner' && !pet.vet_company && !pet.vet_name && !pet.vet_phone && !pet.vet_email) {
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
                      } else if (module.name === 'Beslenme' && (!nutritionLogs || nutritionLogs.length === 0)) {
                        setQuickUpdateConfig({
                          title: 'Beslenme Bilgisi',
                          desc: 'Beslenme görevi planlayabilmek için önce kullanılan mamayı kaydedin.',
                          endpoint: `/api/pets/${pet.id}/nutrition/profile`,
                          method: 'POST',
                          fields: [
                            { name: 'food_brand', type: 'text', label: 'Mama Markası', placeholder: 'Örn: Royal Canin', required: true },
                            { name: 'food_type', type: 'select', label: 'Mama Türü', options: [{label: 'Kuru Mama', value: 'kuru'}, {label: 'Yaş Mama', value: 'yas'}, {label: 'Ödül Maması', value: 'odul'}], required: true },
                            { name: 'daily_grams', type: 'number', label: 'Günlük Tüketim (Gram)', placeholder: 'Örn: 120', required: true }
                          ],
                          onSuccess: () => handlePlanla('Beslenme')
                        });
                      } else {
                        handlePlanla(module.name);
                      }
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-[10px] text-[12px] font-bold hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Ekle
                  </button>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-text-secondary shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {isOpen && (
                <div className="border-t border-border-main/40 p-4 flex flex-col gap-5 animate-fade-in">
                  {/* Aşı: Smart Scan banner */}
                  {module.name === 'Aşı' && (
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg flex flex-col items-center text-center gap-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 text-white shadow-sm z-10">
                        <VaccineIcon width={24} height={24} />
                      </div>
                      <div className="z-10">
                        <h3 className="font-extrabold text-white text-[16px] mb-1">Aşı Kayıtlarınızı Kolayca Yönetin</h3>
                        <p className="text-[13px] text-white/90 leading-relaxed">Smart Scan ile aşı belgelerinizi tarayarak kayıtlarınızı otomatik güncelleyin.</p>
                      </div>
                      <button onClick={() => setIsSmartScannerOpen(true)} className="w-full bg-white text-indigo-700 py-3 text-[13px] font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-colors z-10">
                        Belge Tara
                      </button>
                    </div>
                  )}

                  {/* Veteriner: klinik bilgisi ve randevular */}
                  {module.name === 'Veteriner' && (pet.vet_company || pet.vet_name || pet.vet_phone || pet.vet_email) && (
                    <div className="card-base p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Klinik Veterinerim</h3>
                        <button onClick={handleEditVetInfo} className="text-[12px] font-bold text-primary hover:underline">Düzenle</button>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-bg-main rounded-xl border border-border-main">
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-[22px] shrink-0">🩺</div>
                        <div className="flex-1">
                          {pet.vet_company && <p className="font-bold text-text-primary">{pet.vet_company}</p>}
                          {pet.vet_name && <p className="font-semibold text-text-secondary text-[13px]">{pet.vet_name}</p>}
                          {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-primary font-semibold hover:underline text-[13px] block mt-0.5">{pet.vet_phone}</a>}
                        </div>
                        {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="btn-primary text-[12px] py-2 px-3 shrink-0">Ara</a>}
                      </div>
                      {appointments && appointments.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Son Randevular</h4>
                          <div className="flex flex-col gap-2">
                            {appointments.map((apt: any) => (
                              <div key={apt.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border-main">
                                <div>
                                  <p className="font-bold text-text-primary text-[13px]">{apt.clinics?.name || 'Klinik'}</p>
                                  <p className="text-[11px] text-text-secondary">{new Date(apt.scheduled_at).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary capitalize">{apt.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Link href={`/owner/ai-vet?petId=${pet.id}`} className="mt-3 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary-hover transition-colors">
                        🤖 {pet.name}&apos;e Özel AI Vet Chat&apos;e Sor
                      </Link>
                    </div>
                  )}

                  {/* Beslenme: Aktif mama ve porsiyon bilgisi */}
                  {module.name === 'Beslenme' && nutritionLogs && nutritionLogs.length > 0 && (
                    <div className="card-base p-4 bg-orange-50/40 border border-orange-100/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-black text-orange-800 uppercase tracking-widest">Kayıtlı Beslenme Planı</span>
                        <Link href={`/owner/pets/${pet.id}/nutrition`} className="text-[12px] font-bold text-primary hover:underline">Düzenle</Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[20px]">🍖</div>
                        <div>
                          <p className="font-bold text-text-primary text-[14px]">{nutritionLogs[0].food_brand || 'Markasız'} ({nutritionLogs[0].food_product || 'Çeşit Belirtilmedi'})</p>
                          <p className="text-[12px] text-text-secondary">Günlük Tüketim: <span className="font-extrabold text-orange-700">{nutritionLogs[0].daily_grams || 0} g</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diğer: SOS ağı ve belge kasası */}
                  {module.name === 'Diğer' && (
                    <>
                      <FamilyTab petId={pet.id} petName={pet.name} plan={subscription?.plan ?? 'free'} initialSos={pet.sos_contacts} />
                      <div className="card-base p-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-cyan-50 rounded-[20px] flex items-center justify-center text-[28px] mb-3 shadow-sm">🚧</div>
                        <h3 className="font-extrabold text-text-primary text-[16px] mb-1.5">Dijital Belge Kasası</h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed max-w-[260px]">Pasaport, aşı karnesi ve lab sonuçları yükleme modülü çok yakında aktif olacak.</p>
                      </div>
                    </>
                  )}

                  {/* CTA Kartı Kaldırıldı - Artık görev yoksa empty state altında veya module header'da + Ekle olarak gösteriliyor */}
                  {renderTabFiltersAndTasks(module.name)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Layer 3: Ek Bilgiler ve Araçlar ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-black text-text-primary px-1">Ek Bilgiler ve Araçlar</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'Galeri', label: 'Galeri', icon: '📸', gradient: 'from-blue-500 to-indigo-500' },
            { id: 'Eşleştirme', label: 'Eşleştirme', icon: '❤️', gradient: 'from-rose-400 to-pink-500' },
            { id: 'Bütçe', label: 'Bütçe', icon: '💰', gradient: 'from-emerald-400 to-teal-500' },
            { id: 'Sahiplendir', label: 'Sahiplendir', icon: '🏠', gradient: 'from-amber-400 to-orange-500' },
            { id: 'Raporlar', label: 'Raporlar', icon: '📊', gradient: 'from-violet-500 to-purple-600' },
            { id: 'Kayip', label: 'Kayıp İlanı', icon: '🚨', gradient: 'from-red-500 to-rose-600' },
          ]).map((item) => {
            const isActive = openSections.has(item.id)
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Kayip') {
                    setLostWizardOpen(true)
                  } else {
                    toggleSection(item.id)
                  }
                }}
                className={`relative overflow-hidden rounded-[20px] p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm border ${isActive ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'border-border-main/50 bg-white hover:bg-slate-50'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[24px] bg-gradient-to-br ${item.gradient} text-white shadow-inner`}>
                  {item.icon}
                </div>
                <span className={`text-[12px] font-black tracking-tight ${isActive ? 'text-primary' : 'text-text-secondary'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
        {openSections.has('Galeri') && <div className="animate-fade-in"><GalleryTab pet={pet} /></div>}
        {openSections.has('Eşleştirme') && <div className="animate-fade-in"><MatchTab pet={pet} /></div>}
        {openSections.has('Bütçe') && <div className="animate-fade-in"><BudgetTab pet={pet} /></div>}
        {openSections.has('Sahiplendir') && <div className="animate-fade-in"><AdoptionTab pet={pet} /></div>}
        {openSections.has('Raporlar') && <div className="animate-fade-in"><ReportsTab petId={pet.id} petName={pet.name} plan={subscription?.plan ?? 'free'} payments={payments ?? []} /></div>}

        {/* Veteriner Bilgileri */}
        {(pet.vet_company || pet.vet_name || pet.vet_phone || pet.vet_email) && (
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Veteriner Bilgileri</h3>
              <button onClick={handleEditVetInfo} className="text-[12px] font-bold text-primary hover:underline">Düzenle</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-[20px] shrink-0">🩺</div>
              <div>
                {pet.vet_company && <p className="font-bold text-text-primary">{pet.vet_company}</p>}
                {pet.vet_name && <p className="font-semibold text-text-secondary text-[14px]">{pet.vet_name}</p>}
                {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-[14px] text-primary font-semibold hover:underline block mt-0.5">{pet.vet_phone}</a>}
                {pet.vet_email && <a href={`mailto:${pet.vet_email}`} className="text-[14px] text-primary font-semibold hover:underline block">{pet.vet_email}</a>}
              </div>
            </div>
          </div>
        )}

        {/* Irka Özel Sağlık Rehberi */}
        <BreedHealthCard petName={pet.name} breed={pet.breed} />

        {/* Alerjiler — sadece veri varsa */}
        {allergies && allergies.length > 0 && (
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Alerjiler</h3>
            <div className="flex flex-wrap gap-2">
              {allergies.map((a: any) => <span key={a.id} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-[12px] font-bold border border-red-100">{a.trigger_name}</span>)}
            </div>
          </div>
        )}
      </div>


      {/* ── Time Filter Bottom Sheet ── */}
      {filterSheetType && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end" onClick={() => setFilterSheetType(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-fade-in relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-border-main rounded-full mx-auto mb-6 opacity-50"></div>
            <h3 className="text-[18px] font-black text-center text-text-primary mb-6 flex items-center justify-center gap-2">
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
                  <span className={`text-[15px] ${isActive ? 'font-black' : 'font-bold'}`}>{opt}</span>
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




      {lostWizardOpen && (
        <LostPetWizard 
          pet={pet}
          onComplete={() => { setLostWizardOpen(false); router.refresh(); }}
          onCancel={() => setLostWizardOpen(false)}
        />
      )}



    </div>
  )
}
