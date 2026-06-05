'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CoachMark from '@/components/ui/CoachMark'
import EmptyState from '@/components/ui/EmptyState'
import { Syringe } from 'lucide-react'
import { SmartScanner } from '@/components/ui/SmartScanner'

const COMMON_DISEASES = [
  "Rutin Check-up",
  "Aşı Uygulaması",
  "İç/Dış Parazit Uygulaması",
  "Kısırlaştırma (Operasyon)",
  "Kulak Enfeksiyonu (Otitis)",
  "Göz Enfeksiyonu (Konjonktivit)",
  "Mide/Bağırsak Problemi (İshal/Kusma)",
  "Solunum Yolu Enfeksiyonu",
  "Deri Problemi (Alerji/Mantar/Uyuz)",
  "İdrar Yolu Enfeksiyonu",
  "Ortopedik Sorun (Kırık/Çıkık/İncinme)",
  "Zehirlenme",
  "Ağız ve Diş Sağlığı",
  "Yaralanma / Travma"
]

export default function TreatmentsClient({ pet, initialTreatments }: { pet: any, initialTreatments: any[] }) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  
  const [treatments, setTreatments] = useState<any[]>(initialTreatments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<any>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [treatmentToDelete, setTreatmentToDelete] = useState<string | null>(null)
  const [showTreatmentScanner, setShowTreatmentScanner] = useState(false)

  // Form states
  const [diseaseSelect, setDiseaseSelect] = useState('')
  const [customDisease, setCustomDisease] = useState('')
  const [category, setCategory] = useState('Rutin Kontrol')
  const [status, setStatus] = useState('Devam Ediyor')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [methods, setMethods] = useState('')
  const [cost, setCost] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('Borçlu')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')

  // Medications state (Multiple)
  const [medications, setMedications] = useState<any[]>([])
  const [showMedForm, setShowMedForm] = useState(false)
  const [medName, setMedName] = useState('')
  const [medFrequency, setMedFrequency] = useState('1')
  const [medDays, setMedDays] = useState('5')
  const [medDose, setMedDose] = useState('1 Tablet')
  const [trackMedEnd, setTrackMedEnd] = useState(false)
  const [formStep, setFormStep] = useState(1)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const openNewForm = () => {
    setEditingTreatment(null)
    setDiseaseSelect('')
    setCustomDisease('')
    setCategory('Rutin Kontrol')
    setStatus('Devam Ediyor')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setClinicName(pet?.vet_name || '')
    setMethods('')
    setCost('')
    setPaymentStatus('Borçlu')
    setReminderDate('')
    setReminderNote('')
    setMedications([])
    setShowMedForm(false)
    setFormStep(1)
    setIsModalOpen(true)
  }

  const openEditForm = (t: any) => {
    setEditingTreatment(t)
    if (COMMON_DISEASES.includes(t.disease_name)) {
      setDiseaseSelect(t.disease_name)
      setCustomDisease('')
    } else {
      setDiseaseSelect('Diğer')
      setCustomDisease(t.disease_name)
    }
    setCategory(t.category || 'Rutin Kontrol')
    setStatus(t.status || 'Devam Ediyor')
    setStartDate(t.start_date || new Date().toISOString().split('T')[0])
    setEndDate(t.end_date || '')
    setClinicName(t.clinic_name || '')
    setMethods(t.treatment_methods || '')
    setCost(t.cost ? t.cost.toString() : '')
    setPaymentStatus(t.payment_status || 'Borçlu')
    setReminderDate('')
    setReminderNote('')
    setMedications([])
    setShowMedForm(false)
    setFormStep(1)
    setIsModalOpen(true)
  }

  const addMedication = () => {
    if (!medName) return
    setMedications([...medications, { 
      name: medName, 
      frequency: medFrequency, 
      days: medDays, 
      dose: medDose, 
      trackEnd: trackMedEnd 
    }])
    setMedName('')
    setMedFrequency('1')
    setMedDays('5')
    setMedDose('1 Tablet')
    setTrackMedEnd(false)
    setShowMedForm(false)
  }

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalDiseaseName = diseaseSelect === 'Diğer' ? customDisease : diseaseSelect
    if (!finalDiseaseName || !finalDiseaseName.trim()) {
      setNotification({ type: 'error', message: 'Lütfen hastalık veya tanı adı belirtin.' })
      return
    }

    setIsSubmitting(true)
    
    try {
      const treatmentData = {
        pet_id: pet.id,
        disease_name: finalDiseaseName,
        category,
        status,
        start_date: startDate,
        end_date: endDate || null,
        clinic_name: clinicName,
        treatment_methods: methods,
        cost: cost ? parseFloat(cost) : 0,
        payment_status: paymentStatus
      }

      let currentTreatmentId = null

      if (editingTreatment) {
        currentTreatmentId = editingTreatment.id
        const { error } = await supabase.from('health_treatments').update(treatmentData).eq('id', currentTreatmentId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('health_treatments').insert(treatmentData).select().single()
        if (error) throw error
        if (data) currentTreatmentId = data.id
      }

      // SÜREÇ TAKİBİ: Hatırlatıcı ekleme
      if (reminderDate && reminderNote) {
        await supabase.from('health_schedules').insert({
          pet_id: pet.id,
          plan_type: 'checkup',
          title: `Tedavi Takibi: ${finalDiseaseName} - ${reminderNote}`,
          due_date: reminderDate,
          status: 'upcoming',
          source: 'treatment_module'
        })
      }

      // İLAÇ TAKİBİ:
      if (medications.length > 0) {
        for (const med of medications) {
          // 1. İlaç kaydı
          await supabase.from('health_medications').insert({
            pet_id: pet.id,
            medication_name: med.name,
            dose: `${med.dose} (Günde ${med.frequency} kez)`,
            usage_duration: `${med.days} gün`
          })

          // 2. Takvim görevleri
          const days = parseInt(med.days)
          const inserts = []
          const baseDate = new Date(startDate || new Date())
          for (let i = 0; i < days; i++) {
            const d = new Date(baseDate)
            d.setDate(d.getDate() + i)
            inserts.push({
              pet_id: pet.id,
              plan_type: 'medication',
              title: `💊 İlaç: ${med.name} (${med.dose})`,
              due_date: d.toISOString().split('T')[0],
              status: 'upcoming',
              source: 'treatment_medication'
            })
          }
          
          if (med.trackEnd) {
            const endD = new Date(baseDate)
            endD.setDate(endD.getDate() + days - 1)
            inserts.push({
              pet_id: pet.id,
              plan_type: 'checkup',
              title: `⚠️ ${med.name} İlacı Bitiyor! Stok kontrolü yapın.`,
              due_date: endD.toISOString().split('T')[0],
              status: 'upcoming',
              source: 'treatment_med_end'
            })
          }
          await supabase.from('health_schedules').insert(inserts)
        }
      }

      // FINANSAL TAKIP: Mükerrer kaydı önleyerek ödeme ekle
      if (status === 'Tamamlandı' && cost && parseFloat(cost) > 0 && paymentStatus === 'Ödendi') {
        const shouldAddPayment = !editingTreatment || (editingTreatment.status !== 'Tamamlandı' && status === 'Tamamlandı')
        
        if (shouldAddPayment) {
          await supabase.from('payments').insert({
            pet_id: pet.id,
            amount: parseFloat(cost),
            payment_type: `Tedavi: ${finalDiseaseName}`,
            payment_date: startDate,
            notes: `${clinicName} - ${category} (Otomatik Kayıt)`
          })
        }
      }

      setNotification({ type: 'success', message: 'Tedavi kaydı başarıyla güncellendi.' })
      
      // Refresh veriler
      const { data: updated } = await supabase.from('health_treatments').select('*').eq('pet_id', pet.id).order('start_date', { ascending: false })
      if (updated) setTreatments(updated)
      
      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setNotification({ type: 'error', message: 'Hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsSubmitting(true)
    try {
      await supabase.from('health_treatments').delete().eq('id', id)
      setTreatments(treatments.filter(t => t.id !== id))
      setNotification({ type: 'success', message: 'Tedavi kaydı silindi.' })
      setIsModalOpen(false)
      setTreatmentToDelete(null)
    } catch (err) {
      setNotification({ type: 'error', message: 'Silme işlemi sırasında hata oluştu.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto relative">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[150] px-6 py-3 rounded-2xl shadow-2xl border-l-4 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-success/10 border-success text-success' : 'bg-error/10 border-error text-error'
        }`}>
          <div className="flex items-center gap-3 font-bold">
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Back */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Sağlık Geçmişi'ne Dön
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
        <CoachMark
          hintKey="treatments_intro"
          title="Tedavi Sürecini Yönet"
          message="Hastalık süreçlerini, ilaç alım saatlerini ve veteriner faturalarını buradan tek seferde takip et."
          icon="🩺"
          position="bottom"
        />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-soft to-primary/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-7 h-7 drop-shadow-sm">
              <path d="M12 4h8v4h-8z" fill="#D1D5DB" />
              <path d="M8 8h16v18a4 4 0 01-4 4H12a4 4 0 01-4-4V8z" fill="url(#steth-grad)" />
              <path d="M16 12v10M11 17h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="steth-grad" x1="8" y1="8" x2="24" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="text-[24px] font-black text-text-primary">Tedavi Takip Modülü</h1>
            <p className="text-[14px] text-text-secondary font-medium">{pet.name} için hastalık, randevu ve ödeme geçmişi</p>
          </div>
        </div>
        <button onClick={openNewForm} className="btn-primary py-2.5 px-5 shadow-lg shadow-primary/30 text-[14px] flex items-center gap-2 whitespace-nowrap">
          <span>+</span> Yeni Tedavi
        </button>
      </div>

      {treatments.length === 0 ? (
        <EmptyState
          icon={<Syringe />}
          title="Henüz tedavi kaydı yok"
          message="Petinizin aşı, ilaç ve tedavi geçmişini buradan takip edebilirsiniz."
          cta={{ label: "İlk Kaydı Oluştur", onClick: openNewForm }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treatments.map((t: any) => (
            <div key={t.id} className={`card-base p-5 border-l-4 hover:shadow-md hover:scale-[1.03] transition-all duration-300 cursor-pointer flex flex-col justify-between ${t.status === 'Tamamlandı' ? 'border-l-success' : t.status === 'İptal Edildi' ? 'border-l-error' : 'border-l-primary'}`} 
                 onClick={() => openEditForm(t)}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-extrabold text-[16px] text-text-primary">{t.disease_name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg-main text-text-secondary uppercase w-fit">{t.category}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${t.status === 'Tamamlandı' ? 'bg-success/10 text-success' : t.status === 'İptal Edildi' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                    {t.status}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 mt-4 text-[13px]">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>🏥</span>
                    <span className="font-medium text-text-primary">{t.clinic_name || 'Klinik Belirtilmedi'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span>📅</span>
                    <span>{new Date(t.start_date).toLocaleDateString('tr-TR')} {t.end_date ? `- ${new Date(t.end_date).toLocaleDateString('tr-TR')}` : ''}</span>
                  </div>
                </div>
              </div>

              {t.cost > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-main">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-[15px]">₺{t.cost}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${t.payment_status === 'Ödendi' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {t.payment_status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-surface w-full max-w-xl max-h-[85dvh] sm:rounded-[32px] shadow-2xl flex flex-col overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 sm:px-8 shrink-0 border-b border-border-main/50 bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h2 className="text-[20px] font-black text-text-primary tracking-tight">{editingTreatment ? 'Tedaviyi Düzenle' : 'Yeni Tedavi Kaydı'}</h2>
                <p className="text-[12px] text-text-secondary font-bold uppercase tracking-wider opacity-70">{pet.name} - Süreç Takibi</p>
              </div>
              <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-bg-main flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 transition-all font-bold">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar">
              {isModalOpen && showTreatmentScanner && (
                <SmartScanner
                  petId={pet.id}
                  onClose={() => setShowTreatmentScanner(false)}
                  onResult={(data: any) => {
                    const parsed = data?.parsed || data
                    if (parsed?.title || parsed?.vaccine_name || parsed?.product_name) {
                      setDiseaseSelect('Diğer') // Varsayılanı 'Diğer' yapıp custom alana dolduralım
                      setCustomDisease(parsed.title || parsed.vaccine_name || parsed.product_name || '')
                      if (parsed.date) setStartDate(parsed.date)
                      if (parsed.vet_name) setClinicName(parsed.vet_name)
                      if (parsed.active_ingredient) setMethods(parsed.active_ingredient)
                    }
                    setShowTreatmentScanner(false)
                  }}
                />
              )}

              {isModalOpen && !showTreatmentScanner && (
                <button type="button"
                  onClick={() => setShowTreatmentScanner(true)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-[13px]
                             font-bold text-primary bg-primary/5 border border-primary/20
                             rounded-xl hover:bg-primary/10 transition-all mb-4">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  İlaç veya Aşı Ambalajını Tara
                </button>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Hastalık / Tanı Adı</label>
                  <select required value={diseaseSelect} onChange={e => setDiseaseSelect(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none">
                    <option value="" disabled>Lütfen seçin...</option>
                    {COMMON_DISEASES.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="Diğer">Diğer (Lütfen Yazınız)</option>
                  </select>
                  {diseaseSelect === 'Diğer' && (
                    <input type="text" required value={customDisease} onChange={e => setCustomDisease(e.target.value)} className="input-base text-[16px] mt-2 border-primary/30" placeholder="Hastalık adını girin" autoFocus />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Kategori</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none">
                    <option>Rutin Kontrol</option>
                    <option>Acil</option>
                    <option>Kronik Hastalık</option>
                    <option>Ameliyat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Başlangıç Tarihi</label>
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Bitiş Tarihi (Opsiyonel)</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Durum</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="input-base text-[16px] font-black bg-bg-main border-none">
                    <option value="Devam Ediyor">⏳ Devam Ediyor</option>
                    <option value="Tamamlandı">✅ Tamamlandı</option>
                    <option value="İptal Edildi">❌ İptal Edildi</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                   <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Hizmet Noktası (Klinik)</label>
                   <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none" placeholder="Klinik veya hekim adı" />
                </div>
              </div>

              {formStep === 1 && (
                <div className="flex justify-end mt-2 pb-10 sm:pb-0">
                  <button type="button" onClick={() => setFormStep(2)} className="btn-primary py-3 px-10 text-[13px] font-black tracking-tight shadow-xl shadow-primary/30 min-w-[140px] rounded-2xl">
                    İleri (Detaylar)
                  </button>
                </div>
              )}

              {formStep === 2 && (
                <div className="flex flex-col gap-7 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Uygulanan Yöntemler / Notlar</label>
                <textarea rows={3} value={methods} onChange={e => setMethods(e.target.value)} className="input-base text-[16px] font-medium bg-bg-main border-none resize-none" placeholder="İlaç kullanımı, pansuman vb. kısa notlar" />
              </div>

              {/* İlaç Takip & Hatırlatma */}
              <div className="bg-blue-50/40 p-6 rounded-[24px] border border-blue-100/50 shadow-inner">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-[14px] font-black text-blue-700 flex items-center gap-2">
                    <svg viewBox="0 0 32 32" className="w-6 h-6 drop-shadow-sm"><rect x="6" y="10" width="20" height="12" rx="6" fill="url(#pill-grad)"/><path d="M16 10v12" stroke="#fff" strokeWidth="2"/><defs><linearGradient id="pill-grad" x1="6" y1="10" x2="26" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="0.5" stopColor="#3B82F6"/><stop offset="0.5" stopColor="#93C5FD"/><stop offset="1" stopColor="#93C5FD"/></linearGradient></defs></svg>
                    İlaç Takip & Hatırlatma
                  </h4>
                  <button type="button" onClick={() => setShowMedForm(!showMedForm)} className="text-[12px] font-black text-blue-600 hover:text-blue-800 transition-colors bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100">
                    {showMedForm ? 'Vazgeç' : '+ İlaç Ekle'}
                  </button>
                </div>
                
                {medications.length > 0 && (
                  <div className="flex flex-col gap-2.5 mb-5">
                    {medications.map((m, idx) => (
                      <div key={idx} className="bg-white border border-blue-100/50 rounded-2xl p-4 flex justify-between items-center shadow-sm animate-in slide-in-from-left-2 duration-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-black text-text-primary">{m.name}</span>
                          <span className="text-[11px] text-text-secondary font-bold uppercase tracking-tight opacity-70">
                            {m.dose} • Günde {m.frequency} Kez • {m.days} Gün {m.trackEnd ? '• Takip Açık' : ''}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeMedication(idx)} className="w-10 h-10 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {showMedForm && (
                  <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">İlaç Adı</label>
                        <input type="text" value={medName} onChange={e => setMedName(e.target.value)} className="input-base text-[16px] font-bold py-2 bg-bg-main border-none" placeholder="Örn: Augmentin" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Miktar / Doz</label>
                        <input type="text" value={medDose} onChange={e => setMedDose(e.target.value)} className="input-base text-[16px] font-bold py-2 bg-bg-main border-none" placeholder="Örn: 1 Tablet" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Sıklık</label>
                        <select value={medFrequency} onChange={e => setMedFrequency(e.target.value)} className="input-base text-[16px] font-bold py-2 bg-bg-main border-none">
                          <option value="1">Günde 1 kez</option>
                          <option value="2">Günde 2 kez</option>
                          <option value="3">Günde 3 kez</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Süre (Gün)</label>
                        <input type="number" min="1" value={medDays} onChange={e => setMedDays(e.target.value)} className="input-base text-[16px] font-bold py-2 bg-bg-main border-none" />
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 cursor-pointer shrink-0 group">
                        <input type="checkbox" checked={trackMedEnd} onChange={e => setTrackMedEnd(e.target.checked)} className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-[11px] font-black text-blue-700 group-hover:text-blue-900 transition-colors uppercase tracking-tight">İlaç Bitimini Takip Et</span>
                      </label>
                      <button type="button" onClick={addMedication} className="btn-primary py-2 px-6 text-[12px] font-black shadow-md shadow-primary/20">Listeye Ekle</button>
                    </div>
                  </div>
                )}
                
                {medications.length === 0 && !showMedForm && (
                  <p className="text-[12px] text-blue-400 font-medium italic opacity-80">Henüz ilaç eklenmedi. Tedavi reçetesi varsa buradan ekleyerek takvim hatırlatıcılarını oluşturabilirsiniz.</p>
                )}
              </div>

              {/* Gelecek Adım / Randevu */}
              <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/10">
                <h4 className="text-[14px] font-black text-primary mb-4 flex items-center gap-2">
                  <svg viewBox="0 0 32 32" className="w-6 h-6 drop-shadow-sm"><rect x="4" y="6" width="24" height="22" rx="4" fill="#fff" stroke="url(#cal-grad)" strokeWidth="2"/><path d="M4 14h24" stroke="url(#cal-grad)" strokeWidth="2"/><path d="M10 4v4M22 4v4" stroke="url(#cal-grad)" strokeWidth="2" strokeLinecap="round"/><defs><linearGradient id="cal-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#EC4899"/><stop offset="1" stopColor="#BE185D"/></linearGradient></defs></svg>
                  Gelecek Adım & Randevu
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Hatırlatma Tarihi</label>
                    <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Not / Hatırlatma</label>
                    <input type="text" value={reminderNote} onChange={e => setReminderNote(e.target.value)} className="input-base text-[16px] font-bold bg-bg-main border-none" placeholder="Örn: Kontrol randevusu" />
                  </div>
                </div>
              </div>

              {/* Finansal Takip */}
              <div className="bg-bg-main p-6 rounded-[24px] border border-border-main/50">
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[14px] font-black text-text-primary flex items-center gap-2">
                      <svg viewBox="0 0 32 32" className="w-6 h-6 drop-shadow-sm"><circle cx="16" cy="16" r="14" fill="url(#coin-grad)"/><path d="M16 8v16M11 12h10M11 20h10M16 12a4 4 0 010 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><defs><linearGradient id="coin-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#F59E0B"/><stop offset="1" stopColor="#D97706"/></linearGradient></defs></svg>
                      Finansal Takip
                    </h4>
                    <div className="flex bg-surface p-1 rounded-full border border-border-main/50">
                      <button type="button" onClick={() => setPaymentStatus('Ödendi')} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight transition-all ${paymentStatus === 'Ödendi' ? 'bg-success text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}>Ödendi</button>
                      <button type="button" onClick={() => setPaymentStatus('Borçlu')} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight transition-all ${paymentStatus === 'Borçlu' ? 'bg-warning text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}>Borçlu</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-black text-[18px]">₺</span>
                      <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="input-base w-full text-[20px] pl-10 py-3 font-black bg-surface border-none shadow-sm" placeholder="0.00" />
                    </div>
                    <div className="flex flex-col max-w-[140px]">
                      <span className="text-[10px] text-text-secondary font-black uppercase leading-tight tracking-widest opacity-60">Toplam Hizmet Bedeli</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pb-10 sm:pb-0">
                {editingTreatment ? (
                  <button type="button" onClick={() => setTreatmentToDelete(editingTreatment.id)} className="btn-secondary !text-error !bg-error/5 hover:!bg-error/10 border-error/20 py-3 px-8 text-[13px] font-black tracking-tight shrink-0 rounded-2xl">
                    Kaydı Sil
                  </button>
                ) : <div/>}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={() => setFormStep(1)} className="btn-secondary py-3 px-8 text-[13px] font-black tracking-tight rounded-2xl">Geri</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary py-3 px-10 text-[13px] font-black tracking-tight shadow-xl shadow-primary/30 min-w-[140px] rounded-2xl">
                    {isSubmitting ? 'İşleniyor...' : (editingTreatment ? 'Güncelle' : 'Kaydet')}
                  </button>
                </div>
              </div>
              </div>
              )}

            </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!treatmentToDelete}
        title="Tedavi Kaydını Sil"
        message="Bu tedavi kaydını kalıcı olarak silmek istediğinize emin misiniz?"
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={() => treatmentToDelete && handleDelete(treatmentToDelete)}
        onCancel={() => setTreatmentToDelete(null)}
      />
    </div>
  )
}
