'use client'

import Link from 'next/link'
import FamilyTab from './FamilyTab'
import ReportsTab from './ReportsTab'
import InsuranceWidget from '@/components/insurance/InsuranceWidget'
import SmartTaskWizard from '@/components/tasks/SmartTaskWizard'
import { TaskCategory } from '@/lib/tasks/taskDefaults'
import { FirstAidIcon, VaccineIcon, ShampooIcon, BowlIcon, CarrierIcon, ScoopIcon, BoneIcon, HouseIcon } from '@/components/icons/PetIcons'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function QuickUpdateModal({ petId, config, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.target)
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
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} className="input-base py-3 text-[14px]" required={f.required} />
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

const TABS = ['Özet', 'Sağlık', 'Aşı', 'Bakım', 'Beslenme', 'Hijyen', 'Aktivite', 'Veteriner', 'Diğer', 'Raporlar'] as const
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

/** Tab'a ait CTA bilgileri */
const TAB_CTA_INFO: Record<string, { icon: React.ReactNode; btnLabel: string; desc: string; title: string; gradient: string }> = {
  'Sağlık':    { icon: <FirstAidIcon width={28} height={28} />, btnLabel: 'Sağlık Görevi Planla', desc: 'Kilo ölçümü, semptom takibi, ilaç kullanımı planlayın.', title: 'Sağlık Takibi', gradient: 'from-red-100 to-rose-50' },
  'Aşı':       { icon: <VaccineIcon width={28} height={28} />, btnLabel: 'Aşı / Parazit Görevi Planla', desc: 'Aşı ve parazit koruma hatırlatmaları oluşturun.', title: 'Aşı Takibi', gradient: 'from-blue-100 to-sky-50' },
  'Bakım':     { icon: <ShampooIcon width={28} height={28} />, btnLabel: 'Bakım Görevi Planla', desc: 'Tırnak kesimi, banyo ve tüy bakımı planlayın.', title: 'Bakım Rutini', gradient: 'from-pink-100 to-fuchsia-50' },
  'Beslenme':  { icon: <BowlIcon width={28} height={28} />, btnLabel: 'Beslenme Görevi Planla', desc: 'Mama siparişi ve diyet değişikliği planlayın.', title: 'Beslenme Planı', gradient: 'from-orange-100 to-amber-50' },
  'Hijyen':    { icon: <ScoopIcon width={28} height={28} />, btnLabel: 'Hijyen Görevi Planla', desc: 'Kum kabı temizleme, tuvalet eğitimi ve ortam hijyeni planlayın.', title: 'Hijyen Takibi', gradient: 'from-teal-100 to-emerald-50' },
  'Aktivite':  { icon: <BoneIcon width={28} height={28} />, btnLabel: 'Aktivite Görevi Planla', desc: 'Yürüyüş, oyun ve egzersiz rutinleri oluşturun.', title: 'Aktivite Planı', gradient: 'from-green-100 to-lime-50' },
  'Veteriner': { icon: <CarrierIcon width={28} height={28} />, btnLabel: 'Veteriner Görevi Planla', desc: 'Genel kontrol ve takip randevuları oluşturun.', title: 'Veteriner Takibi', gradient: 'from-purple-100 to-indigo-50' },
  'Diğer':     { icon: <HouseIcon width={28} height={28} />, btnLabel: 'Diğer Görev Planla', desc: 'Diğer kategori görevleri ve hatırlatmaları oluşturun.', title: 'Diğer Görevler', gradient: 'from-gray-100 to-slate-50' },
}

export default function PetDetailClient({ pet, age, score, overdue, schedules, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, payments, subscription }: any) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Özet')
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [timelineFilter, setTimelineFilter] = useState('Aşı & Parazit')
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any>(null)
  const [wizardInitialCategory, setWizardInitialCategory] = useState<TaskCategory | null>(null)
  const [taskPeriodFilter, setTaskPeriodFilter] = useState<'week' | 'all' | 'overdue' | 'done'>('week')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  
  const [localSchedules, setLocalSchedules] = useState<any[]>(() =>
    schedules ? [...schedules].map((s: any) => ({ ...s, category: s.category === 'Temizlik' ? 'Hijyen' : s.category })).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) : []
  )

  useEffect(() => {
    if (schedules) {
      setLocalSchedules([...schedules].map((s: any) => ({ ...s, category: s.category === 'Temizlik' ? 'Hijyen' : s.category })).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()))
    }
  }, [schedules])

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

  const getSchedulesForPeriod = (period: 'week' | 'all' | 'overdue' | 'done') => {
    const now = new Date()
    
    return localSchedules.filter((s: any) => {
      if (period === 'done') return s.status === 'done'
      if (s.status === 'done') return false
      
      try {
        const d = new Date(s.due_date)
        
        if (period === 'overdue') return d < now
        
        // For planned tasks (week/all), we show tasks that are NOT overdue
        if (d < now) return false
        
        if (period === 'all') return true
        
        const end = new Date(now)
        if (period === 'week') end.setDate(now.getDate() + 7)
        
        return d <= end
      } catch { return false }
    }).sort((a: any, b: any) => {
      if (period === 'done') return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }

  const formatTaskDate = (dueDateStr: string, isDone?: boolean) => {
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
      
      const today = new Date()
      today.setHours(0,0,0,0)
      const targetDate = new Date(d)
      targetDate.setHours(0,0,0,0)
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      let badge = null;
      if (diffDays === 0) badge = <span className="text-orange-600 ml-1.5 font-bold tracking-wide">» Bugün</span>;
      else if (diffDays === 1) badge = <span className="text-primary ml-1.5 font-bold tracking-wide">» Yarın</span>;
      else if (diffDays === -1) badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» Dün</span>;
      else if (diffDays < -1) badge = <span className="text-red-600 ml-1.5 font-bold tracking-wide">» {Math.abs(diffDays)} gün gecikti</span>;
      else if (diffDays > 1) badge = <span className="text-primary ml-1.5 font-bold tracking-wide">» {diffDays} gün kaldı</span>;
      
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
        await (await import('@/lib/supabase/client')).createBrowserSupabaseClient().from('health_schedules').delete().eq('id', id)
        router.refresh()
      } catch {}
    }
  }

  const handleMarkCompleted = async (id: string) => {
    setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'done' } : s))
    setActiveMenuId(null)
    if (!id.toString().startsWith('mock-')) {
      try {
        await (await import('@/lib/supabase/client')).createBrowserSupabaseClient().from('health_schedules').update({ status: 'completed' }).eq('id', id)
        router.refresh()
      } catch {}
    }
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
        await (await import('@/lib/supabase/client')).createBrowserSupabaseClient().from('health_schedules').update({ due_date: d.toISOString() }).eq('id', id)
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

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto">

      {/* Back */}
      <Link href="/owner/dashboard" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Ana Sayfa'ya Dön
      </Link>

      {/* ── Unified Pet Hero & SOS Card ── */}
      <div className="card-base overflow-hidden flex flex-col group/card relative">
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
        
        {/* Hero Card Content */}
        <div className="p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
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
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[40px] font-black shadow-sm ring-2 ring-border-main shrink-0 transition-transform duration-300 group-hover/card:scale-[1.02]">
            {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full rounded-[22px] object-cover" alt={pet.name}/> : pet.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-[28px] font-extrabold text-text-primary">{pet.name}</h1>
            </div>
            <p className="text-text-secondary font-medium text-[14px]">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}{pet.gender ? ` • ${genderLabel[pet.gender] ?? ''}` : ''}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pet.birth_date && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">🎂 {age.text} ({age.label})</span>}
              {pet.microchip_no && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">📡 {pet.microchip_no}</span>}
              {growthRecords && growthRecords.length > 0 && growthRecords[0].weight_kg && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">⚖️ {growthRecords[0].weight_kg} kg</span>}
              {growthRecords && growthRecords.length > 0 && growthRecords[0].height_cm && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">📏 {growthRecords[0].height_cm} cm</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Profili Zenginleştir Widget ── */}
      {(() => {
        const enrichTasks: { label: string; onClick?: () => void; link?: string }[] = []
        if (!pet.avatar_url) enrichTasks.push({ label: 'Fotoğraf Ekle', onClick: () => setQuickUpdateConfig({ title: 'Fotoğraf Ekle', desc: 'Petinizin profilini tamamlamak için bir fotoğraf yükleyin.', fields: [{ name: 'avatar', type: 'file', label: 'Fotoğraf Seç', required: true }] }) })
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
              setLocalSchedules(prev => {
                const exists = prev.some(s => s.id === newTask.id);
                if (exists) {
                  return prev.map(s => s.id === newTask.id ? newTask : s)
                    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                } else {
                  return [...prev, newTask]
                    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                }
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

      {/* ── Tabs ── */}
      <div id="pet-tabs" className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main overflow-x-auto sticky top-16 z-30">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Reusable Task List Helper ── */}
      {/* (rendered inline per-tab below) */}

      {/* ── Tab: Özet ── */}
      {activeTab === 'Özet' && (
        <div className="flex flex-col gap-4">
          
           {/* Stats */}
          {(() => {
            const now = new Date()
            const localOverdue = localSchedules.filter((s: any) => s.status !== 'done' && new Date(s.due_date) < now).length
            const localPlanned = localSchedules.filter((s: any) => s.status !== 'done' && new Date(s.due_date) >= now).length
            const localCompleted = localSchedules.filter((s: any) => s.status === 'done').length
            
            return (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'overdue', label: 'Gecikmiş', value: `${localOverdue}`, color: localOverdue === 0 ? 'text-green-600' : 'text-red-500' },
                  { id: 'done', label: 'Tamamlanan', value: `${localCompleted}`, color: 'text-primary' },
                  { id: 'week', label: 'Planlanmış', value: `${localPlanned}`, color: 'text-text-primary' },
                ].map(w => (
                  <div key={w.label} 
                       onClick={() => { setTaskPeriodFilter(w.id as any); document.getElementById('pet-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                       className="card-base p-4 flex flex-col items-center text-center cursor-pointer hover:bg-bg-main transition-colors">
                    <p className={`text-[28px] font-black ${w.color}`}>{w.value}</p>
                    <p className="text-[11px] font-black text-text-secondary uppercase tracking-wide mt-0.5">{w.label}</p>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Planlanmış Görevler */}
          <div id="pet-tasks" className="card-base flex flex-col relative z-40">
            <div className="p-5 flex items-center justify-between border-b border-border-main/50">
              <h2 className="text-[15px] font-black text-text-primary flex items-center gap-2">
                📅 {taskPeriodFilter === 'overdue' ? 'Gecikmiş Görevler' : taskPeriodFilter === 'done' ? 'Tamamlanan Görevler' : 'Planlanmış Görevler'}
              </h2>
              <button onClick={() => { setWizardInitialCategory(null); setTaskToEdit(null); setTaskWizardOpen(true) }} className="text-[12px] font-black text-primary flex items-center gap-1 hover:underline bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
                <span className="text-[16px] leading-none">+</span> YENİ
              </button>
            </div>
            
            {/* Period Tabs */}
            <div className="flex border-b border-border-main/50 bg-bg-main/30 overflow-x-auto scrollbar-hide">
              {(['overdue', 'week', 'all', 'done'] as const).map(p => {
                const label = p === 'week' ? 'Gelecek 7 Gün' : p === 'all' ? 'Tüm Zamanlar' : p === 'overdue' ? 'Gecikmiş' : 'Tamamlanan';
                return (
                  <button key={p} onClick={() => setTaskPeriodFilter(p)}
                    className={`flex-1 min-w-max px-4 py-3.5 text-[13px] font-extrabold transition-all border-b-[3px] relative ${taskPeriodFilter === p ? 'border-primary text-primary bg-white' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/50'}`}>
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Task list */}
            <div className="p-5 bg-white">
              {(() => {
                const items = getSchedulesForPeriod(taskPeriodFilter)
                
                const getCatStyle = (cat: string) => {
                  switch(cat) {
                    case 'Saglik': return { bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: '🩺' };
                    case 'Medikal': return { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: '💉' };
                    case 'Bakım': return { bg: 'bg-pink-50 border-pink-100', text: 'text-pink-700', icon: '🧼' };
                    case 'Beslenme': return { bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700', icon: '🦴' };
                    case 'Hijyen':
                    case 'Temizlik': return { bg: 'bg-teal-50 border-teal-100', text: 'text-teal-700', icon: '🧽' };
                    case 'Aktiviteler': return { bg: 'bg-green-50 border-green-100', text: 'text-green-700', icon: '🎾' };
                    case 'Veteriner': return { bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', icon: '🏥' };
                    default: return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: '📋' };
                  }
                }

                return items.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {items.map((item: any) => {
                      const style = getCatStyle(item.category)
                      return (
                        <div key={item.id} className={`flex items-center justify-between p-4 rounded-[20px] border transition-colors ${style.bg} hover:brightness-[0.98]`}>
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[18px] bg-white shadow-sm border ${style.bg.split(' ')[1]}`}>
                              {style.icon}
                            </div>
                            <div>
                              <p className={`font-extrabold text-[14px] ${style.text}`}>{item.title || item.vaccines?.name || 'Görev'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.category && <span className={`text-[10px] font-black uppercase tracking-wider ${style.text} opacity-80`}>{item.category === 'Medikal' ? 'Aşı' : item.category === 'Saglik' ? 'Sağlık' : item.category === 'Temizlik' ? 'Hijyen' : item.category}</span>}
                                <span className={`text-[10px] font-black ${style.text} opacity-50`}>•</span>
                                <span className={`text-[11px] font-bold ${style.text} opacity-80`}>{formatTaskDate(item.due_date, item.status === 'done')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                              className={`${style.text} hover:opacity-70 p-2 transition-opacity focus:outline-none cursor-pointer`}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                              </svg>
                            </button>
                            {activeMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                                <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                                <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                                <div className="border-t border-border-main/30 mx-2 my-1"/>
                                <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-bg-main rounded-3xl flex items-center justify-center text-[28px] shadow-inner mb-2">
                      {taskPeriodFilter === 'overdue' ? '✅' : taskPeriodFilter === 'done' ? '📝' : '📅'}
                    </div>
                    <p className="text-[13px] font-bold text-text-secondary max-w-[200px]">
                      {taskPeriodFilter === 'overdue' ? 'Harika! Gecikmiş herhangi bir göreviniz bulunmuyor.' :
                       taskPeriodFilter === 'done' ? 'Henüz tamamlanmış bir göreviniz bulunmuyor.' :
                       'Bu dönem için planlanmış herhangi bir görev bulunmuyor.'}
                    </p>
                    <button onClick={() => { setWizardInitialCategory(null); setTaskWizardOpen(true) }} className="btn-primary text-[13px] py-2.5 px-5 rounded-xl flex items-center gap-1.5 mt-2">
                      <span className="text-[16px] leading-none">+</span> Yeni Görev Ekle
                    </button>
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
          {(pet.vet_name || pet.vet_phone) && (
            <div className="card-base p-5">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Veteriner</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-[20px] shrink-0">🩺</div>
                <div>
                  {pet.vet_name && <p className="font-bold text-text-primary">{pet.vet_name}</p>}
                  {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-[14px] text-primary font-semibold hover:underline">{pet.vet_phone}</a>}
                </div>
              </div>
            </div>
          )}

          <InsuranceWidget petId={pet.id} plan={subscription?.plan ?? 'free'} />
        </div>
      )}

      {/* ── Tab: Sağlık ── */}
      {activeTab === 'Sağlık' && (() => {
        const cta = TAB_CTA_INFO['Sağlık']
        const tasks = getSchedulesForTab('Sağlık')
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
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Sağlık'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {/* Planned Tasks */}
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Sağlık Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                        className="text-[#3c6b65] hover:text-[#0f3a35] p-2 transition-colors focus:outline-none cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#0f3a35] hover:bg-[#edf7f6] flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Aşı ── */}
      {activeTab === 'Aşı' && (() => {
        const cta = TAB_CTA_INFO['Aşı']
        const tasks = getSchedulesForTab('Aşı')
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
                onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Aşı'])}
                className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
              >
                {cta.btnLabel} →
              </button>
            </div>
            {/* Planned Tasks */}
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Aşı Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || item.vaccines?.name || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                        className="text-[#3c6b65] hover:text-[#0f3a35] p-2 transition-colors focus:outline-none cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#0f3a35] hover:bg-[#edf7f6] flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Beslenme ── */}
      {activeTab === 'Beslenme' && (() => {
        const cta = TAB_CTA_INFO['Beslenme']
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
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Beslenme Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                        className="text-[#3c6b65] p-2 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Bakım ── */}
      {activeTab === 'Bakım' && (() => {
        const cta = TAB_CTA_INFO['Bakım']
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
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Bakım Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                        className="text-[#3c6b65] p-2 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Veteriner ── */}
      {activeTab === 'Veteriner' && (() => {
        const cta = TAB_CTA_INFO['Veteriner']
        const tasks = getSchedulesForTab('Veteriner')
        return (
          <div className="flex flex-col gap-5 animate-fadeInUp">
            <div className="card-base p-5">
              {(pet.vet_name || pet.vet_phone) && (
                <>
                  <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Klinik Veterinerim</h3>
                  <div className="flex items-center gap-4 p-4 bg-bg-main rounded-xl border border-border-main mb-4">
                    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-[28px] shrink-0">🩺</div>
                    <div className="flex-1">
                      {pet.vet_name && <p className="font-bold text-text-primary text-[16px]">{pet.vet_name}</p>}
                      {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-primary font-semibold hover:underline text-[14px]">{pet.vet_phone}</a>}
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
                  if (!pet.vet_name && !pet.vet_phone) {
                    setQuickUpdateConfig({
                      title: 'Veteriner Bilgisi',
                      desc: 'Veteriner görevi planlayabilmek için veteriner bilgisini girin.',
                      fields: [
                        { name: 'vet_name', type: 'text', label: 'Veteriner Adı', placeholder: 'Örn: Dr. Ali Yılmaz', required: true },
                        { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx' }
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
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Veteriner Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }}
                        className="text-[#3c6b65] p-2 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Hijyen ── */}
      {activeTab === 'Hijyen' && (() => {
        const cta = TAB_CTA_INFO['Hijyen']
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
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Hijyen Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }} className="text-[#3c6b65] p-2 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Aktivite ── */}
      {activeTab === 'Aktivite' && (() => {
        const cta = TAB_CTA_INFO['Aktivite']
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
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Aktivite Görevleri</h4>
                {tasks.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                    <div>
                      <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                      {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                      <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }} className="text-[#3c6b65] p-2 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                          <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                          <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                          <div className="border-t border-border-main/30 mx-2 my-1"/>
                          <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Diğer ── */}
      {activeTab === 'Diğer' && (
        <div className="flex flex-col gap-5 animate-fadeInUp">
          {/* Diğer Görev CTA */}
          <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-tr ${TAB_CTA_INFO['Diğer'].gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
              {TAB_CTA_INFO['Diğer'].icon}
            </div>
            <div>
              <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{TAB_CTA_INFO['Diğer'].title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{TAB_CTA_INFO['Diğer'].desc}</p>
            </div>
            <button
              onClick={() => openWizardWithCategory(TAB_CATEGORY_MAP['Diğer'])}
              className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl"
            >
              {TAB_CTA_INFO['Diğer'].btnLabel} →
            </button>
          </div>
          {/* Planlanmış Diğer Görevler */}
          {getSchedulesForTab('Diğer').length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Görevler</h4>
              {getSchedulesForTab('Diğer').map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-[#edf7f6] rounded-[20px] hover:bg-[#e0f4f1] transition-colors">
                  <div>
                    <p className="font-extrabold text-[14px] text-[#0f3a35]">{item.title || 'Görev'}</p>
                    {item.sub_category && <p className="text-[11px] text-[#3c6b65] font-semibold">{item.sub_category}</p>}
                    <p className="text-[11px] text-[#5a8680] font-semibold mt-0.5">{formatTaskDate(item.due_date, item.status === 'done')}</p>
                  </div>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item.id ? null : item.id) }} className="text-[#3c6b65] p-2 cursor-pointer">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200]">
                        <button onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 flex items-center gap-2 cursor-pointer">✓ Tamamlandı İşaretle</button>
                        <button onClick={(e) => { e.stopPropagation(); handlePostpone(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 cursor-pointer">📅 1 Gün Ertele</button>
                        <div className="border-t border-border-main/30 mx-2 my-1"/>
                        <button onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer">✏️ Düzenle</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id) }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center gap-2 cursor-pointer">❌ Sil</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

    </div>
  )
}
