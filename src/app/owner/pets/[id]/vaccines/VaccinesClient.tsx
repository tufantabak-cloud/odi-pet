'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type VaccinesClientProps = {
  pet: any
  initialPlans: any[]
  initialRecords: any[]
}

export default function VaccinesClient({ pet, initialPlans, initialRecords }: VaccinesClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'takvim' | 'kayitlar'>('takvim')
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form states for manual record
  const [vaccineName, setVaccineName] = useState('')
  const [vaccineCode, setVaccineCode] = useState('')
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!vaccineName.trim()) {
      setErrorMsg('Aşı adı zorunludur.')
      return
    }

    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase.from('vaccine_records_v2').insert({
          pet_id: pet.id,
          vaccine_name: vaccineName.trim(),
          vaccine_code: vaccineCode.trim() || 'CUSTOM',
          administered_at: adminDate,
          status: 'done',
          notes: notes.trim() || null,
          confidence_level: 'high',
          source: 'manual',
        })

        if (error) throw error

        setShowModal(false)
        setVaccineName('')
        setVaccineCode('')
        setNotes('')
        router.refresh()
      } catch (err: any) {
        setErrorMsg('Hata: ' + (err.message || 'Aşı kaydı eklenemedi.'))
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto animate-fadeIn">
      {/* Back link */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Dostumun Profiline Dön
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-sky-50 flex items-center justify-center shrink-0 text-[24px]">
            💉
          </div>
          <div>
            <h1 className="text-[24px] font-black text-text-primary">Aşı Karnesi</h1>
            <p className="text-[14px] text-text-secondary font-medium">{pet.name} için aşı geçmişi ve takvimi</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary min-h-[50px] flex items-center justify-center px-4 text-[13px] font-bold shadow-sm"
        >
          Manuel İşlem
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-main">
        <button
          onClick={() => setActiveTab('takvim')}
          className={`flex-1 py-3 text-center text-[14px] font-bold transition-all relative ${
            activeTab === 'takvim' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Takvim
          {activeTab === 'takvim' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('kayitlar')}
          className={`flex-1 py-3 text-center text-[14px] font-bold transition-all relative ${
            activeTab === 'kayitlar' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Kayıtlar
          {activeTab === 'kayitlar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex flex-col gap-4">
        {activeTab === 'takvim' ? (
          initialPlans.length === 0 ? (
            <div className="text-[14px] text-text-secondary p-8 text-center bg-white rounded-2xl border border-border-main border-dashed">
              Plan Bulunamadı. Yaklaşan aşı planınız bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {initialPlans.map(plan => (
                <div 
                  key={plan.id} 
                  data-testid="vaccine-plan-item"
                  className="card-base p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-lg">💉</div>
                    <div>
                      <h4 className="font-bold text-text-primary text-[15px]">{plan.sub_type}</h4>
                      <p className="text-[11px] text-text-secondary font-medium"><b>Tarih:</b> {new Date(plan.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  {plan.note && <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">{plan.note}</span>}
                </div>
              ))}
            </div>
          )
        ) : (
          initialRecords.length === 0 ? (
            <div className="text-[14px] text-text-secondary p-8 text-center bg-white rounded-2xl border border-border-main border-dashed">
              Henüz aşı kaydı bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {initialRecords.map(rec => (
                <div key={rec.id} className="card-base p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg">✓</div>
                    <div>
                      <h4 className="font-bold text-text-primary text-[15px]">{rec.vaccine_name}</h4>
                      <p className="text-[11px] text-text-secondary font-medium"><b>Uygulanma:</b> {rec.administered_at ? new Date(rec.administered_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Bilinmiyor'}</p>
                    </div>
                  </div>
                  {rec.notes && <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{rec.notes}</span>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Manual Entry Modal */}
      {showModal && (
        <div 
          role="dialog" 
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-surface w-full max-w-md rounded-[28px] shadow-2xl p-6 relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
            <div>
              <h3 className="text-[18px] font-black text-text-primary">Aşı Kaydı Ekle</h3>
              <p className="text-[12px] text-text-secondary font-medium">Manuel olarak aşı geçmişi ekleyin.</p>
            </div>

            {errorMsg && (
              <div role="alert" className="p-3 bg-error/10 border border-error/20 text-error text-[12px] font-bold rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddManual} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Aşı Adı *</label>
                <input 
                  type="text" 
                  value={vaccineName} 
                  onChange={e => setVaccineName(e.target.value)} 
                  placeholder="Örn: Karma Aşı, Kuduz" 
                  className="input-base" 
                  required 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Aşı Kodu / Kısaltma</label>
                <input 
                  type="text" 
                  value={vaccineCode} 
                  onChange={e => setVaccineCode(e.target.value)} 
                  placeholder="Örn: DHPPi, RAB" 
                  className="input-base" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Uygulama Tarihi</label>
                <input 
                  type="date" 
                  value={adminDate} 
                  onChange={e => setAdminDate(e.target.value)} 
                  className="input-base" 
                  required 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Notlar</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Klinik adı, lot no vb. detaylar..." 
                  className="input-base resize-none min-h-[80px]" 
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 min-h-[50px] flex items-center justify-center rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px] hover:bg-bg-main transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 min-h-[50px] flex items-center justify-center rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-[14px] disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
