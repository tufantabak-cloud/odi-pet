'use client'

import { useState } from 'react'

interface DeviceNotificationSettingsProps {
  onSave?: (settings: { motionAlerts: boolean; sensitivity: string; quietHours: boolean }) => void
  onCancel?: () => void
}

export default function DeviceNotificationSettings({ onSave, onCancel }: DeviceNotificationSettingsProps) {
  const [motionAlerts, setMotionAlerts] = useState(true)
  const [sensitivity, setSensitivity] = useState('medium')
  const [quietHours, setQuietHours] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      if (onSave) {
        onSave({ motionAlerts, sensitivity, quietHours })
      } else {
        setSuccessMsg('Bildirim ayarları başarıyla kaydedildi.')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    }, 1000)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-surface rounded-modal border border-border-main/60 p-6 shadow-xl flex flex-col justify-between min-h-[450px] transition-all duration-300">
      {/* Upper Section */}
      <div className="flex flex-col">
        {/* Screen Title */}
        <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight mb-8">
          Bildirim Ayarları
        </h2>

        {/* Section Wrapper - 32px spacing from screen title achieved via mb-8 (32px) */}
        <div className="flex flex-col mb-8">
          {/* Section Title */}
          <h3 className="text-[14px] font-black text-primary uppercase tracking-wider mb-4">
            Hareket Bildirimleri
          </h3>

          {/* List Container with 16px (gap-4) spacing between settings */}
          <div className="flex flex-col gap-4">
            
            {/* Setting Item 1: Toggle */}
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-[14px] text-text-secondary font-medium leading-normal flex-1">
                Evcil hayvanınızın hareketlerini algıladığımızda size haber verelim mi?
              </span>
              <button
                type="button"
                onClick={() => setMotionAlerts(!motionAlerts)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center shrink-0 ${
                  motionAlerts ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                aria-label="Bildirimleri Aç/Kapa"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    motionAlerts ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting Item 2: Sensitivity Dropdown */}
            <div className="flex flex-col gap-2 py-2">
              <span className="text-[14px] text-text-secondary font-medium leading-normal">
                Hassasiyeti buradan ayarlayabilirsiniz.
              </span>
              <select
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
                className="w-full input-base py-3 px-4 text-[14px] bg-white dark:bg-slate-900 border border-border-main rounded-xl cursor-pointer focus:outline-none focus:border-primary transition-all"
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta (Önerilen)</option>
                <option value="high">Yüksek</option>
              </select>
            </div>

          </div>
        </div>

        {/* System Notifications Section */}
        <div className="flex flex-col">
          <h3 className="text-[14px] font-black text-primary uppercase tracking-wider mb-4">
            Sistem Bildirimleri
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-[14px] text-text-secondary font-medium leading-normal flex-1">
                22:00 - 08:00 arası bildirimleri sessize al (Sessiz Saatler)
              </span>
              <button
                type="button"
                onClick={() => setQuietHours(!quietHours)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center shrink-0 ${
                  quietHours ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                aria-label="Sessiz Saatleri Aç/Kapa"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    quietHours ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="mt-8 flex flex-col gap-3">
        {successMsg && <div role="alert" className="p-3 bg-success/10 text-success text-[13px] font-bold rounded-xl text-center border border-success/20">{successMsg}</div>}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-base text-center shadow-md"
        >
          {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="w-full text-text-secondary hover:text-text-primary text-[13px] font-bold py-2 transition-all text-center"
          >
            Vazgeç
          </button>
        )}
      </div>
    </div>
  )
}
