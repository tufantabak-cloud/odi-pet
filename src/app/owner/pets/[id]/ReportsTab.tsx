'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'
import { Upload, Plus, Trash2, Loader2, FileText, Check, Sparkles, Folder, Wallet, Inbox, Lock, AlertTriangle, CheckCircle2, Link as LinkIcon, Plane, Printer } from 'lucide-react'
import { FirstAidIcon } from '@/components/icons/PetIcons'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Database } from '@/types'

type PaymentRow = Database['public']['Tables']['payments']['Row']

const DOCUMENT_TYPES = [
  { slug: 'tahlil', label: 'Tahlil Sonucu' },
  { slug: 'recete', label: 'Reçete' },
  { slug: 'asi_karti', label: 'Aşı Kartı' },
  { slug: 'pasaport', label: 'Pasaport' },
  { slug: 'sigorta', label: 'Sigorta Poliçesi' },
  { slug: 'secere', label: 'Şecere Belgesi' },
  { slug: 'operasyon_raporu', label: 'Operasyon / Ameliyat Raporu' },
  { slug: 'diyet_plani', label: 'Diyet / Beslenme Planı' },
  { slug: 'mikrocip', label: 'Mikroçip Belgesi' },
  { slug: 'fatura', label: 'Fatura / Fiş' },
  { slug: 'diger', label: 'Diğer' }
]

const REPORT_TYPES = [
  {
    id: 'summary',
    icon: <FileText size={24} className="w-6 h-6 text-primary" aria-hidden="true" />,
    label: 'Hızlı Özet',
    desc: 'Pet profili, aktif uyarılar ve yaklaşan görevler',
    plan: 'free',
    color: 'border-green-200 hover:border-green-400',
    badge: 'Ücretsiz',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'medical_timeline',
    icon: <FirstAidIcon width={24} height={24} className="w-6 h-6 text-info" />,
    label: 'Medikal Timeline',
    desc: 'Tüm aşılar, hastalıklar, ilaçlar, randevular — veteriner için kronolojik geçmiş',
    plan: 'pro',
    color: 'border-blue-200 hover:border-blue-400',
    badge: 'Pro',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'travel_pack',
    icon: <Plane size={24} className="w-6 h-6 text-primary" aria-hidden="true" />,
    label: 'Seyahat Paketi',
    desc: 'Pasaport, kuduz durumu, mikroçip, acil iletişim — boarding & seyahat için',
    plan: 'ai_plus',
    color: 'border-purple-200 hover:border-purple-400',
    badge: 'AI+',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
]

const DATE_RANGES = [
  { value: 'last_3_months', label: 'Son 3 Ay' },
  { value: 'last_6_months', label: 'Son 6 Ay' },
  { value: 'last_12_months', label: 'Son 12 Ay' },
  { value: 'all_time', label: 'Tüm Geçmiş' },
]

export default function ReportsTab({ petId, petName, plan, payments }: { petId: string; petName: string; plan: string; payments: PaymentRow[] }) {
  const [activeTab, setActiveTab] = useState<'reports' | 'vault'>('reports')
  const [selectedType, setSelectedType] = useState('summary')
  const [dateRange, setDateRange] = useState('last_12_months')
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Document Safe States
  const [records, setRecords] = useState<any[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('tahlil')
  const [isUploading, setIsUploading] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchRecords = async () => {
    setLoadingRecords(true)
    try {
      const res = await fetch(`/api/pets/${petId}/records`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'vault') {
      fetchRecords()
    }
  }, [activeTab, petId])

  useEffect(() => {
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.section === 'Raporlar & Belgeler' && customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('open-pet-section', handleOpenTab);
    return () => window.removeEventListener('open-pet-section', handleOpenTab);
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let titleToUse = uploadTitle
    if (!titleToUse) {
      titleToUse = file.name.replace(/\.[^/.]+$/, "")
      setUploadTitle(titleToUse)
    }

    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch('/api/upload/pet-documents', {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Yükleme hatası')
      }

      const recordRes = await fetch(`/api/pets/${petId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToUse,
          type: uploadType,
          document_path: uploadData.path || uploadData.url,
          date: new Date().toISOString(),
        })
      })

      if (recordRes.ok) {
        setUploadTitle('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchRecords()

        // Belge ve karne yüklendiğinde onboarding adımını true olarak işaretle
        try {
          const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
          const supabase = createBrowserSupabaseClient()
          await supabase.rpc('update_onboarding_step', {
            p_pet_id: petId,
            p_step: 'documents',
            p_value: true,
          })
        } catch (opErr) {
          console.error('Onboarding step documents could not be marked:', opErr)
        }
      } else {
        throw new Error('Kayıt oluşturulamadı')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Belge yüklenirken bir hata oluştu.')
    } finally {
      setIsUploading(false)
    }
  }

  // OPOS Cilt 3: native confirm()/alert() yerine ConfirmModal + inline hata.
  const handleDeleteRecord = (recordId: string) => setRecordToDelete(recordId)

  const confirmDeleteRecord = async () => {
    const recordId = recordToDelete
    setRecordToDelete(null)
    if (!recordId) return
    setError(null)
    try {
      const res = await fetch(`/api/pets/${petId}/records/${recordId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchRecords()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Silme işlemi başarısız.')
      }
    } catch (err) {
      console.error(err)
      setError('Belge silinemedi. Lütfen tekrar deneyin.')
    }
  }

  async function generate() {
    setGenerating(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch(`/api/reports/${petId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: selectedType, date_range: dateRange }),
      })
      
      let data;
      try {
        data = await res.json()
      } catch (e) {
        throw new Error('Sunucudan geçersiz bir yanıt alındı. Lütfen tekrar deneyin.')
      }
      
      if (!res.ok) {
        setError(data?.error || 'Rapor oluşturulamadı.')
        if (data?.requiresUpgrade) setError((data?.error || 'Yükseltme gerekli') + ' → ' + (plan === 'free' ? 'Pro' : 'AI+') + ' gerekli')
        return
      }
      setReport(data)
      await Promise.all([
        trackEvent('first_report_generated', { petId, reportType: selectedType }),
        fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ has_generated_report: true, first_report_at: new Date().toISOString() }),
        }),
      ])
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen bir hata oluştu.')
    } finally { setGenerating(false) }
  }

  function openPrint() {
    if (!report || !report.shareToken) {
      setError('Rapor bağlantısı bulunamadı. Lütfen raporu yeniden oluşturun.')
      return
    }
    const win = window.open(`/owner/reports/${petId}/print?type=${selectedType}&range=${dateRange}&token=${report.shareToken}`, '_blank')
    win?.focus()
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/owner/reports/share/${report.shareToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const planRank: Record<string, number> = { free: 0, pro: 1, ai_plus: 2 }
  const userRank = planRank[plan] ?? 0

  return (
    <div className="flex flex-col gap-5">
      
      {/* Tab Switcher */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-md border border-border-main/50">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-3 text-center text-[13px] font-semibold rounded-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'reports' ? 'bg-white text-primary shadow-sm scale-[1.02]' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Sparkles size={16} className="w-4 h-4 text-primary" aria-hidden="true" /> AI Raporları
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 py-3 text-center text-[13px] font-semibold rounded-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'vault' ? 'bg-white text-primary shadow-sm scale-[1.02]' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Folder size={16} className="w-4 h-4 text-primary" aria-hidden="true" /> Belge Kasası
        </button>
      </div>

      {activeTab === 'reports' ? (
        <>
          {/* ── Harcama Özeti ── */}
          <div className="card-base p-5">
            <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-1.5"><Wallet size={18} className="w-4.5 h-4.5 text-success" aria-hidden="true" /> Harcama Özeti</h3>
            {payments && payments.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 bg-primary-soft rounded-sm border border-primary/20">
                  <span className="text-[13px] font-semibold text-text-primary uppercase tracking-wide">Toplam Harcama</span>
                  <span className="text-2xl font-bold text-primary">
                    ₺{payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col divide-y divide-border-main">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center py-2.5">
                      <div>
                        <p className="text-[13px] font-semibold text-text-primary">{p.description || 'Ödeme'}</p>
                        {p.payment_date && (
                          <p className="text-[11px] text-text-secondary">{new Date(p.payment_date).toLocaleDateString('tr-TR')}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-text-primary">₺{parseFloat(p.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-text-secondary text-[13px] flex flex-col items-center">
                <Inbox size={32} className="w-8 h-8 text-text-secondary mb-2 opacity-60" aria-hidden="true" />
                <p>Henüz kayıtlı harcama bulunmuyor.</p>
              </div>
            )}
          </div>

          {/* Report type selector */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Rapor Türü</h3>
            {REPORT_TYPES.map(rt => {
              const locked = planRank[rt.plan] > userRank
              return (
                <button
                  key={rt.id}
                  disabled={locked}
                  onClick={() => setSelectedType(rt.id)}
                  className={`p-4 rounded-sm border-2 text-left transition-all ${selectedType === rt.id ? 'border-primary bg-primary-soft' : rt.color} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{rt.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-text-primary text-base">{rt.label}</p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${rt.badgeColor}`}>{rt.badge}</span>
                        {locked && <span className="text-[11px] text-text-secondary flex items-center gap-1"><Lock size={14} className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" /> Kilidi Aç</span>}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{rt.desc}</p>
                    </div>
                    {selectedType === rt.id && !locked && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-widest block mb-2">Tarih Aralığı</label>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGES.map(dr => (
                <button key={dr.value} onClick={() => setDateRange(dr.value)}
                  className={`px-3 py-1.5 rounded-sm border text-xs font-bold transition-all ${dateRange === dr.value ? 'border-primary bg-primary-soft text-primary' : 'border-border-main text-text-secondary hover:border-primary/40'}`}>
                  {dr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="p-4 rounded-xs bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-1.5">
              <AlertTriangle size={16} className="w-4 h-4 text-danger shrink-0" aria-hidden="true" /> {error}
              {error.includes('Pro') || error.includes('AI+') ? (
                <Link href="/owner/profile/subscription" className="ml-2 underline font-bold">Yükselt →</Link>
              ) : null}
            </div>
          )}

          {/* Generate button */}
          <button onClick={generate} disabled={generating}
            className="btn-primary py-3.5 text-base font-bold flex items-center justify-center gap-2">
            {generating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Rapor Hazırlanıyor...</>
              : <>{REPORT_TYPES.find(r => r.id === selectedType)?.icon} {petName} için Rapor Oluştur</>
            }
          </button>

          {/* Report result */}
          {report && (
            <div className="card-base overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-primary-hover"/>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-text-primary text-base flex items-center gap-1.5"><CheckCircle2 size={16} className="w-4 h-4 text-success" aria-hidden="true" /> Rapor Hazır</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      ID: <span className="font-mono">{report.verificationHash}</span>
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {new Date(report.generatedAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Aşı', value: report.annualVaccineCount },
                    { label: 'Hastalık', value: report.incidentCount },
                    { label: 'Randevu', value: report.appointments?.length ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="p-3 bg-bg-main rounded-sm text-center border border-border-main">
                      <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                      <p className="text-[11px] font-bold text-text-secondary uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button onClick={openPrint}
                    className="btn-primary py-3 text-sm flex items-center justify-center gap-2">
                    <Printer size={16} />
                    PDF Olarak İndir / Yazdır
                  </button>
                  <button onClick={copyShareLink}
                    className={`btn-secondary py-2.5 text-[13px] transition-all flex items-center justify-center gap-1.5 ${copied ? 'text-green-600 border-green-300 bg-green-50' : ''}`}>
                    {copied ? <><CheckCircle2 size={16} className="w-4 h-4 text-green-600" aria-hidden="true" /> Bağlantı kopyalandı!</> : <><LinkIcon size={16} className="w-4 h-4 text-primary" aria-hidden="true" /> Paylaşım Bağlantısı Oluştur</>}
                  </button>
                </div>

                <p className="text-[11px] text-text-secondary text-center mt-3">
                  Doğrulama Hash: <span className="font-mono">{report.verificationHash}</span> • ODI Pet OS tarafından oluşturuldu
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Dijital Belge Kasası (Vault UI) ── */}
          <div className="card-base p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xs bg-primary-soft text-primary flex items-center justify-center shrink-0 shadow-inner">
                <FirstAidIcon width={24} height={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-text-primary text-base">Dijital Belge Kasası</h3>
                <p className="text-xs text-text-secondary">Resmi evraklar, aşı kartı, sigorta ve tahliller</p>
              </div>
            </div>

            {/* Error Message if Any */}
            {error && (
              <div className="p-4 mb-4 rounded-xs bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-1.5">
                <AlertTriangle size={16} className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" /> {error}
              </div>
            )}

            {/* Document Upload Fields */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Belge adı (Örn: Pasaport Belgesi)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="flex-1 border border-border-main rounded-input px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="border border-border-main rounded-input px-3 py-2.5 text-sm outline-none bg-white focus:border-primary min-w-[200px]"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.slug} value={type.slug}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border-main hover:border-primary/50 text-text-secondary hover:text-primary rounded-btn py-5 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-sm font-semibold">{isUploading ? 'Yükleniyor...' : 'Belge Seç ve Yükle'}</span>
                </button>
              </div>
            </div>

            {/* Document List */}
            {loadingRecords ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border-main">
                {records.length === 0 ? (
                  <div className="text-sm text-text-secondary text-center py-6">Kayıtlı belge bulunmuyor.</div>
                ) : (
                  <div className="grid gap-2">
                    {records.map(record => {
                      const matchedType = DOCUMENT_TYPES.find(t => t.slug === record.type);
                      return (
                        <div key={record.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-sm border border-border-main/50 transition-all hover:bg-slate-100/50 hover:scale-[1.01]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xs bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-text-primary line-clamp-1">{record.title}</p>
                                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                  {matchedType ? matchedType.label : record.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary mt-0.5">{new Date(record.date).toLocaleDateString('tr-TR')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {record.document_path && (
                              <a href={record.document_path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline px-3 py-1.5 bg-primary-soft rounded-btn">
                                Görüntüle
                              </a>
                            )}
                            <button 
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1.5 rounded-btn text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Belge silme onayı — OPOS Cilt 3 (native confirm yerine) */}
      <ConfirmModal
        open={recordToDelete !== null}
        title="Belgeyi Sil"
        message="Bu belgeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={confirmDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  )
}
