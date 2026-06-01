'use client'

import Link from 'next/link'
import Image from 'next/image'
import FamilyTab from './FamilyTab'
import ReportsTab from './ReportsTab'

import SmartTaskWizard from '@/components/tasks/SmartTaskWizard'
import { TaskCategory } from '@/lib/tasks/taskDefaults'
import { FirstAidIcon, VaccineIcon, ShampooIcon, BowlIcon, CarrierIcon, ScoopIcon, BoneIcon, HouseIcon } from '@/components/icons/PetIcons'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import HumanAgeCalculator from '@/components/pets/HumanAgeCalculator'
import BreedHealthCard from '@/components/pets/BreedHealthCard'
import LostPetWizard from '@/components/pets/LostPetWizard'
import MinimalGrowthChart from '@/components/pets/MinimalGrowthChart'
import { SmartScanner } from '@/components/ui/SmartScanner'

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

const TABS = ['Özet', 'Sağlık', 'Aşı', 'Bakım', 'Beslenme', 'Hijyen', 'Aktivite', 'Veteriner', 'Diğer', 'Raporlar', 'SOS'] as const
type Tab = typeof TABS[number]

/** Tab adı → DB category eşleştirmesi */
const TAB_CATEGORY_MAP: Record<string, TaskCategory> = {
  'Sağlık':    'Saglik',
  'Aşı':       'Medikal',
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
  let cat = s.category === 'Temizlik' ? 'Hijyen' : s.category;
  if (cat === 'Hijyen' && TOILET_TRAINING_SUBS.includes(s.sub_category)) {
    cat = 'Aktiviteler';
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
    'Aşı':       { icon: <VaccineIcon width={28} height={28} />, btnLabel: 'Aşı / Parazit Görevi Planla', desc: 'Aşı ve parazit koruma hatırlatmaları oluşturun.', title: 'Aşı Takibi', gradient: 'from-blue-100 to-sky-50' },
    'Bakım':     { icon: <ShampooIcon width={28} height={28} />, btnLabel: 'Bakım Görevi Planla', desc: isDog ? 'Banyo, tırnak kesimi ve tüy bakımı planlayın.' : 'Tırnak kesimi, kulak temizliği ve tüy bakımı planlayın.', title: 'Bakım Rutini', gradient: 'from-pink-100 to-fuchsia-50' },
    'Beslenme':  { icon: <BowlIcon width={28} height={28} />, btnLabel: 'Beslenme Görevi Planla', desc: 'Mama siparişi ve diyet değişikliği planlayın.', title: 'Beslenme Planı', gradient: 'from-orange-100 to-amber-50' },
    'Hijyen':    { icon: <ScoopIcon width={28} height={28} />, btnLabel: 'Hijyen Görevi Planla', desc: isDog ? 'Çiş pedi temizliği, yatak ve ortam hijyeni planlayın.' : 'Kum kabı temizleme, yatak ve ortam hijyeni planlayın.', title: 'Hijyen Takibi', gradient: 'from-teal-100 to-emerald-50' },
    'Aktivite':  { icon: <BoneIcon width={28} height={28} />, btnLabel: 'Aktivite Görevi Planla', desc: isDog ? 'Yürüyüş, dışarı tuvalet eğitimi, oyun ve egzersiz rutinleri oluşturun.' : 'Kedi tuvalet eğitimi, oyun ve eğitim seansları planlayın.', title: 'Aktivite Planı', gradient: 'from-green-100 to-lime-50' },
    'Veteriner': { icon: <CarrierIcon width={28} height={28} />, btnLabel: 'Veteriner Görevi Planla', desc: 'Genel kontrol ve takip randevuları oluşturun.', title: 'Veteriner Takibi', gradient: 'from-purple-100 to-indigo-50' },
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

export default function PetDetailClient({ pet, age, score, overdue, schedules, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, payments, subscription, activeLostReport }: PetDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Özet')
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [timelineFilter, setTimelineFilter] = useState('Aşı & Parazit')
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [isSmartScannerOpen, setIsSmartScannerOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any>(null)
  const [wizardInitialCategory, setWizardInitialCategory] = useState<TaskCategory | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  
  const [lostWizardOpen, setLostWizardOpen] = useState(false)
  const [markFoundLoading, setMarkFoundLoading] = useState(false)
  const [tagBrand, setTagBrand] = useState<string | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  // SOS State
  const [sosContacts, setSosContacts] = useState<any[]>(pet.sos_contacts && pet.sos_contacts.length > 0 ? pet.sos_contacts : [
    { name: '', phone: '', role: 'primary' },
    { name: '', phone: '', role: 'secondary' }
  ])
  const [savingSos, setSavingSos] = useState(false)
  const [sosStatus, setSosStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function saveSos(e: React.FormEvent) {
    e.preventDefault()
    setSavingSos(true)
    setSosStatus(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: sosContacts }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSosStatus({ type: 'err', text: data.error || 'Hata oluştu' })
        return
      }
      setSosStatus({ type: 'ok', text: 'Acil Durum Ağı başarıyla güncellendi.' })
      pet.sos_contacts = sosContacts
      setTimeout(() => {
        setSosStatus(null)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setSosStatus({ type: 'err', text: err.message || 'Bağlantı hatası' })
    } finally {
      setSavingSos(false)
    }
  }

  const [plannedTimeFilter, setPlannedTimeFilter] = useState<string>('Bugün + Gecikenler')
  const [plannedSubCatFilter, setPlannedSubCatFilter] = useState<string>('Tümü')
  const [completedTimeFilter, setCompletedTimeFilter] = useState<string>('Tümü')
  const [completedSubCatFilter, setCompletedSubCatFilter] = useState<string>('Tümü')
  const [filterSheetType, setFilterSheetType] = useState<'planned' | 'completed' | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    setPlannedTimeFilter('Bugün + Gecikenler')
    setPlannedSubCatFilter('Tümü')
    setCompletedTimeFilter('Tümü')
    setCompletedSubCatFilter('Tümü')
    setShowCompleted(false)
  }, [activeTab])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBrand = localStorage.getItem(`odi_device_brand_${pet.id}_tag`)
      if (savedBrand) setTagBrand(savedBrand)
    }
  }, [pet.id])

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
    try {
      const res = await fetch(`/api/pets/${pet.id}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      })
      if (!res.ok) throw new Error('Hata oluştu')
      router.refresh()
    } catch(err) {
      alert('İşlem başarısız oldu.')
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
    const channel = supabase.channel(`public:health_schedules:pet_${pet.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_schedules', filter: `pet_id=eq.${pet.id}` },
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

  const getSchedulesForTab = (tabName: string) => {
    const dbCat = TAB_CATEGORY_MAP[tabName]
    if (!dbCat) return []
    return localSchedules.filter((s: any) => s.category === dbCat && s.status !== 'done')
  }

  const getCompletedSchedulesForTab = (tabName: string) => {
    const dbCat = TAB_CATEGORY_MAP[tabName]
    if (!dbCat) return []
    return localSchedules.filter((s: any) => s.category === dbCat && s.status === 'done')
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
      const dateText = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
      
      if (isDone) {
        return (
          <span className="inline-flex items-center">
            {dateText} <span className="text-success ml-1.5 font-bold tracking-wide">» Tamamlandı</span>
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
          badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» {mins} dk gecikti</span>
        } else if (diffMins < 1440) { // 24 hours
          const hours = Math.floor(diffMins / 60)
          badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» {hours} saat gecikti</span>
        } else {
          const days = Math.floor(diffMins / 1440)
          badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» {days} gün gecikti</span>
        }
      } else {
        const today = new Date()
        today.setHours(0,0,0,0)
        const targetDate = new Date(d)
        targetDate.setHours(0,0,0,0)
        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        let timeText = ''
        if (dueTimeStr) {
          const parts = dueTimeStr.split(':')
          if (parts.length >= 2) {
            timeText = ` ${parts[0]}:${parts[1]}`
          }
        }
        
        if (diffDays === 0) badge = <span className="text-orange-600 ml-1.5 font-bold tracking-wide">» Bugün{timeText}</span>;
        else if (diffDays === 1) badge = <span className="text-primary ml-1.5 font-bold tracking-wide">» Yarın{timeText}</span>;
        else if (diffDays === -1) badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» Dün{timeText}</span>;
        else if (diffDays < -1) badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» {Math.abs(diffDays)} gün gecikti</span>;
        else badge = <span className="text-primary ml-1.5 font-bold tracking-wide">» {diffDays} gün kaldı</span>;
      }
      
      return (
        <span className="inline-flex items-center">
          {dateText} {badge}
        </span>
      )
    } catch { return dueDateStr }
  }

  const handleDeleteTask = async (id: string) => {
    setLocalSchedules(prev => prev.filter(s => s.id !== id))
    setActiveMenuId(null)
    if (!id.toString().startsWith('mock-')) {
      try {
        await createBrowserSupabaseClient().from('health_schedules').delete().eq('id', id)
        router.refresh()
      } catch {}
    }
  }

  const handleMarkCompleted = async (id: string) => {
    setActiveMenuId(null);
    const item = localSchedules.find(s => s.id === id);
    if (!item) return;

    const completeTaskInDb = async () => {
      setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done' } : s));
      if (!id.toString().startsWith('mock-')) {
        try {
          await createBrowserSupabaseClient().from('health_schedules').update({ status: 'completed' }).eq('id', id);
          router.refresh();
        } catch {}
      }
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
            await createBrowserSupabaseClient().from('health_schedules').update({ 
              status: 'completed',
              notes: brand 
            }).eq('id', id);
          }
          setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done', notes: brand } : s));
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
        await createBrowserSupabaseClient().from('health_schedules').update({ due_date: d.toISOString() }).eq('id', id)
        router.refresh()
      } catch {}
    }
  }

  const scrollToTasks = () => {
    setActiveTab('Özet')
    setTimelineFilter('Aşı & Parazit')
    const tasksElement = document.getElementById('pet-tasks')
    if (tasksElement) {
      tasksElement.scrollIntoView({ behavior: 'smooth' })
    }
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

  const renderTaskList = (title: string, list: any[], emptyMessage?: string) => {
    if ((!list || list.length === 0) && !emptyMessage) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">{title}</h4>
        {(!list || list.length === 0) ? (
          <div className="py-6 bg-bg-main/50 rounded-[20px] border border-dashed border-border-main text-center flex flex-col items-center gap-2">
            <span className="text-2xl opacity-80">🎉</span>
            <p className="text-[13px] font-bold text-text-secondary">{emptyMessage}</p>
          </div>
        ) : (
          list.map((item: any) => {
          const isCompleted = item.status === 'done';
          const now = new Date();
          const isOverdue = !isCompleted && getTaskDateTime(item) < now;

          // Determine styling based on status
          const cardStyle = getTaskCardStyle(isOverdue, isCompleted);

          return (
            <div key={item.id} className={`flex items-center justify-between p-4 ${cardStyle.bg} ${cardStyle.hoverBg} rounded-[20px] transition-colors`}>
              <div>
                <p className={`font-extrabold text-[14px] ${cardStyle.textTitle}`}>{item.title || item.vaccines?.name || 'Görev'}</p>
                {item.sub_category && <p className={`text-[11px] font-semibold ${cardStyle.textSub}`}>{item.sub_category}</p>}
                <p className={`text-[11px] font-semibold mt-0.5 ${cardStyle.textDate}`}>{formatTaskDate(item.due_date, item.due_time, isCompleted)}</p>
              </div>
              <div className="relative">
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

        {renderTaskList(`Planlanmış ${tabName === 'Diğer' ? '' : tabName} Görevleri`, filteredPlanned, 'Bu filtrelere uygun planlanmış görev bulunmuyor.')}
        
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
                {renderTaskList(`Tamamlanmış ${tabName === 'Diğer' ? '' : tabName} Görevleri`, filteredCompleted, 'Bu filtrelere uygun tamamlanmış görev bulunmuyor.')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto">

      {/* Back & AI Chat */}
      <div className="flex flex-row items-center justify-between gap-2 -mb-2 w-full">
        <Link href="/owner/dashboard" className="flex items-center gap-1 sm:gap-2 text-[12.5px] sm:text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
          Dön
        </Link>
        <Link 
          href={`/owner/ai-vet?petId=${pet.id}`}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-primary text-white text-[12px] sm:text-[13px] font-bold hover:bg-primary-hover hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-md shadow-primary/15 whitespace-nowrap shrink-0"
        >
          <span>🧠</span> {pet.name}'{getTurkishGenitiveSuffix(pet.name)} AI Asistanı
        </Link>
      </div>

      {/* ── Unified Pet Hero & SOS Card ── */}
      <div className="card-base overflow-hidden flex flex-col group/card relative">
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
        
        {/* Hero Card Content */}
        <div className="p-5 flex flex-row gap-4 items-start sm:items-center relative">
          <Link 
            href={`/owner/pets/${pet.id}/edit`} 
            className="absolute top-5 right-5 text-text-secondary hover:text-primary transition-colors duration-200 z-10"
            title="Profili Düzenle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </Link>
          <div className="relative w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[40px] font-black shadow-sm ring-2 ring-border-main shrink-0 transition-transform duration-300 group-hover/card:scale-[1.02]">
            {pet.avatar_url ? <Image src={pet.avatar_url} fill={true} className="rounded-[22px] object-cover" alt={pet.name}/> : pet.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h1 className="text-[22px] sm:text-[26px] font-extrabold text-text-primary leading-tight truncate">{pet.name}</h1>
            <p className="text-text-secondary font-medium text-[13px] sm:text-[14px]">
              {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
            </p>
            {pet.birth_date && (
              <div className="flex mt-0.5">
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary flex items-center gap-1">
                  🎂 {age.text}
                </span>
              </div>
            )}
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              {growthRecords && growthRecords.length > 0 && growthRecords[0].weight_kg && (
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary flex items-center gap-1">
                  ⚖️ {growthRecords[0].weight_kg} kg
                </span>
              )}
              {pet.gender && (
                <span className="text-text-secondary font-semibold text-[13.5px] flex items-center gap-1.5 ml-0.5">
                  • {genderLabel[pet.gender] ?? ''}
                </span>
              )}
              {growthRecords && growthRecords.length > 0 && growthRecords[0].height_cm && (
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary flex items-center gap-1">
                  📏 {growthRecords[0].height_cm} cm
                </span>
              )}
              {pet.microchip_no && (
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary flex items-center gap-1">
                  📡 {pet.microchip_no}
                </span>
              )}
            </div>

            {/* Quick Action Buttons removed (moved to FAB) */}
          </div>
        </div>
      </div>

      {/* ── Profili Zenginleştir Widget ── */}
      {(() => {
        const enrichTasks: { label: string; onClick?: () => void; link?: string }[] = []
        if (!pet.avatar_url) enrichTasks.push({ label: 'Fotoğraf Ekle', onClick: () => setQuickUpdateConfig({ title: 'Fotoğraf Ekle', desc: 'Petinizin profilini tamamlamak için bir fotoğraf yükleyin.', fields: [{ name: 'avatar', type: 'file', label: 'Fotoğraf Seç', required: true }] }) })
        if (!pet.breed) enrichTasks.push({ label: 'Irk Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Irk Bilgisi', desc: 'Petinizin ırkına özel sağlık riskleri ve öneriler alabilmek için ırk bilgisini ekleyin.', fields: [{ name: 'breed', type: 'text', label: 'Irk', placeholder: 'Örn: Golden Retriever', required: true }] }) })
        if (!pet.vet_name) enrichTasks.push({ label: 'Veteriner Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Veteriner Bilgisi', desc: 'Sağlık kayıtlarının eşleşebilmesi için veteriner bilgisini girin.', fields: [{ name: 'vet_name', type: 'text', label: 'Veteriner Adı', placeholder: 'Örn: Dr. Ali Yılmaz', required: true }, { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx' }] }) })
        if (!localSchedules || !localSchedules.some(s => s.category === 'Medikal')) enrichTasks.push({ label: 'İlk Aşısını Gir', onClick: () => openWizardWithCategory('Medikal') })
        if (!pet.microchip_no) enrichTasks.push({ label: 'Kimlik & Çip Bilgisi', onClick: () => setQuickUpdateConfig({ title: 'Kimlik & Çip', desc: 'Petinizin yasal kayıt numaralarını sisteme işleyin.', fields: [{ name: 'microchip_no', type: 'text', label: 'Mikroçip Numarası', placeholder: '15 Haneli No', required: true }, { name: 'passport_no', type: 'text', label: 'Pasaport Numarası (Opsiyonel)' }] }) })
        if (!growthRecords || !growthRecords[0]?.weight_kg) enrichTasks.push({ label: 'Kilo & Boy Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Gelişim Bilgisi', desc: 'Gelişimi takip edebilmek için güncel kilo ve boyunu girin.', endpoint: `/api/pets/${pet.id}/growth`, method: 'POST', fields: [{ name: 'weight_kg', type: 'number', label: 'Kilo (kg)', placeholder: 'Örn: 4.5', required: true }, { name: 'height_cm', type: 'number', label: 'Boy (cm)', placeholder: 'Örn: 35.5', required: false }] }) })
        if (!nutritionLogs || nutritionLogs.length === 0) enrichTasks.push({ label: 'Kullandığı Mamayı Ekle', onClick: () => { setActiveTab('Beslenme'); window.scrollTo(0, 0); } })
        if (!pet.sos_contacts?.[0]?.phone) enrichTasks.push({ label: 'SOS Ağı Kur', link: `/owner/pets/${pet.id}/edit?tab=sos` })
        if (enrichTasks.length === 0) return null
        const totalTasks = 7
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
          onSave={async (data) => {
            setIsSmartScannerOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* ── Tabs ── */}
      <div id="pet-tabs" className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-border-main/60 overflow-x-auto sticky top-16 z-30 backdrop-blur-md shadow-sm scrollbar-hide">
        {TABS.map(t => {
          const isActive = activeTab === t;
          return (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)}
              className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20 scale-[1.02] transform' 
                  : 'text-text-secondary font-bold hover:text-text-primary hover:bg-white/40 active:scale-[0.98]'
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>

      {/* ── Reusable Task List Helper ── */}

      {/* ── Tab: Özet ── */}
      {activeTab === 'Özet' && (
        <div className="flex flex-col gap-4">
          
          {/* Smart Card & SOS */}
          {(() => {
            const now = new Date()
            const upcomingTask = localSchedules
              .filter((s: any) => s.status !== 'done')
              .sort((a, b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime())[0];
            
            return (
              <div className="flex flex-col gap-3">
                <div className="card-base p-5 bg-gradient-to-r from-primary-soft to-white border border-primary/20 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl" />
                  {upcomingTask && getTaskDateTime(upcomingTask) <= new Date(new Date().setHours(23, 59, 59, 999)) ? (
                    <>
                      <h3 className="text-[16px] sm:text-[18px] font-extrabold text-text-primary leading-tight relative z-10">
                        Bugün {pet.name}'{getTurkishGenitiveSuffix(pet.name)} {upcomingTask.title || upcomingTask.sub_category} zamanı. <br className="hidden sm:block"/>
                        Tamamladığında işaretle.
                      </h3>
                      <button 
                        onClick={() => handleMarkCompleted(upcomingTask.id)}
                        className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-5 rounded-xl text-[14px] shadow-md shadow-primary/20 transition-all active:scale-95 w-max relative z-10"
                      >
                        İşaretle
                      </button>
                    </>
                  ) : (
                    <h3 className="text-[16px] font-bold text-text-secondary py-2 relative z-10">
                      Bugün yapılması gereken bir şey yok. Her şey yolunda.
                    </h3>
                  )}
                </div>
              </div>
            )
          })()}
          
          {/* Overdue (Gecikmiş) Tasks Notification */}
          {(() => {
            if (localOverdue > 0) {
              return (
                <div className="bg-error/10 border border-error/20 p-4 rounded-2xl flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-error/20 rounded-full flex items-center justify-center text-[18px]">🚨</div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-error leading-tight">{localOverdue} Adet Gecikmiş Görev Var</h3>
                      <p className="text-[13px] font-bold text-error/80 mt-0.5">Lütfen planlarınızı kontrol edin.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('Sağlık')} className="bg-error hover:bg-error/90 text-white font-bold py-2.5 px-4 rounded-xl text-[13px] shadow-sm transition-transform active:scale-95 whitespace-nowrap">
                    Hemen Çöz
                  </button>
                </div>
              )
            }
            return null;
          })()}

          {/* Weekly Timeline Strip */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[15px] font-black text-text-primary px-1">Bu Hafta</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {Array.from({length: 7}).map((_, i) => {
                const date = new Date();
                date.setHours(0,0,0,0);
                date.setDate(date.getDate() + i);
                const isToday = i === 0;
                const isSelected = selectedDate.getTime() === date.getTime();
                
                // Get dots for this day
                const daysTasks = localSchedules.filter((s: any) => {
                  const td = getTaskDateTime(s);
                  td.setHours(0,0,0,0);
                  return td.getTime() === date.getTime();
                });
                
                return (
                  <button key={i} onClick={() => setSelectedDate(date)} className={`snap-center flex-shrink-0 w-[60px] h-[72px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border-2 ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-main/50 bg-white hover:border-primary/30'} ${isToday && !isSelected ? 'border-text-secondary/20 bg-bg-main/50' : ''}`}>
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
            <div className="bg-white rounded-2xl border border-border-main/50 p-4 shadow-sm min-h-[120px]">
              {(() => {
                const dayTasks = localSchedules.filter((s: any) => {
                  const td = getTaskDateTime(s);
                  td.setHours(0,0,0,0);
                  return td.getTime() === selectedDate.getTime();
                }).sort((a,b) => getTaskDateTime(a).getTime() - getTaskDateTime(b).getTime());

                const isToday = selectedDate.getTime() === new Date(new Date().setHours(0,0,0,0)).getTime();
                const dayPrefix = isToday ? 'Bugün' : selectedDate.toLocaleDateString('tr-TR', {weekday: 'long'});

                if (dayTasks.length === 0) {
                  return <div className="h-full flex items-center justify-center text-[14px] font-bold text-text-secondary/70 py-6">{dayPrefix} için görev yok.</div>
                }

                return (
                  <div className="flex flex-col gap-3">
                    {dayTasks.map((t: any) => {
                      const isDone = t.status === 'done';
                      const title = t.title || t.vaccines?.name || t.category;
                      return (
                        <div key={t.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <button onClick={() => { if(!isDone) handleMarkCompleted(t.id) }} className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors flex-shrink-0 ${isDone ? 'bg-text-secondary/20 border-text-secondary/20 text-text-secondary' : 'border-primary/40 hover:bg-primary hover:border-primary text-transparent hover:text-white'}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                            <span className={`text-[14px] font-bold ${isDone ? 'text-text-secondary/60 line-through' : 'text-text-primary'}`}>{isDone ? `${dayPrefix}: ${title} tamamlandı.` : `${dayPrefix}: ${title}`}</span>
                          </div>
                          {!isDone && (
                             <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(t); setTaskWizardOpen(true) }} className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-primary transition-opacity">
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                             </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Alerjiler — sadece veri varsa */}
          {allergies && allergies.length > 0 && (
            <div className="card-base p-5">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Alerjiler</h3>
              <div className="flex flex-wrap gap-2">
                {allergies.map((a: any) => <span key={a.id} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-[12px] font-bold border border-red-100">{a.trigger_name}</span>)}
              </div>
            </div>
          )}

          {/* Vet quick info */}
          {(pet.vet_company || pet.vet_name || pet.vet_phone || pet.vet_email) && (
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Veteriner</h3>
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

          <MinimalGrowthChart 
            records={growthRecords} 
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

          <BreedHealthCard petName={pet.name} breed={pet.breed} />


          {pet.birth_date && (
            <HumanAgeCalculator 
              species={pet.species} 
              birthDate={pet.birth_date} 
              weightKg={growthRecords && growthRecords.length > 0 ? growthRecords[0].weight_kg : undefined} 
              petName={pet.name} 
            />
          )}
        </div>
      )}

      {/* ── Tab: Sağlık ── */}
      {activeTab === 'Sağlık' && (() => {
        const cta = tabCtaInfo['Sağlık']
        const tasks = getSchedulesForTab('Sağlık')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4 relative">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Sağlık'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Sağlık')}
          </div>
        )
      })()}

      {/* ── Tab: Aşı ── */}
      {activeTab === 'Aşı' && (() => {
        const cta = tabCtaInfo['Aşı']
        const tasks = getSchedulesForTab('Aşı')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
          
            {/* Smart Scan Banner */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg flex flex-col items-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl pointer-events-none" />
              
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 text-white shadow-sm z-10">
                <VaccineIcon width={28} height={28} />
              </div>
              <div className="z-10">
                <h3 className="font-extrabold text-white text-[18px] mb-1">Aşı Kayıtlarınızı Kolayca Yönetin</h3>
                <p className="text-[14px] text-white/90 leading-relaxed max-w-[280px] mx-auto">Smart Scan ile aşı belgelerinizi tarayarak kayıtlarınızı otomatik güncelleyin.</p>
              </div>
              <button
                onClick={() => setIsSmartScannerOpen(true)}
                className="w-full bg-white text-indigo-700 py-3.5 text-[14px] font-black rounded-2xl mt-1 shadow-sm hover:bg-slate-50 transition-colors z-10"
              >
                Belge Tara
              </button>
            </div>

            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Aşı'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl mt-2"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Aşı')}
          </div>
        )
      })()}

      {/* ── Tab: Beslenme ── */}
      {activeTab === 'Beslenme' && (() => {
        const cta = tabCtaInfo['Beslenme']
        const tasks = getSchedulesForTab('Beslenme')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Beslenme'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Beslenme')}
          </div>
        )
      })()}

      {/* ── Tab: Bakım ── */}
      {activeTab === 'Bakım' && (() => {
        const cta = tabCtaInfo['Bakım']
        const tasks = getSchedulesForTab('Bakım')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Bakım'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Bakım')}
          </div>
        )
      })()}

      {/* ── Tab: Veteriner ── */}
      {activeTab === 'Veteriner' && (() => {
        const cta = tabCtaInfo['Veteriner']
        const tasks = getSchedulesForTab('Veteriner')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            <div className="card-base p-5">
              {(pet.vet_company || pet.vet_name || pet.vet_phone || pet.vet_email) && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Klinik Veterinerim</h3>
                    <button onClick={handleEditVetInfo} className="text-[12px] font-bold text-primary hover:underline">Düzenle</button>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-bg-main rounded-xl border border-border-main mb-4">
                    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-[28px] shrink-0">🩺</div>
                    <div className="flex-1">
                      {pet.vet_company && <p className="font-bold text-text-primary text-[16px]">{pet.vet_company}</p>}
                      {pet.vet_name && <p className="font-semibold text-text-secondary text-[14px]">{pet.vet_name}</p>}
                      {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-primary font-semibold hover:underline text-[14px] block mt-0.5">{pet.vet_phone}</a>}
                      {pet.vet_email && <a href={`mailto:${pet.vet_email}`} className="text-primary font-semibold hover:underline text-[14px] block">{pet.vet_email}</a>}
                    </div>
                    {pet.vet_phone && (
                      <a href={`tel:${pet.vet_phone}`} className="btn-primary text-[13px] py-2 px-4 shrink-0">Ara</a>
                    )}
                  </div>
                </>
              )}
              {appointments && appointments.length > 0 && (
                <>
                  <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-3">Son Randevular</h4>
                  <div className="flex flex-col gap-2">
                    {appointments.map((apt: any) => (
                      <div key={apt.id} className="flex justify-between items-center p-3 rounded-xl border border-border-main">
                        <div>
                          <p className="font-bold text-text-primary text-[14px]">{apt.clinics?.name || 'Klinik'}</p>
                          <p className="text-[12px] text-text-secondary">{new Date(apt.scheduled_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary-soft text-primary capitalize">{apt.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <Link href={`/owner/ai-vet?petId=${pet.id}`} className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-white font-bold text-[14px] hover:bg-primary-hover transition-colors">
                🤖 {pet.name}'e Özel AI Vet Chat'e Sor
              </Link>
            </div>
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => {
                  if (!pet.vet_company && !pet.vet_name && !pet.vet_phone && !pet.vet_email) {
                    setQuickUpdateConfig({
                      title: 'Veteriner Bilgisi',
                      desc: 'Veteriner görevi planlayabilmek için veteriner bilgisini girin.',
                      fields: [
                        { name: 'vet_company', type: 'text', label: 'Klinik / Şirket Adı', placeholder: 'Örn: Pati Veteriner Kliniği', required: true },
                        { name: 'vet_name', type: 'text', label: 'Veteriner Adı (Opsiyonel)', placeholder: 'Örn: Dr. Ali Yılmaz', required: false },
                        { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx', required: false },
                        { name: 'vet_email', type: 'email', label: 'E-posta (Opsiyonel)', placeholder: 'klinik@email.com', required: false }
                      ],
                      onSuccess: () => {
                        openWizardWithCategory(TAB_CATEGORY_MAP['Veteriner'])
                      }
                    })
                  } else {
                    openWizardWithCategory(TAB_CATEGORY_MAP['Veteriner'])
                  }
                }}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Veteriner')}
          </div>
        )
      })()}

      {/* ── Tab: Hijyen ── */}
      {activeTab === 'Hijyen' && (() => {
        const cta = tabCtaInfo['Hijyen']
        const tasks = getSchedulesForTab('Hijyen')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Hijyen'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Hijyen')}
          </div>
        )
      })()}

      {/* ── Tab: Aktivite ── */}
      {activeTab === 'Aktivite' && (() => {
        const cta = tabCtaInfo['Aktivite']
        const tasks = getSchedulesForTab('Aktivite')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            {/* CTA Card */}
            <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-tr ${cta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                {cta.icon}
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{cta.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{cta.desc}</p>
              </div>
              <button
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Aktivite'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {renderTabFiltersAndTasks('Aktivite')}
          </div>
        )
      })()}

      {/* ── Tab: Diğer ── */}
      {activeTab === 'Diğer' && (
        <div className="flex flex-col gap-5 animate-fadeInUp">
          {/* Diğer Görev CTA */}
          <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-tr ${tabCtaInfo['Diğer'].gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
              {tabCtaInfo['Diğer'].icon}
            </div>
            <div>
              <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{tabCtaInfo['Diğer'].title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{tabCtaInfo['Diğer'].desc}</p>
            </div>
            <button
              onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Diğer'])}
              className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
            >
              {tabCtaInfo['Diğer'].btnLabel} →
            </button>
          </div>
          {renderTabFiltersAndTasks('Diğer')}
          {/* SOS Ağı */}
          <FamilyTab
            petId={pet.id}
            petName={pet.name}
            plan={subscription?.plan ?? 'free'}
            initialSos={pet.sos_contacts}
          />
          {/* Belgeler — Çok Yakında */}
          <div className="card-base p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-cyan-50 rounded-[20px] flex items-center justify-center text-[32px] mb-4 shadow-sm">🚧</div>
            <h3 className="font-extrabold text-text-primary text-[18px] mb-2">Dijital Belge Kasası</h3>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-[280px]">Pasaport, aşı karnesi ve lab sonuçları yükleme modülü çok yakında aktif olacak.</p>
          </div>
        </div>
      )}

      {/* ── Tab: Raporlar ── */}
      {activeTab === 'Raporlar' && (
        <ReportsTab
          petId={pet.id}
          petName={pet.name}
          plan={subscription?.plan ?? 'free'}
          payments={payments ?? []}
        />
      )}

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

      {activeTab === 'SOS' && (
        <div className="flex flex-col gap-5 animate-fadeInUp">
          <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-tr from-red-100 to-rose-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-error/10">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="sirenGradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#F43F5E" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2V4M12 2L9 5M12 2L15 5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                    <rect x="5" y="16" width="14" height="3" rx="1.5" fill="#94A3B8" />
                    <path d="M6 16C6 11.5817 9.58172 8 14 8C14.4183 8 14.75 8.3317 14.75 8.75V16H6Z" fill="url(#sirenGradProfile)" transform="translate(-2, 0)" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-text-primary text-[17px]">Acil Durum (SOS) Ağı</h3>
                  <p className="text-[13px] text-text-secondary mt-0.5 leading-relaxed">
                    Dostunuz kaybolduğunda veya acil bir sağlık durumunda ulaşılabilecek kişileri yönetin.
                  </p>
                </div>
              </div>
            </div>

            <form className="flex flex-col gap-4 relative z-10" onSubmit={saveSos}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-5 bg-error/[0.02] rounded-2xl border border-error/10 hover:border-error/30 transition-colors">
                  <p className="text-[11px] font-black text-error uppercase tracking-widest">Kişi 1 (Birincil)</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Ad Soyad (İsim)</label>
                    <input 
                      type="text" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="Ad Soyad (İsim)" 
                      value={sosContacts[0]?.name || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], name: e.target.value }; setSosContacts(nc); }} 
                      required 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
                    <input 
                      type="tel" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="05XX XXX XX XX" 
                      value={sosContacts[0]?.phone || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], phone: e.target.value }; setSosContacts(nc); }} 
                      required 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-5 bg-bg-main rounded-2xl border border-border-main hover:border-text-secondary/30 transition-colors">
                  <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Kişi 2 (İsteğe Bağlı)</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Ad Soyad / İsim</label>
                    <input 
                      type="text" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="Ad Soyad / İsim" 
                      value={sosContacts[1]?.name || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], name: e.target.value }; setSosContacts(nc); }} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
                    <input 
                      type="tel" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="05XX XXX XX XX" 
                      value={sosContacts[1]?.phone || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], phone: e.target.value }; setSosContacts(nc); }} 
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border-main">
                {sosStatus ? (
                  <div className={`text-[13px] font-bold px-4 py-2 rounded-xl ${sosStatus.type === 'ok' ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                    {sosStatus.text}
                  </div>
                ) : <div/>}
                <button type="submit" disabled={savingSos} className="btn-primary bg-error hover:bg-error/90 border-none py-3.5 px-8 text-[14px] font-black shadow-sm cursor-pointer rounded-xl transition-transform active:scale-95">
                  {savingSos ? 'Kaydediliyor...' : 'Ağı Kaydet'}
                </button>
              </div>
            </form>
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

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="flex flex-col items-end gap-3 mb-2 animate-fade-in origin-bottom">
            <Link
              href={`/owner/pets/${pet.id}/share`}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2"
              onClick={() => setFabOpen(false)}
            >
              <span className="text-[16px]">🤝</span> Emanet Et / Paylaş
            </Link>
            <Link
              href={`/owner/devices/camera?petId=${pet.id}`}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2"
              onClick={() => setFabOpen(false)}
            >
              <span className="animate-pulse">🟢</span> Canlı İzle
            </Link>
            {tagBrand ? (
              <a
                href={
                  tagBrand === 'airtag' ? 'findmy://' :
                  tagBrand === 'smarttag' ? 'smartthings://' :
                  tagBrand === 'tractive' ? 'tractive://' :
                  `/owner/devices/setup?petId=${pet.id}&type=tag`
                }
                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2"
                onClick={() => setFabOpen(false)}
              >
                <span className="text-[16px]">
                  {tagBrand === 'airtag' ? '🍎' : tagBrand === 'smarttag' ? '🌌' : tagBrand === 'tractive' ? '📍' : '🏷️'}
                </span>
                {tagBrand === 'airtag' ? 'AirTag ile Bul' : 
                 tagBrand === 'smarttag' ? 'SmartTag ile Bul' : 
                 tagBrand === 'tractive' ? 'Tractive ile Bul' : 'Künye ile Bul'}
              </a>
            ) : (
              <Link
                href={`/owner/devices/setup?petId=${pet.id}&type=tag`}
                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all"
                onClick={() => setFabOpen(false)}
              >
                Akıllı Künye (TAG)
              </Link>
            )}
            {activeLostReport ? (
              <button
                onClick={() => { handleMarkFound(); setFabOpen(false); }}
                disabled={markFoundLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {markFoundLoading ? 'Kapatılıyor...' : 'Bulundu İşaretle'}
              </button>
            ) : (
              <button
                onClick={() => { setLostWizardOpen(true); setFabOpen(false); }}
                className="bg-gradient-to-r from-error to-rose-600 hover:from-error/90 hover:to-rose-700 text-white py-3 px-5 rounded-2xl text-[13px] font-black tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Kayıp İlanı Ver
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

    </div>
  )
}
