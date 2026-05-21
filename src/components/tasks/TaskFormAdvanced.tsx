import React, { useState } from 'react';
import { TaskCategory } from '@/lib/tasks/taskDefaults';

export interface TaskFormData {
  date: string;
  time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endCondition: 'never' | 'date' | 'occurrences';
  endDate?: string;
  endOccurrences?: number;
  notificationEnabled: boolean;
  notificationMinutes: number;
  notes: string;
  metadata?: any;
}

interface TaskFormAdvancedProps {
  category: TaskCategory;
  formData: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  isOpen: boolean;
  onToggle: () => void;
  /** Geçmişe yönelik kayıt (aşı, tedavi) için min tarihi devre dışı bırakır */
  allowPastDate?: boolean;
}

const END_OPTIONS = [
  { value: 'never',       label: 'Sürekli',   icon: '∞' },
  { value: 'date',        label: 'Tarihe kadar', icon: '📅' },
  { value: 'occurrences', label: 'Tekrar sayısı', icon: '#' },
] as const;

const FREQ_LABEL: Record<string, string> = {
  daily: 'gün',
  weekly: 'hafta',
  monthly: 'ay',
  yearly: 'yıl',
};

export default function TaskFormAdvanced({
  category,
  formData,
  onChange,
  isOpen,
  onToggle,
  allowPastDate = false,
}: TaskFormAdvancedProps) {
  const today = new Date().toISOString().split('T')[0];
  const isRecurring = formData.frequency !== 'once';

  return (
    <div className="mt-4 animate-fadeInUp">

      {/* ── Tarih & Saat — daima görünür, accordion dışında ──────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tarih</label>
          <input
            type="date"
            // allowPastDate=true ise min kısıtı yok (geçmiş kayıt desteği)
            min={allowPastDate ? undefined : today}
            value={formData.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="input-base py-3 text-[14px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Saat</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => onChange({ time: e.target.value })}
            className="input-base py-3 text-[14px]"
          />
        </div>
      </div>

      {/* ── Gelişmiş Ayarlar accordion (Tekrar, Bildirim, Not) ────── */}
      <div className="border-t border-border-main/50 pt-4">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between py-2 text-left group cursor-pointer focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black text-text-primary">⚙️ Gelişmiş Ayarlar</span>
            {/* Seçili özet — kapalıyken kullanıcıya bilgi verir */}
            {!isOpen && (
              <span className="text-[11px] font-semibold text-text-secondary bg-bg-main px-2 py-0.5 rounded-full border border-border-main">
                {isRecurring
                  ? `Her ${formData.interval > 1 ? formData.interval + ' ' : ''}${FREQ_LABEL[formData.frequency] ?? formData.frequency}`
                  : 'Tek seferlik'}
                {formData.notificationEnabled ? ` · ${formData.notificationMinutes === 0 ? 'Bildirim açık' : formData.notificationMinutes < 60 ? `${formData.notificationMinutes} dk önce` : formData.notificationMinutes < 1440 ? `${formData.notificationMinutes / 60} saat önce` : `${formData.notificationMinutes / 1440} gün önce`}` : ''}
              </span>
            )}
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="flex flex-col gap-5 mt-4">

            {/* Metadata: Vet / Beslenme */}
            {category === 'Veteriner' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Veteriner / Klinik Adı</label>
                <input
                  type="text"
                  value={formData.metadata?.professional_name || ''}
                  onChange={(e) => onChange({ metadata: { ...formData.metadata, professional_name: e.target.value } })}
                  placeholder="Örn: Dr. Ali Yılmaz veya Vadi Klinik"
                  className="input-base py-3 text-[14px]"
                />
              </div>
            )}

            {category === 'Beslenme' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Mama Tipi / Markası</label>
                <input
                  type="text"
                  value={formData.metadata?.supply_type || ''}
                  onChange={(e) => onChange({ metadata: { ...formData.metadata, supply_type: e.target.value } })}
                  placeholder="Örn: Royal Canin Kısırlaştırılmış Kuru Mama"
                  className="input-base py-3 text-[14px]"
                />
              </div>
            )}

            {/* ── Tekrar Sıklığı ──────────────────────────────────── */}
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-bg-main border border-border-main">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tekrar Sıklığı</label>

              {/* Frequency pills */}
              <div className="grid grid-cols-5 gap-1.5">
                {([
                  { value: 'once',    label: 'Tek Sefer' },
                  { value: 'daily',   label: 'Günlük'    },
                  { value: 'weekly',  label: 'Haftalık'  },
                  { value: 'monthly', label: 'Aylık'     },
                  { value: 'yearly',  label: 'Yıllık'    },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const newFreq = opt.value as any;
                      let newNotificationMinutes = formData.notificationMinutes;
                      if (newNotificationMinutes !== 0) {
                        if (newFreq === 'daily' && newNotificationMinutes >= 1440) {
                          newNotificationMinutes = 0; // Default to Zamanında
                        } else if (newFreq !== 'daily' && newFreq !== 'once' && newNotificationMinutes < 1440) {
                          newNotificationMinutes = 0; // Default to Zamanında
                        }
                      }
                      onChange({ frequency: newFreq, notificationMinutes: newNotificationMinutes });
                    }}
                    className={`py-2.5 px-1 rounded-xl text-[11px] font-extrabold border transition-all text-center ${
                      formData.frequency === opt.value
                        ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                        : 'bg-white text-text-secondary border-border-main hover:border-primary/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Interval stepper — sadece tekrar seçilince */}
              {isRecurring && (
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[11px] font-bold text-text-secondary">
                    Her kaç {FREQ_LABEL[formData.frequency]}de bir?
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Quick presets */}
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onChange({ interval: n })}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all ${
                          formData.interval === n
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-white text-text-secondary border-border-main hover:border-primary/30'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    {/* Custom input for larger values */}
                    <div className="flex items-center bg-white border border-border-main rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onChange({ interval: Math.max(1, formData.interval - 1) })}
                        className="px-3 py-2.5 text-[16px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={formData.interval}
                        onChange={(e) => onChange({ interval: parseInt(e.target.value) || 1 })}
                        className="w-10 text-center text-[14px] font-extrabold text-text-primary border-0 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => onChange({ interval: formData.interval + 1 })}
                        className="px-3 py-2.5 text-[16px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* Readable summary */}
                  <p className="text-[11px] text-primary font-semibold mt-0.5">
                    → Her {formData.interval > 1 ? `${formData.interval} ` : ''}{FREQ_LABEL[formData.frequency]} tekrarlanacak
                  </p>
                </div>
              )}

              {/* ── Bitiş Kuralı — tekrar seçilince görünür ── */}
              {isRecurring && (
                <div className="mt-1 pt-3 border-t border-border-main/50 flex flex-col gap-3">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Ne zaman bitsin?</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {END_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ endCondition: opt.value as any })}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                          formData.endCondition === opt.value
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-text-secondary border-border-main hover:border-primary/40 hover:bg-bg-main'
                        }`}
                      >
                        <span className="text-[14px] mb-0.5">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {formData.endCondition === 'date' && (
                    <input
                      type="date"
                      min={formData.date || today}
                      value={formData.endDate || ''}
                      onChange={(e) => onChange({ endDate: e.target.value })}
                      className="input-base py-2.5 text-[13px]"
                    />
                  )}
                  {formData.endCondition === 'occurrences' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={formData.endOccurrences || 1}
                        onChange={(e) => onChange({ endOccurrences: parseInt(e.target.value) || 1 })}
                        className="input-base py-2.5 w-20 text-[13px] text-center"
                      />
                      <span className="text-[12px] text-text-secondary">kez tekrarlandıktan sonra bitir</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Bildirimler ─────────────────────────────────────── */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-bg-main border border-border-main gap-3">
              <div className="min-w-0 shrink">
                <p className="text-[13px] font-bold text-text-primary">Bildirimler</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Görev zamanı yaklaştığında hatırlat</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {formData.notificationEnabled && (
                  <select
                    value={formData.notificationMinutes}
                    onChange={(e) => onChange({ notificationMinutes: parseInt(e.target.value) })}
                    className="input-base py-1.5 text-[12px] bg-white cursor-pointer w-auto"
                  >
                    {formData.frequency === 'daily' ? (
                      <>
                        <option value={0}>Zamanında</option>
                        <option value={60}>1 saat önce</option>
                        <option value={180}>3 saat önce</option>
                        <option value={300}>5 saat önce</option>
                        <option value={420}>7 saat önce</option>
                      </>
                    ) : formData.frequency === 'once' ? (
                      <>
                        <option value={0}>Zamanında</option>
                        <option value={60}>1 saat önce</option>
                        <option value={180}>3 saat önce</option>
                        <option value={1440}>1 gün önce</option>
                        <option value={4320}>3 gün önce</option>
                        <option value={7200}>5 gün önce</option>
                        <option value={10080}>7 gün önce</option>
                      </>
                    ) : (
                      <>
                        <option value={0}>Zamanında</option>
                        <option value={1440}>1 gün önce</option>
                        <option value={4320}>3 gün önce</option>
                        <option value={7200}>5 gün önce</option>
                        <option value={10080}>7 gün önce</option>
                      </>
                    )}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => onChange({ notificationEnabled: !formData.notificationEnabled })}
                  className={`w-11 h-6 rounded-full p-1 transition-colors ${formData.notificationEnabled ? 'bg-primary' : 'bg-border-main'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.notificationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* ── Görev Notu ──────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Görev Notu (İsteğe Bağlı)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Görev ile ilgili eklemek istediğiniz detaylar..."
                className="input-base py-3 text-[14px] min-h-[80px] resize-none"
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
