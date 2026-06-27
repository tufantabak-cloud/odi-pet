'use client'

import { useState, useEffect } from 'react'

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
    }, 800) // Beautiful simulated network latency
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">⚙️ Settings & Feature Flags</h1>
          <p className="text-[14px] text-text-secondary mt-1">Configure global application variables, manage AI models, and toggle real-time feature flags.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 shadow-soft min-w-[140px] justify-center"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>💾 Save Changes</>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-main gap-2">
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-5 py-3 text-[14px] font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'flags'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          🚩 Feature Flags
        </button>
        <button
          onClick={() => setActiveTab('params')}
          className={`px-5 py-3 text-[14px] font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'params'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          📊 Global Parameters
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'flags' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
          {/* Card 1: AI Vet Advanced Insights */}
          <div className="card-base p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[24px]">🤖</span>
                <button
                  onClick={() => handleToggle('aiVetAdvancedInsights')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    flags.aiVetAdvancedInsights ? 'bg-primary' : 'bg-bg-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                      flags.aiVetAdvancedInsights ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mt-4">AI Vet Conversational Depth</h3>
              <p className="text-[13px] text-text-secondary">
                Enable rich, detailed conversational diagnostics instead of strict 3-sentence basic health ratings.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary">MODULE: HEALTH & AI</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                flags.aiVetAdvancedInsights ? 'bg-emerald-50 text-emerald-600' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.aiVetAdvancedInsights ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          {/* Card 2: Automated Email/SMS Alerts */}
          <div className="card-base p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[24px]">✉️</span>
                <button
                  onClick={() => handleToggle('automatedEmailAlerts')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    flags.automatedEmailAlerts ? 'bg-primary' : 'bg-bg-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                      flags.automatedEmailAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mt-4">Automated Vaccine Alerts</h3>
              <p className="text-[13px] text-text-secondary">
                Send automatic push notifications, Telegram messages, and emails when a pet has overdue vaccine protocols.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary">MODULE: NOTIFICATIONS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                flags.automatedEmailAlerts ? 'bg-emerald-50 text-emerald-600' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.automatedEmailAlerts ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          {/* Card 3: Direct Clinic Approvals */}
          <div className="card-base p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[24px]">🏥</span>
                <button
                  onClick={() => handleToggle('directClinicApprovals')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    flags.directClinicApprovals ? 'bg-primary' : 'bg-bg-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                      flags.directClinicApprovals ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mt-4">Bypass Clinic Approval Queue</h3>
              <p className="text-[13px] text-text-secondary">
                Automatically approve veterinary clinic self-registrations and grant active status instantly.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary">MODULE: CLINIC PIPELINE</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                flags.directClinicApprovals ? 'bg-emerald-50 text-emerald-600' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.directClinicApprovals ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          {/* Card 4: Maintenance Mode */}
          <div className="card-base p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[24px]">🚧</span>
                <button
                  onClick={() => handleToggle('maintenanceMode')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    flags.maintenanceMode ? 'bg-primary' : 'bg-bg-main'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                      flags.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mt-4">Global Maintenance Mode</h3>
              <p className="text-[13px] text-text-secondary">
                Restrict public access and display a friendly, brand-aligned setup/maintenance banner to users.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary">MODULE: SYSTEM GATEWAY</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                flags.maintenanceMode ? 'bg-rose-50 text-rose-600' : 'bg-bg-main text-text-secondary'
              }`}>
                {flags.maintenanceMode ? 'ACTIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-base p-8 space-y-6 stagger-children">
          <h2 className="text-[18px] font-black text-text-primary border-b border-border-main pb-4">📊 System Parameters & Sliders</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free User Daily AI Vet Cap */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-bold text-text-primary">Daily Free AI Vet Cap</label>
                <span className="badge-primary">{params.dailyFreeAiCap} queries/day</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={params.dailyFreeAiCap}
                onChange={e => handleParamChange('dailyFreeAiCap', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-text-secondary">Maximum number of health analyses a standard user can request in 24 hours.</p>
            </div>

            {/* Model Temperature */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-bold text-text-primary">LLM Model Temperature</label>
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
              <p className="text-[11px] text-text-secondary">Controls creativity: 0.1 is strict & deterministic, 1.0 is highly creative.</p>
            </div>

            {/* Default Grace Period */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-bold text-text-primary">Vaccine Delay Grace Period</label>
                <span className="badge-primary">{params.vaccineGracePeriodDays} days</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={params.vaccineGracePeriodDays}
                onChange={e => handleParamChange('vaccineGracePeriodDays', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-text-secondary">Buffer period before a vaccine is officially flagged as "overdue" instead of "delayed".</p>
            </div>

            {/* API Rate Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-bold text-text-primary">Global API Rate Limit</label>
                <span className="badge-primary">{params.apiRateLimit} req/min</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                value={params.apiRateLimit}
                onChange={e => handleParamChange('apiRateLimit', parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-text-secondary">Requests allowed per minute per client IP before rate limit blocks are triggered.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-medium flex items-center gap-3 border border-border-main animate-scaleIn z-50">
          <span className="text-[18px]">✨</span>
          <span className="text-[13px] font-bold">System settings and feature flags updated successfully!</span>
        </div>
      )}
    </div>
  )
}
