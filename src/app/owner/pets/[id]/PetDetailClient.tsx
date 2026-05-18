'use client'

import Link from 'next/link'
import FamilyTab from './FamilyTab'
import ReportsTab from './ReportsTab'
import InsuranceWidget from '@/components/insurance/InsuranceWidget'
import VaccineOSClient from './vaccines/VaccineOSClient'
import { useState } from 'react'
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

const TABS = ['Özet', 'Sağlık Geçmişi', 'Beslenme', 'Bakım', 'Veteriner', 'Belgeler', 'Aile', 'Raporlar'] as const
type Tab = typeof TABS[number]

export default function PetDetailClient({ pet, age, score, overdue, upcoming, schedules, vaccineRecords, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, payments, subscription, setupProfile, templates }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('Özet')
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [timelineFilter, setTimelineFilter] = useState('Aşı & Parazit')

  const switchToVaccines = () => {
    setActiveTab('Sağlık Geçmişi')
    setTimelineFilter('Aşı & Parazit')
    // Find the tabs element and scroll to it
    const tabsElement = document.getElementById('pet-tabs')
    if (tabsElement) {
      tabsElement.scrollIntoView({ behavior: 'smooth' })
    }
  }


  // Build unified timeline
  const timeline: any[] = [
    ...(vaccineRecords ?? []).filter((r: any) => r.status === 'completed').map((r: any) => {
      const tmpl = templates.find((t: any) => t.vaccine_code === r.vaccine_code)
      const isParasite = tmpl?.category === 'parasite'
      return { 
        type: isParasite ? 'parasite' : 'vaccine', 
        date: r.administered_at || r.due_at, 
        label: r.vaccine_name, 
        sub: r.vet_name || (isParasite ? 'Parazit Koruması' : 'Aşı Uygulaması'), 
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

      {/* ── Hero Card ── */}
      <div className="card-base overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
        <div className="p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[40px] font-black shadow-sm ring-2 ring-border-main shrink-0">
            {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full rounded-[22px] object-cover" alt={pet.name}/> : pet.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-[28px] font-extrabold text-text-primary">{pet.name}</h1>
              {overdue > 0 && (
                <button onClick={switchToVaccines} className="text-[11px] font-black px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 hover:-translate-y-0.5 transition-all shadow-sm">
                  ⚠ {overdue} Gecikmiş
                </button>
              )}
            </div>
            <p className="text-text-secondary font-medium text-[14px]">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}{pet.gender ? ` • ${genderLabel[pet.gender] ?? ''}` : ''}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pet.birth_date && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">🎂 {age.text} ({age.label})</span>}
              {pet.microchip_no && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">📡 {pet.microchip_no}</span>}
              {growthRecords && growthRecords.length > 0 && growthRecords[0].weight_kg && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">⚖️ {growthRecords[0].weight_kg} kg</span>}
              {growthRecords && growthRecords.length > 0 && growthRecords[0].height_cm && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">📏 {growthRecords[0].height_cm} cm</span>}
            </div>
          </div>
          <Link href={`/owner/pets/${pet.id}/edit`} className="btn-secondary text-[13px] shrink-0">Düzenle</Link>
        </div>
      </div>

      {/* ── Progressive Profiling / Profili Zenginleştir Widget ── */}
      {(() => {
        const tasks: { label: string; onClick?: () => void; link?: string }[] = []
        // Faz 1: Onboarding
        if (!pet.avatar_url) tasks.push({ label: 'Fotoğraf Ekle', onClick: () => setQuickUpdateConfig({ title: 'Fotoğraf Ekle', desc: 'Petinizin profilini tamamlamak için bir fotoğraf yükleyin.', fields: [{ name: 'avatar', type: 'file', label: 'Fotoğraf Seç', required: true }] }) })
        
        // Faz 2: Sağlık & Veteriner
        if (!pet.vet_name) tasks.push({ label: 'Veteriner Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Veteriner Bilgisi', desc: 'Sağlık kayıtlarının eşleşebilmesi için veteriner bilgisini girin.', fields: [{ name: 'vet_name', type: 'text', label: 'Veteriner Adı', placeholder: 'Örn: Dr. Ali Yılmaz', required: true }, { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx' }] }) })
        if (!vaccineRecords || vaccineRecords.length === 0) tasks.push({ label: 'İlk Aşısını Gir', onClick: switchToVaccines })
        
        // Faz 3: Resmi Kayıtlar (Çip & Pasaport)
        if (!pet.microchip_no) tasks.push({ label: 'Kimlik & Çip Bilgisi', onClick: () => setQuickUpdateConfig({ title: 'Kimlik & Çip', desc: 'Petinizin yasal kayıt numaralarını sisteme işleyin.', fields: [{ name: 'microchip_no', type: 'text', label: 'Mikroçip Numarası', placeholder: '15 Haneli No', required: true }, { name: 'passport_no', type: 'text', label: 'Pasaport Numarası (Opsiyonel)' }] }) })
        
        // Faz 4: Beslenme (Kilo, Mama)
        const hasWeight = growthRecords && growthRecords.length > 0 && growthRecords[0].weight_kg;
        const hasNutrition = nutritionLogs && nutritionLogs.length > 0;
        if (!hasWeight) tasks.push({ label: 'Kilo & Boy Bilgisi Gir', onClick: () => setQuickUpdateConfig({ title: 'Gelişim Bilgisi', desc: 'Gelişimi takip edebilmek için güncel kilo ve boyunu girin.', endpoint: `/api/pets/${pet.id}/growth`, method: 'POST', fields: [{ name: 'weight_kg', type: 'number', label: 'Kilo (kg)', placeholder: 'Örn: 4.5', required: true }, { name: 'height_cm', type: 'number', label: 'Boy (cm)', placeholder: 'Örn: 35.5', required: false }] }) })
        if (!hasNutrition) tasks.push({ label: 'Kullandığı Mamayı Ekle', onClick: () => { setActiveTab('Beslenme'); window.scrollTo(0, 0); } })
        
        // Faz 6: SOS & Güvenlik
        const hasSos = pet.sos_contacts && pet.sos_contacts.length > 0 && pet.sos_contacts[0].phone;
        if (!hasSos) {
          tasks.push({ label: 'SOS Ağı Kur', onClick: () => { setActiveTab('Aile'); window.scrollTo(0, 0); } })
        }

        if (tasks.length === 0) return null

        // totalTasks = yukarıda tanımlanan tüm olası kontrol sayısı (7 check)
        const totalTasks = 7
        const completedTasks = totalTasks - tasks.length
        const progress = completedTasks === totalTasks ? 100 : Math.max(15, Math.round((completedTasks / totalTasks) * 100))

        return (
          <div className="card-base p-5 border-l-4 border-l-primary shadow-sm bg-gradient-to-br from-white to-primary/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-extrabold text-text-primary flex items-center gap-2">
                🌟 Profili Zenginleştir 
                <span className="text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">% {progress}</span>
              </h2>
            </div>
            <div className="w-full bg-border-main rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">
              Odi.Pet'in akıllı özelliklerinden tam faydalanmak için aşağıdaki eksik bilgileri tamamlayın.
            </p>
            <div className="flex flex-wrap gap-2">
              {tasks.map((t, i) => (
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
        )
      })()}


      {/* Quick Update Modal */}
      {quickUpdateConfig && (
        <QuickUpdateModal 
          petId={pet.id} 
          config={quickUpdateConfig} 
          onClose={() => setQuickUpdateConfig(null)} 
          onDone={() => setQuickUpdateConfig(null)} 
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

      {/* ── Tab: Özet ── */}
      {activeTab === 'Özet' && (
        <div className="flex flex-col gap-4">
          
          {/* ── Pet Stats Dashboard (Moved from Top) ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Gecikmiş Görev', value: `${overdue}`, sub: overdue === 0 ? 'Harika!' : 'İşlem gerekli', color: overdue === 0 ? 'text-green-600' : 'text-red-500' },
              { label: 'Aşı Kaydı', value: `${vaccineRecords?.length ?? 0}`, sub: 'Toplam kayıt', color: 'text-primary' },
              { label: 'Sağlık Olayı', value: `${diseases?.length ?? 0}`, sub: 'Kayıtlı', color: 'text-text-primary' },
            ].map(w => (
              <div key={w.label} className="card-base p-4 flex flex-col items-center text-center">
                <p className={`text-[28px] font-black ${w.color}`}>{w.value}</p>
                <p className="text-[11px] font-black text-text-secondary uppercase tracking-wide mt-0.5">{w.label}</p>
                <p className="text-[11px] text-text-secondary mt-1">{w.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Upcoming Actions (Moved from Top) ── */}
          {upcoming.length > 0 && (
            <div className="card-base p-5">
              <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Yaklaşan Görevler</h2>
              <div className="flex flex-col gap-2">
                {upcoming.map((s: any) => {
                  const dueDate = s.due_at || s.due_date;
                  const daysLeft = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
                  const isInvalid = isNaN(daysLeft);
                  const cls = daysLeft <= 3 ? 'bg-red-50 border-red-200 text-red-700' : daysLeft <= 7 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border-main bg-bg-main/50">
                      <div>
                        <p className="font-bold text-text-primary text-[14px]">{s.title || s.vaccine_name || s.vaccines?.name || 'Bakım'}</p>
                        <p className="text-[12px] text-text-secondary">{!isInvalid ? new Date(dueDate).toLocaleDateString('tr-TR') : 'Tarih Belirtilmedi'}</p>
                      </div>
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${isInvalid ? 'bg-gray-50 border-gray-200 text-gray-500' : cls}`}>
                        {isInvalid ? '—' : daysLeft === 0 ? 'Bugün' : `${daysLeft} gün`}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button onClick={switchToVaccines} className="block w-full text-center text-primary text-[13px] font-bold mt-4 hover:underline">Tümünü Görüntüle →</button>
            </div>
          )}
          {/* Allergies */}
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

          {/* Insurance Readiness */}
          <InsuranceWidget petId={pet.id} plan={subscription?.plan ?? 'free'} />
        </div>
      )}

      {/* ── Tab: Sağlık Geçmişi ── */}
      {activeTab === 'Sağlık Geçmişi' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.keys(filterMap).map(f => (
              <button key={f} onClick={() => setTimelineFilter(f)}
                className={`px-4 py-2 rounded-full text-[12px] font-bold border transition-all shrink-0 ${timelineFilter === f ? 'bg-primary text-white border-primary' : 'bg-bg-main text-text-secondary border-border-main hover:border-primary/40'}`}>
                {f}
              </button>
            ))}
          </div>

          {timelineFilter === 'Aşı & Parazit' ? (
            <VaccineOSClient 
              pet={pet} 
              setupProfile={setupProfile} 
              vaccineRecords={vaccineRecords} 
              templates={templates} 
              isTab={true}
            />
          ) : timelineFilter === 'Kilo & Boy' ? (
            <div className="card-base p-5">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[14px] font-black text-text-secondary uppercase tracking-widest">Kilo & Boy Gelişimi</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setActiveTab('Raporlar'); window.scrollTo(0,0); }} className="text-[12px] font-bold text-text-secondary bg-border-main/50 px-3 py-1.5 rounded-full hover:bg-border-main transition-colors shadow-sm">Grafiği Gör</button>
                  <button onClick={() => setQuickUpdateConfig({ title: 'Yeni Gelişim Kaydı', desc: 'Güncel kilo ve boy oranlarını girin.', endpoint: `/api/pets/${pet.id}/growth`, method: 'POST', fields: [{ name: 'weight_kg', type: 'number', label: 'Kilo (kg)', placeholder: 'Örn: 4.5', required: true }, { name: 'height_cm', type: 'number', label: 'Boy (cm)', placeholder: 'Örn: 35.5', required: false }] })} className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors shadow-sm">+ Yeni Gir</button>
                </div>
              </div>

              {growthRecords && growthRecords.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-6 p-4 rounded-xl border border-border-main bg-bg-main/50">
                    {growthRecords[0].weight_kg && <div className="text-center"><p className="text-[32px] font-black text-primary">{growthRecords[0].weight_kg}</p><p className="text-[11px] text-text-secondary font-bold uppercase">kg</p></div>}
                    {growthRecords[0].height_cm && <div className="text-center border-l border-border-main pl-6"><p className="text-[32px] font-black text-primary">{growthRecords[0].height_cm}</p><p className="text-[11px] text-text-secondary font-bold uppercase">cm</p></div>}
                    <div className="ml-auto text-right self-end">
                      <p className="text-[12px] text-text-secondary font-medium">Son Güncelleme</p>
                      <p className="text-[13px] font-bold text-text-primary">{new Date(growthRecords[0].recorded_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-[12px] font-black text-text-secondary uppercase mb-3 px-1">Geçmiş Kayıtlar</h4>
                    <div className="flex flex-col gap-2">
                      {growthRecords.map((g: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-border-main hover:bg-bg-main/50 transition-colors">
                           <div className="flex items-center gap-4">
                              <span className="text-[20px]">⚖️</span>
                              <div>
                                <p className="font-bold text-[14px] text-text-primary">{g.weight_kg ? `${g.weight_kg} kg` : ''} {g.height_cm ? `/ ${g.height_cm} cm` : ''}</p>
                                <p className="text-[12px] text-text-secondary">{new Date(g.recorded_at).toLocaleDateString('tr-TR')}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary text-[13px]">Henüz gelişim kaydı bulunmuyor.</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {timelineFilter === 'Tedaviler' && (
                <Link href={`/owner/pets/${pet.id}/treatments`} className="card-base p-4 text-center text-primary font-bold text-[14px] hover:bg-bg-main transition-colors block border border-primary/20 bg-primary/5">
                  🏥 Kapsamlı Tedavi Takip Modülü'nü Aç →
                </Link>
              )}
              {filteredTimeline.length === 0 ? (
                <div className="card-base p-8 text-center text-text-secondary">Bu kategoride kayıt bulunamadı.</div>
              ) : (
                <div className="card-base divide-y divide-border-main overflow-hidden">
                  {filteredTimeline.map((e, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 hover:bg-bg-main/50 transition-colors">
                      <span className="text-[24px] shrink-0 mt-0.5">{e.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-text-primary text-[14px]">{e.label}</p>
                        {e.sub && <p className="text-[12px] text-text-secondary capitalize">{e.sub}</p>}
                      </div>
                      <p className="text-[12px] text-text-secondary font-medium shrink-0">{e.date ? new Date(e.date).toLocaleDateString('tr-TR') : '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Beslenme ── */}
      {activeTab === 'Beslenme' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Beslenme Özeti</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-bg-main rounded-xl text-center border border-border-main">
                <p className="text-[28px] font-black text-primary">{nutritionLogs?.filter((l:any)=>l.food_logged).length ?? 0}</p>
                <p className="text-[11px] text-text-secondary font-bold uppercase mt-1">Son 7 gün mama</p>
              </div>
              <div className="p-4 bg-bg-main rounded-xl text-center border border-border-main">
                <p className="text-[28px] font-black text-blue-500">{nutritionLogs?.filter((l:any)=>l.water_logged).length ?? 0}</p>
                <p className="text-[11px] text-text-secondary font-bold uppercase mt-1">Son 7 gün su</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-dashed border-border-main text-center">
              <p className="text-[22px] mb-1">🛒</p>
              <p className="text-[14px] font-bold text-text-primary mb-1">Otomatik Yenileme</p>
              <p className="text-[12px] text-text-secondary mb-3">Mama stoğu azaldığında otomatik sipariş ver</p>
              <button className="btn-secondary text-[13px] py-2 px-4">Ayarla (Pro)</button>
            </div>
          </div>
          <Link href={`/owner/pets/${pet.id}/nutrition`} className="card-base p-4 text-center text-primary font-bold text-[14px] hover:bg-bg-main transition-colors">
            Tam Beslenme Modülü →
          </Link>
        </div>
      )}

      {/* ── Tab: Bakım ── */}
      {activeTab === 'Bakım' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[20px] flex items-center justify-center text-[32px] mb-4 shadow-sm">🛁</div>
            <h3 className="font-extrabold text-text-primary text-[18px] mb-2">Pırıl Pırıl Bir Bakım Rutini</h3>
            <p className="text-[14px] text-text-secondary mb-6 leading-relaxed max-w-[280px]">
              Tırnak kesimi, tüy tarama, diş fırçalama ve banyo... Dostunuzun tüm kişisel bakım görevlerini planlayın ve oyunlaştırılmış puanlar kazanın.
            </p>
            <Link href={`/owner/pets/${pet.id}/care`} className="btn-primary text-[14px] px-8 py-3 w-full sm:w-auto">
              Bakım Modülüne Git →
            </Link>
          </div>
        </div>
      )}

      {/* ── Tab: Veteriner ── */}
      {activeTab === 'Veteriner' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Klinik Veterinerim</h3>
            {pet.vet_name || pet.vet_phone ? (
              <div className="flex items-center gap-4 p-4 bg-bg-main rounded-xl border border-border-main mb-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-[28px] shrink-0">🩺</div>
                <div className="flex-1">
                  {pet.vet_name && <p className="font-bold text-text-primary text-[16px]">{pet.vet_name}</p>}
                  {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-primary font-semibold hover:underline text-[14px]">{pet.vet_phone}</a>}
                </div>
                <a href={`tel:${pet.vet_phone}`} className="btn-primary text-[13px] py-2 px-4 shrink-0">Ara</a>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-6 bg-primary-soft/30 rounded-[20px] border border-primary/20 mb-4">
                <div className="w-16 h-16 bg-white rounded-[20px] flex items-center justify-center text-[32px] mb-4 shadow-sm">🩺</div>
                <h4 className="font-extrabold text-text-primary text-[16px] mb-1">Veterineriniz Kayıtlı Değil</h4>
                <p className="text-[13px] text-text-secondary mb-5 leading-relaxed max-w-[250px]">
                  Klinik bilgilerinizi ekleyerek aşı hatırlatmalarını tek tuşla kliniğinizle paylaşabilir ve randevularınızı takip edebilirsiniz.
                </p>
                <Link href={`/owner/pets/${pet.id}/edit`} className="btn-primary text-[13px] px-8 py-2.5">Kliniğimi Ekle</Link>
              </div>
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
            <Link href={`/owner/ai-vet`} className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-white font-bold text-[14px] hover:bg-primary-hover transition-colors">
              🤖 AI Vet Chat'e Sor
            </Link>
          </div>
        </div>
      )}

      {/* ── Tab: Belgeler ── */}
      {activeTab === 'Belgeler' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-cyan-50 rounded-[20px] flex items-center justify-center text-[32px] mb-4 shadow-sm">🚧</div>
            <h3 className="font-extrabold text-text-primary text-[18px] mb-2">Çok Yakında</h3>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-[280px]">
              Dijital belge kasası modülümüz (Pasaport, aşı karnesi, lab sonuçları yükleme) çok yakında aktif olacak.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Aile ── */}
      {activeTab === 'Aile' && (
        <FamilyTab
          petId={pet.id}
          petName={pet.name}
          plan={subscription?.plan ?? 'free'}
          initialSos={pet.sos_contacts}
        />
      )}

      {/* ── Tab: Raporlar ── */}
      {activeTab === 'Raporlar' && (
        <ReportsTab
          petId={pet.id}
          petName={pet.name}
          plan={subscription?.plan ?? 'free'}
        />
      )}

      {payments && payments.length > 0 && (
        <div className="card-base p-5">
          <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Son Harcamalar</h3>
          <div className="flex flex-col gap-2">
            {payments.slice(0, 3).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center text-[13px]">
                <span className="text-text-primary font-medium">{p.description || 'Ödeme'}</span>
                <span className="font-bold text-text-primary">₺{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
