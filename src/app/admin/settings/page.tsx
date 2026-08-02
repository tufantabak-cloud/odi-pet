'use client'

import { useState, useEffect } from 'react'
import { Settings, Flag, Sliders, Sparkles, Mail, Building2, AlertTriangle, Save, CheckCircle2, RotateCw } from 'lucide-react'

interface FeatureFlags {
  aiVetAdvancedInsights: boolean
  automatedEmailAlerts: boolean
  maintenanceMode: boolean
  directClinicApprovals: boolean
}

interface SystemParams {
  dailyFreeAiCap: number
  apiRateLimit: number
  vaccineGracePeriodDays: number
  aiTemperature: number
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlags>({
    aiVetAdvancedInsights: true,
    automatedEmailAlerts: true,
    maintenanceMode: false,
    directClinicApprovals: false,
  })

  const [params, setParams] = useState<SystemParams>({
    dailyFreeAiCap: 5,
    apiRateLimit: 60,
    vaccineGracePeriodDays: 14,
    aiTemperature: 0.7,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [activeTab, setActiveTab] = useState<'flags' | 'params'>('flags')

  // Load from localStorage on mount
  useEffect(() => {
    const savedFlags = localStorage.getItem('odi_admin_flags')
    const savedParams = localStorage.getItem('odi_admin_params')
    
    if (savedFlags) {
      try { setFlags(JSON.parse(savedFlags)) } catch (e) { console.error(e) }
    }
    if (savedParams) {
      try { setParams(JSON.parse(savedParams)) } catch (e) { console.error(e) }
    }
  }, [])

  const handleToggle = (key: keyof FeatureFlags) => {
    setFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleParamChange = (key: keyof SystemParams, value: number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      localStorage.setItem('odi_admin_flags', JSON.stringify(flags))
      localStorage.setItem('odi_admin_params', JSON.stringify(params))
      setIsSaving(false)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }, 800)
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-purple-600 shrink-0" />
            <span>Ayarlar & Özellik Bayrakları</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Küresel uygulama değişkenlerini yapılandırın, AI modellerini yönetin ve canlı özellik bayraklarını güncelleyin.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 shadow-xs min-w-[150px] justify-center text-xs font-bold py-2.5 px-4 rounded-xl active:scale-[0.98]"
        >
          {isSaving ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-white" />
              <span>Kaydediliyor…</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Değişiklikleri Kaydet</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-main gap-2">
        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer active:scale-[0.98] ${
            activeTab === 'flags'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Flag className="w-4 h-4 shrink-0" />
          <span>Özellik Bayrakları (Feature Flags)</span>
        </button>
        <button
          onClick={() => setActiveTab('params')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer active:scale-[0.98] ${
            activeTab === 'params'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>Sistem Parametreleri</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'flags' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
          {/* Card 1: AI Vet Advanced Insights */}
          <div className="card-base p-6 flex flex-col justify-between rounded-3xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <button
                  onClick={() => handleToggle('aiVetAdvancedInsights')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                    flags.aiVetAdvancedInsights ? 'bg-primary' : 'bg-bg-main border border-border-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-all duration-300 ${
                      flags.aiVetAdvancedInsights ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-4">AI-Vet Diyalog Derinliği</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Temel 3 cümlelik sağlık puanı yerine zengin ve detaylı konuşma tabanlı teşhis önerilerini aktif edin.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-wider">MODÜL: SAĞLIK & AI</span>
              <span className={`text-2xs font-bold px-2.5 py-0.5 rounded-full ${
                flags.aiVetAdvancedInsights ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.aiVetAdvancedInsights ? 'AKTİF' : 'PASİF'}
              </span>
            </div>
          </div>

          {/* Card 2: Automated Email/SMS Alerts */}
          <div className="card-base p-6 flex flex-col justify-between rounded-3xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
                <button
                  onClick={() => handleToggle('automatedEmailAlerts')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                    flags.automatedEmailAlerts ? 'bg-primary' : 'bg-bg-main border border-border-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-all duration-300 ${
                      flags.automatedEmailAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-4">Otomatik Aşı Bildirimleri</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Evcil hayvanın gecikmiş aşı protokolü olduğunda otomatik push bildirimleri ve e-postalar gönderin.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-wider">MODÜL: BİLDİRİMLER</span>
              <span className={`text-2xs font-bold px-2.5 py-0.5 rounded-full ${
                flags.automatedEmailAlerts ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.automatedEmailAlerts ? 'AKTİF' : 'PASİF'}
              </span>
            </div>
          </div>

          {/* Card 3: Direct Clinic Approvals */}
          <div className="card-base p-6 flex flex-col justify-between rounded-3xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <button
                  onClick={() => handleToggle('directClinicApprovals')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                    flags.directClinicApprovals ? 'bg-primary' : 'bg-bg-main border border-border-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-all duration-300 ${
                      flags.directClinicApprovals ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-4">Doğrudan Klinik Onay Kuyruğu</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Veteriner kliniği kendi kendine kayıt olduğunda manuel inceleme olmadan anında aktif statü verin.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-wider">MODÜL: KLİNİK KANALI</span>
              <span className={`text-2xs font-bold px-2.5 py-0.5 rounded-full ${
                flags.directClinicApprovals ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.directClinicApprovals ? 'AKTİF' : 'PASİF'}
              </span>
            </div>
          </div>

          {/* Card 4: Maintenance Mode */}
          <div className="card-base p-6 flex flex-col justify-between rounded-3xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <button
                  onClick={() => handleToggle('maintenanceMode')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                    flags.maintenanceMode ? 'bg-primary' : 'bg-bg-main border border-border-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-all duration-300 ${
                      flags.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-4">Genel Bakım Modu</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Genel erişimi kısıtlayarak kullanıcılara marka standartlarında bakım ve güncelleme ekranı gösterin.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-wider">MODÜL: SİSTEM GEÇİDİ</span>
              <span className={`text-2xs font-bold px-2.5 py-0.5 rounded-full ${
                flags.maintenanceMode ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.maintenanceMode ? 'AKTİF' : 'KAPALI'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-base p-8 space-y-6 stagger-children rounded-3xl">
          <h2 className="text-lg font-black text-text-primary border-b border-border-main pb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <span>Sistem Parametreleri & Sınırlar</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free User Daily AI Vet Cap */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-primary">Ücretsiz Günlük AI Sorgu Sınırı</label>
                <span className="badge-primary">{params.dailyFreeAiCap} sorgu/gün</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={params.dailyFreeAiCap}
                onChange={e => handleParamChange('dailyFreeAiCap', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-2xs text-text-secondary">Standart kullanıcının 24 saat içinde talep edebileceği maksimum sağlık analizi sayısı.</p>
            </div>

            {/* Model Temperature */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-primary">LLM Model Sıcaklığı (Temperature)</label>
                <span className="badge-primary">{params.aiTemperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={params.aiTemperature}
                onChange={e => handleParamChange('aiTemperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-2xs text-text-secondary">Yaratıcılık kontrolü: 0.1 katı ve deterministiktir, 1.0 daha esnektir.</p>
            </div>

            {/* Default Grace Period */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-primary">Aşı Gecikme Tolerans Süresi</label>
                <span className="badge-primary">{params.vaccineGracePeriodDays} gün</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={params.vaccineGracePeriodDays}
                onChange={e => handleParamChange('vaccineGracePeriodDays', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-2xs text-text-secondary">Bir aşının resmen "gecikti" statüsüne alınmadan önceki tolerans süresi.</p>
            </div>

            {/* API Rate Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-primary">Küresel API İstek Sınırı</label>
                <span className="badge-primary">{params.apiRateLimit} istek/dk</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                value={params.apiRateLimit}
                onChange={e => handleParamChange('apiRateLimit', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-2xs text-text-secondary">IP başına dakikada izin verilen maksimum API istek sayısı.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-medium flex items-center gap-3 border border-border-main animate-scaleIn z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">Sistem ayarları ve özellik bayrakları başarıyla güncellendi!</span>
        </div>
      )}
    </div>
  )
}
