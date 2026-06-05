'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CoachMark from '@/components/ui/CoachMark'

const ALL_ROUTINES = [
  { key: 'grooming',   label: 'Tüy Tarama',      icon: '🐾',  defaultFreq: 'Günlük' },
  { key: 'nail_trim',  label: 'Tırnak Kesimi',    icon: '🦴',  defaultFreq: 'Aylık' },
  { key: 'bath',       label: 'Banyo',             icon: '🛁',  defaultFreq: 'Aylık' },
  { key: 'ear_clean',  label: 'Kulak Temizliği',   icon: '🐕',  defaultFreq: 'Haftalık' },
  { key: 'teeth_brush',label: 'Diş Fırçalama',    icon: '🦷',  defaultFreq: 'Haftalık' },
  { key: 'eye_clean',  label: 'Göz Temizliği',    icon: '🐱',  defaultFreq: 'Günlük' },
]

export default function CareClient({ pet, recentEvents }: { pet: any, recentEvents: any[] }) {
  const [activeTab, setActiveTab] = useState<'Günlük Görevler' | 'Planı Düzenle'>('Günlük Görevler')
  const [loading, setLoading] = useState(false)
  
  const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({})
  const [isPlanSet, setIsPlanSet] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch(`/api/pets/${pet.id}/care-plan`)
        if (res.ok) {
          const data = await res.json()
          if (data.plan_data && Object.keys(data.plan_data).length > 0) {
            setSelectedPlan(data.plan_data)
            setIsPlanSet(true)
          } else {
            // Fallback & Migration: Check local storage
            const saved = localStorage.getItem(`odi_care_plan_${pet.id}`)
            if (saved) {
              const parsed = JSON.parse(saved)
              setSelectedPlan(parsed)
              setIsPlanSet(true)
              // Migrate quietly to DB
              fetch(`/api/pets/${pet.id}/care-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_data: parsed })
              }).catch(console.error)
            }
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingPlan(false)
      }
    }
    loadPlan()
  }, [pet.id])

  const lastDoneMap: Record<string, string> = {}
  recentEvents?.forEach(ev => {
    if (!lastDoneMap[ev.event_type]) lastDoneMap[ev.event_type] = ev.performed_at
  })

  const handleSavePlan = async () => {
    setErrorMsg(null)
    if (Object.keys(selectedPlan).length === 0) {
      setErrorMsg('Lütfen en az bir bakım rutini seçin.')
      return
    }
    setLoadingPlan(true)
    try {
      await fetch(`/api/pets/${pet.id}/care-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_data: selectedPlan })
      })
      localStorage.setItem(`odi_care_plan_${pet.id}`, JSON.stringify(selectedPlan)) // Backup
      setIsPlanSet(true)
      setActiveTab('Günlük Görevler')
    } catch (err) {
      setErrorMsg('Kaydedilirken hata oluştu.')
    } finally {
      setLoadingPlan(false)
    }
  }

  if (loadingPlan) {
    return <div className="p-10 text-center text-text-secondary text-[14px]">Bakım planı yükleniyor...</div>
  }

  const handleCompleteTask = async (taskKey: string) => {
    setLoading(true)
    try {
      await fetch(`/api/pets/${pet.id}/care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: taskKey }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!isPlanSet) {
    return (
      <div className="flex flex-col gap-6 pb-20 w-full mx-auto animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {pet.avatar_url ? <Image src={pet.avatar_url} alt="" fill={true} className="object-cover" sizes="64px" /> : <span className="text-[28px]">🛁</span>}
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Bakım Planı Kurulumu</h1>
            <p className="text-text-secondary font-medium">{pet.name} için hangi bakımları takip edeceksin?</p>
          </div>
        </div>

        <div className="card-base p-6">
          <p className="text-[13px] font-bold text-text-secondary mb-4">Takip etmek istediğiniz rutinleri seçin ve sıklığını belirleyin.</p>
          
          <div className="flex flex-col gap-3">
            {ALL_ROUTINES.map(r => {
              const isSelected = !!selectedPlan[r.key]
              return (
                <div key={r.key} className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-primary bg-primary/5' : 'border-border-main bg-white hover:border-primary/40'}`}>
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => {
                    const newPlan = { ...selectedPlan }
                    if (isSelected) delete newPlan[r.key]
                    else newPlan[r.key] = r.defaultFreq
                    setSelectedPlan(newPlan)
                  }}>
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-border-main'}`}>
                      {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className="text-[24px]">{r.icon}</span>
                    <span className="font-bold text-text-primary text-[15px]">{r.label}</span>
                  </div>
                  
                  {isSelected && (
                    <select 
                      className="input-base py-2 px-3 text-[12px] min-w-[120px]"
                      value={selectedPlan[r.key]}
                      onChange={(e) => setSelectedPlan({...selectedPlan, [r.key]: e.target.value})}
                    >
                      <option value="Günlük">Günlük</option>
                      <option value="Haftalık">Haftalık</option>
                      <option value="Aylık">Aylık</option>
                      <option value="İhtiyaç Halinde">İhtiyaç Halinde</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>

          {errorMsg && <p className="text-error text-[13px] font-bold mt-4 text-center">{errorMsg}</p>}

          <button onClick={handleSavePlan} className="btn-primary w-full mt-4 py-4 shadow-lg shadow-primary/20">
            Planı Oluştur ve Başla
          </button>
        </div>
      </div>
    )
  }

  // Aktif plan dashboard'u
  const plannedRoutines = ALL_ROUTINES.filter(r => selectedPlan[r.key])

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto animate-fadeIn">
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profile Dön
      </Link>
      <div className="flex items-center gap-4 relative">
        <CoachMark
          hintKey="care_routine_intro"
          title="Bakım Rutini"
          message="Tırnak kesimi, banyo, tarama gibi işlemleri burada planla, zamanı gelince hatırlatalım."
          icon="🛁"
          position="bottom"
        />
        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <Image src={pet.avatar_url} alt="" fill={true} className="object-cover" sizes="64px" /> : <span className="text-[28px]">🛁</span>}
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Kişisel Bakım</h1>
          <p className="text-text-secondary font-medium">Toplam {plannedRoutines.length} rutin takip ediliyor</p>
        </div>
      </div>

      <div className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main">
        {['Günlük Görevler', 'Planı Düzenle'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Günlük Görevler' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plannedRoutines.map(task => {
            const lastDone = lastDoneMap[task.key]
            const daysSince = lastDone ? Math.floor((Date.now() - new Date(lastDone).getTime()) / 86400000) : null
            
            // Basit bir uyarı mantığı: Haftalıksa ve 7 günü geçtiyse kırmızı yap
            const freq = selectedPlan[task.key]
            let isOverdue = false
            if (daysSince !== null) {
              if (freq === 'Günlük' && daysSince >= 1) isOverdue = true
              if (freq === 'Haftalık' && daysSince >= 7) isOverdue = true
              if (freq === 'Aylık' && daysSince >= 30) isOverdue = true
            }

            return (
              <div key={task.key} className={`card-base p-5 flex flex-col justify-between gap-4 border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-primary'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">{task.icon}</span>
                    <div>
                      <p className="font-extrabold text-text-primary text-[15px]">{task.label}</p>
                      <p className="text-[12px] font-bold text-text-secondary bg-bg-main px-2 py-0.5 rounded-md inline-block mt-1">{freq}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-border-main pt-4 mt-1">
                  <div className="flex-1">
                    {daysSince === null ? (
                      <p className="text-[11px] font-bold text-orange-500">Henüz yapılmadı</p>
                    ) : daysSince === 0 ? (
                      <p className="text-[11px] font-bold text-green-600">✓ Bugün yapıldı</p>
                    ) : (
                      <p className={`text-[11px] font-bold ${isOverdue ? 'text-red-500' : 'text-text-secondary'}`}>
                        {daysSince} gün önce yapıldı
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleCompleteTask(task.key)} disabled={loading} className="btn-secondary py-2 px-4 text-[12px] bg-white border-border-main hover:border-primary hover:text-primary transition-colors">
                    + Tamamla
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'Planı Düzenle' && (
        <div className="card-base p-6">
          <h3 className="font-bold text-text-primary mb-4">Planı Güncelle</h3>
          <div className="flex flex-col gap-3">
            {ALL_ROUTINES.map(r => {
              const isSelected = !!selectedPlan[r.key]
              return (
                <div key={r.key} className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-primary bg-primary/5' : 'border-border-main bg-white hover:border-primary/40'}`}>
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => {
                    const newPlan = { ...selectedPlan }
                    if (isSelected) delete newPlan[r.key]
                    else newPlan[r.key] = r.defaultFreq
                    setSelectedPlan(newPlan)
                  }}>
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-border-main'}`}>
                      {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className="text-[20px]">{r.icon}</span>
                    <span className="font-bold text-text-primary text-[14px]">{r.label}</span>
                  </div>
                  
                  {isSelected && (
                    <select 
                      className="input-base py-1.5 px-2 text-[12px] min-w-[110px]"
                      value={selectedPlan[r.key]}
                      onChange={(e) => setSelectedPlan({...selectedPlan, [r.key]: e.target.value})}
                    >
                      <option value="Günlük">Günlük</option>
                      <option value="Haftalık">Haftalık</option>
                      <option value="Aylık">Aylık</option>
                      <option value="İhtiyaç Halinde">İhtiyaç Halinde</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>
          {errorMsg && <p className="text-error text-[13px] font-bold mt-4 text-center">{errorMsg}</p>}
          <button onClick={handleSavePlan} className="btn-primary w-full mt-4 py-3">
            Değişiklikleri Kaydet
          </button>
        </div>
      )}
    </div>
  )
}
