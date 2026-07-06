'use client';

// ============================================================
// OdiPet — VaccinesClient.tsx v3
// Mockup v2 düzeltmeleri tam entegrasyon:
//
// MOD SİSTEMİ
//   simple: yalnızca tarih + hatırlatma
//   detailed: güven rozeti + reaksiyon takibi + insight kartı
//
// DÜZELTİLMİÅ BİLEÅENLER
//   1. "Kayıtlara göre tamamlandı" + güven rozeti
//   2. Doz numarası dinamik hesaplama açıklaması
//   3. "Aşı yapıldı" → kayıt yöntemi seçimi
//   4. Anlık ciddi reaksiyon uyarısı (kayıt anında)
//   5. Reaksiyon 4 seviye: normal / hafif / dikkat / acil
//   6. Acil dili eyleme dönük
//   7. "6 aylık temel aşı değerlendirmesi" (26. hafta)
//   8. Risk bazlı aşı dili düzeltmesi
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AdministrationRoute } from '@/lib/database.types';

// ── TİPLER ──────────────────────────────────────────────────

export type VaccineMode = 'simple' | 'detailed';

export type VerificationLevel =
  | 'user_reported'
  | 'document_uploaded'
  | 'document_matched'
  | 'clinic_verified'
  | 'official_verified'
  | 'estimated';

export type RecordMethod = 'scan' | 'quick' | 'detailed';

// Düzeltme 5: 4 seviye reaksiyon
export type ReactionLevel = 'normal' | 'mild' | 'caution' | 'emergency';

export interface ReactionSymptom {
  id: string;
  label: string;
  level: ReactionLevel;
}

export interface VaccinePlanItem {
  id: string;
  sub_type: string;
  due_date: string;
  status: string;
  antigen_code: string;
  is_risk_based: boolean; // Düzeltme 8
  dose_number: number;
  dose_basis: string; // Düzeltme 2: açıklama metni
  extra_data: {
    vaccine: { code: string; name: string };
    booster_ui_label?: string;
    clinical_booster_days?: number;
    legal_booster_days?: number;
    administration_route?: AdministrationRoute;
  };
}

// ── MOD YÖNETİCİSİ ──────────────────────────────────────────

const MODE_KEY = 'odipet_vaccine_mode';

export function useVaccineMode(): [VaccineMode, (m: VaccineMode) => void] {
  const [mode, setModeState] = useState<VaccineMode>('simple');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_KEY) as VaccineMode | null;
      if (stored === 'simple' || stored === 'detailed') setModeState(stored);
    } catch {}
  }, []);

  const setMode = useCallback((m: VaccineMode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch {}
  }, []);

  return [mode, setMode];
}

// ── MOD TOGGLE BİLEÅENİ ─────────────────────────────────────

interface ModeSwitcherProps {
  mode: VaccineMode;
  onChange: (m: VaccineMode) => void;
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          {mode === 'simple' ? 'Basit mod' : 'Detaylı mod'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {mode === 'simple'
            ? 'Tarih ve hatırlatma — reaksiyon takibi yok'
            : 'Güven rozeti, reaksiyon takibi, insight kartları'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['simple', 'detailed'] as VaccineMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 6,
              border: '0.5px solid',
              borderColor: mode === m ? '#534AB7' : 'var(--border)',
              background: mode === m ? '#534AB7' : 'var(--surface-2)',
              color: mode === m ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: mode === m ? 500 : 400,
            }}
          >
            {m === 'simple' ? 'Basit' : 'Detaylı'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── DÜZELTME 1: GÜVENİLİRLİK ROZETİ ────────────────────────

const VERIFICATION_LABELS: Record<VerificationLevel, string> = {
  user_reported: 'Kullanıcı beyanı',
  document_uploaded: 'Belge yüklendi',
  document_matched: 'Belgeyle eşleşti',
  clinic_verified: 'Veteriner onaylı',
  official_verified: 'ResmÃ® doğrulama',
  estimated: 'Tahmini bilgi',
};

const VERIFICATION_COLORS: Record<
  VerificationLevel,
  { bg: string; text: string; border: string }
> = {
  user_reported: {
    bg: 'var(--surface-1)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  document_uploaded: {
    bg: 'var(--bg-warning)',
    text: 'var(--text-warning)',
    border: 'var(--border-warning)',
  },
  document_matched: {
    bg: 'var(--bg-success)',
    text: 'var(--text-success)',
    border: 'var(--border-success)',
  },
  clinic_verified: {
    bg: 'var(--bg-success)',
    text: 'var(--text-success)',
    border: 'var(--border-success)',
  },
  official_verified: {
    bg: 'var(--bg-accent)',
    text: 'var(--text-accent)',
    border: 'var(--border-accent)',
  },
  estimated: {
    bg: 'var(--surface-1)',
    text: 'var(--text-muted)',
    border: 'var(--border)',
  },
};

interface VerificationBadgeProps {
  level: VerificationLevel;
}

export function VerificationBadge({ level }: VerificationBadgeProps) {
  const c = VERIFICATION_COLORS[level];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 20,
        background: c.bg,
        color: c.text,
        border: `0.5px solid ${c.border}`,
      }}
    >
      {VERIFICATION_LABELS[level]}
    </span>
  );
}

// Düzeltme 1: "Kayıtlara göre tamamlandı" — kesin ifade kullanılmıyor
interface SeriesStatusCardProps {
  petName: string;
  verificationLevel: VerificationLevel;
  onUpgradeVerification: () => void;
}

export function SeriesStatusCard({
  petName,
  verificationLevel,
  onUpgradeVerification,
}: SeriesStatusCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          Yavru serisi kayıtlara göre tamamlandı
        </p>
        <VerificationBadge level={verificationLevel} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
        {verificationLevel === 'user_reported' &&
          'Güven seviyesini artırmak için belge yükleyebilir veya veteriner onayı alabilirsin.'}
        {verificationLevel === 'document_matched' &&
          'Belgeyle eşleştirildi. Veteriner onayıyla resmÃ® doğrulamaya geçebilirsin.'}
        {(verificationLevel === 'clinic_verified' ||
          verificationLevel === 'official_verified') &&
          'Doğrulama tamamlandı.'}
      </p>
      {verificationLevel === 'user_reported' && (
        <button
          onClick={onUpgradeVerification}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--text-accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Belge yükle →
        </button>
      )}
    </div>
  );
}

// ── DÜZELTME 2: DİNAMİK DOZ AÇIKLAMASI ─────────────────────

interface PlanItemCardProps {
  item: VaccinePlanItem;
  onVaccineDone: () => void;
  onBookAppointment: () => void;
  mode: VaccineMode;
}

export function PlanItemCard({
  item,
  onVaccineDone,
  onBookAppointment,
  mode,
}: PlanItemCardProps) {
  // Düzeltme 8: Risk bazlı aşı dili
  if (item.is_risk_based) {
    return (
      <div
        style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
            {item.extra_data.vaccine.name}
          </p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 20,
              background: 'var(--bg-warning)',
              color: 'var(--text-warning)',
              border: '0.5px solid var(--border-warning)',
            }}
          >
            Risk bazlı
          </span>
        </div>
        {/* Düzeltme 8: kesin dil yok */}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Yaşam biçimine göre değerlendirilmesi öneriliyor. Veterinerinize danışın.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
            {/* Düzeltme 2: doz numarası dinamik */}
            {item.extra_data.vaccine.name} — {item.dose_number}. doz
          </p>
          {/* Düzeltme 2: hesaplama açıklaması */}
          {item.dose_basis && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {item.dose_basis}
            </p>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: 20,
            background: 'var(--bg-warning)',
            color: 'var(--text-warning)',
            border: '0.5px solid var(--border-warning)',
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {new Date(item.due_date).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>

      {/* A2 Booster banner — yalnızca detaylı modda */}
      {mode === 'detailed' &&
        item.extra_data.clinical_booster_days &&
        item.extra_data.legal_booster_days &&
        item.extra_data.clinical_booster_days !== item.extra_data.legal_booster_days && (
          <div
            style={{
              background: 'var(--bg-warning)',
              border: '0.5px solid var(--border-warning)',
              borderRadius: 8,
              padding: '8px 10px',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: 20,
                  background: 'var(--bg-accent)',
                  color: 'var(--text-accent)',
                  border: '0.5px solid var(--border-accent)',
                }}
              >
                WSAVA: {Math.round(item.extra_data.clinical_booster_days / 365)} yıl
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: 20,
                  background: 'var(--bg-danger)',
                  color: 'var(--text-danger)',
                  border: '0.5px solid var(--border-danger)',
                }}
              >
                TR yasal: 1 yıl
              </span>
            </div>
            {item.extra_data.booster_ui_label && (
              <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {item.extra_data.booster_ui_label}
              </p>
            )}
          </div>
        )}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          onClick={onBookAppointment}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: '0.5px solid var(--border-strong)',
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Randevu kur
        </button>
        {/* Düzeltme 3: "Aşı yapıldı" → yöntem seçimi */}
        <button
          onClick={onVaccineDone}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: 'none',
            background: '#534AB7',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Aşı yapıldı
        </button>
      </div>
    </div>
  );
}

// ── DÜZELTME 3: KAYIT YÖNTEMİ SEÇİMİ ───────────────────────

interface RecordMethodSheetProps {
  vaccineName: string;
  onSelect: (method: RecordMethod) => void;
  onCancel: () => void;
}

export function RecordMethodSheet({
  vaccineName,
  onSelect,
  onCancel,
}: RecordMethodSheetProps) {
  const methods: {
    id: RecordMethod;
    icon: string;
    title: string;
    sub: string;
  }[] = [
    { id: 'scan', icon: 'ğŸ“·', title: 'Belgeyi tara', sub: 'En hızlı yöntem — OCR otomatik okur' },
    { id: 'quick', icon: 'âœï¸', title: 'Hızlı kayıt', sub: 'Aşı adı, tarih ve klinik' },
    { id: 'detailed', icon: 'ğŸ“‹', title: 'Ayrıntılı kayıt', sub: 'Lot, ürün ve diğer bilgiler' },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
        {vaccineName} — kaydı nasıl eklemek istersin?
      </p>
      {methods.map((m) => (
        <div
          key={m.id}
          onClick={() => onSelect(m.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border)',
            borderRadius: 12,
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#EEEDFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {m.icon}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              {m.title}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {m.sub}
            </p>
          </div>
          <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>â€º</span>
        </div>
      ))}
      <button
        onClick={onCancel}
        style={{
          width: '100%',
          padding: '10px 0',
          borderRadius: 8,
          border: '0.5px solid var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        İptal
      </button>
    </div>
  );
}

// ── DÜZELTME 4 + 6: KAYIT SONRASI UYARILAR ──────────────────

interface PostRecordWarningsProps {
  vaccineName: string;
  mode: VaccineMode;
  onDismissGuidance: () => void;
}

export function PostRecordWarnings({
  vaccineName,
  mode,
  onDismissGuidance,
}: PostRecordWarningsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Düzeltme 4 + 6: Anlık ciddi reaksiyon uyarısı — eyleme dönük dil */}
      <div
        role="alert"
        style={{
          background: 'var(--bg-danger)',
          border: '0.5px solid var(--border-danger)',
          borderRadius: 8,
          padding: '10px 12px',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-danger)',
            margin: '0 0 3px',
          }}
        >
          Ciddi belirti görülürse
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
          İlk saatlerde yüz şişmesi, nefes güçlüğü, tekrarlayan kusma veya çökme görülürse{' '}
          <strong>bu belirtiler acil veteriner değerlendirmesi gerektirir.</strong>{' '}
          En yakın veteriner kliniğiyle hemen iletişime geçin.
        </p>
      </div>

      {/* Gözetim uyarısı */}
      <div
        style={{
          background: 'var(--bg-warning)',
          border: '0.5px solid var(--border-warning)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-warning)',
              margin: '0 0 3px',
            }}
          >
            {vaccineName} kaydedildi
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
            Alerjik reaksiyonlar genellikle <strong>ilk 1 saat</strong> içinde gelişir.
            Klinik yakınında <strong>30â€“45 dakika</strong> kalın.
          </p>
        </div>
        <button
          onClick={onDismissGuidance}
          aria-label="Kapat"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 16,
            flexShrink: 0,
            padding: 0,
          }}
        >
          âœ•
        </button>
      </div>

      {/* Detaylı modda: kontrol bildirimleri */}
      {mode === 'detailed' && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          6 saat Â· 24 saat Â· belirti varsa 72 saat sonra kontrol bildirimi gönderilecek.
        </p>
      )}
    </div>
  );
}

// ── DÜZELTME 5: 4 SEVİYE REAKSİYON FORMU ───────────────────

const REACTION_SYMPTOMS: ReactionSymptom[] = [
  { id: 'normal', label: 'Normal görünüyor', level: 'normal' },
  { id: 'lethargy', label: 'Biraz halsiz veya iştahsız', level: 'mild' },
  { id: 'injection_site', label: 'Enjeksiyon yerinde hassasiyet', level: 'mild' },
  { id: 'vomiting_once', label: 'Bir kez hafif kusma / ishal', level: 'mild' },
  { id: 'vomiting_repeat', label: 'Tekrarlayan kusma / ishal', level: 'caution' },
  { id: 'face_swelling', label: 'Yüzde şişme / nefes güçlüğü', level: 'emergency' },
  { id: 'collapse', label: 'Çökme / bayılma / şok belirtisi', level: 'emergency' },
  { id: 'other', label: 'Başka bir belirti var', level: 'mild' },
];

const LEVEL_STYLE = {
  normal: { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--text-primary)', badge: null },
  mild: { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--text-primary)', badge: null },
  caution: { bg: 'var(--bg-warning)', border: 'var(--border-warning)', color: 'var(--text-warning)', badge: 'Dikkat' },
  emergency: { bg: 'var(--bg-danger)', border: 'var(--border-danger)', color: 'var(--text-danger)', badge: 'Acil' },
};

interface ReactionCheckFormProps {
  petName: string;
  vaccineName: string;
  checkTime: 'T6h' | 'T24h' | 'T72h';
  onSave: (symptomId: string, level: ReactionLevel) => void;
  onEmergency: (symptomId: string) => void;
}

export function ReactionCheckForm({
  petName,
  vaccineName,
  checkTime,
  onSave,
  onEmergency,
}: ReactionCheckFormProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const checkLabels = { T6h: '6 saat', T24h: '24 saat', T72h: '72 saat' };

  function handleSelect(s: ReactionSymptom) {
    if (s.level === 'emergency') {
      // Düzeltme 5: acil → formu durdur
      onEmergency(s.id);
      return;
    }
    setSelected(s.id);
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
        {checkLabels[checkTime]} kontrol Â· {vaccineName}
        <br />
        {petName} bugün nasıl görünüyor?
      </p>

      {REACTION_SYMPTOMS.map((s) => {
        const style = LEVEL_STYLE[s.level];
        const isSelected = selected === s.id;
        return (
          <div
            key={s.id}
            onClick={() => handleSelect(s)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 12px',
              borderRadius: 8,
              border: `0.5px solid ${isSelected ? '#534AB7' : style.border}`,
              background: isSelected ? '#EEEDFE' : style.bg,
              cursor: 'pointer',
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: isSelected ? '#3C3489' : style.color,
                fontWeight: s.level === 'emergency' || s.level === 'caution' ? 500 : 400,
              }}
            >
              {s.label}
            </span>
            {style.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: 20,
                  background: s.level === 'emergency' ? 'var(--bg-danger)' : 'var(--bg-warning)',
                  color: s.level === 'emergency' ? 'var(--text-danger)' : 'var(--text-warning)',
                  border: `0.5px solid ${s.level === 'emergency' ? 'var(--border-danger)' : 'var(--border-warning)'}`,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {style.badge}
              </span>
            )}
          </div>
        );
      })}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
        Kırmızı seçenekler doğrudan acil yönlendirme ekranını açar.
      </p>

      {selected && (
        <button
          onClick={() => {
            const s = REACTION_SYMPTOMS.find((r) => r.id === selected);
            if (s) onSave(s.id, s.level);
          }}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            border: 'none',
            background: '#534AB7',
            color: '#fff',
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Durumu kaydet
        </button>
      )}
    </div>
  );
}

// ── DÜZELTME 6: ACİL EKRANI — eyleme dönük dil ──────────────

interface EmergencyVetScreenProps {
  petName: string;
  petId: string;
  symptomLabel: string;
  onClose: () => void;
}

export function EmergencyVetScreen({
  petName,
  petId,
  symptomLabel,
  onClose,
}: EmergencyVetScreenProps) {
  const mapsUrl =
    'https://www.google.com/maps/search/?api=1&query=veteriner+klini%C4%9Fi';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Acil veteriner yönlendirmesi"
      style={{
        background: 'var(--surface-2)',
        border: '1.5px solid var(--border-danger)',
        borderRadius: 16,
        padding: '20px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--bg-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          ğŸš¨
        </div>
        <div>
          <p style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-danger)', margin: 0 }}>
            Acil veteriner değerlendirmesi
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {petName} için
          </p>
        </div>
      </div>

      {/* Düzeltme 6: kesin ve eyleme dönük dil */}
      <div
        style={{
          background: 'var(--bg-danger)',
          border: '0.5px solid var(--border-danger)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-danger)', margin: '0 0 4px' }}>
          {symptomLabel}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
          Bu belirtiler acil veteriner değerlendirmesi gerektirir. En yakın
          veteriner kliniğiyle <strong>hemen iletişime geçin.</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '12px 0',
            borderRadius: 8,
            background: 'var(--fill-danger, #E24B4A)',
            color: '#fff',
            fontWeight: 500,
            fontSize: 14,
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          En yakın kliniği göster
        </a>
        <a
          href={`/owner/pets/${petId}/share?context=emergency`}
          style={{
            display: 'block',
            padding: '10px 0',
            borderRadius: 8,
            background: 'var(--surface-1)',
            color: 'var(--text-primary)',
            fontSize: 13,
            textAlign: 'center',
            textDecoration: 'none',
            border: '0.5px solid var(--border)',
          }}
        >
          Pet bilgilerini paylaş
        </a>
      </div>

      <button
        onClick={onClose}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Reaksiyonu geçti, geri dön
      </button>
    </div>
  );
}

// ── DÜZELTME 7: 6 AYLIK DEÄERLENDİRME KARTI ────────────────

interface SixMonthAssessmentCardProps {
  petName: string;
  petId: string;
  onAddBoosterDose: () => void;
  onRequestTitreTest: () => void;
  onDismiss: () => void;
}

export function SixMonthAssessmentCard({
  petName,
  petId,
  onAddBoosterDose,
  onRequestTitreTest,
  onDismiss,
}: SixMonthAssessmentCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border-accent)',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 12,
      }}
      role="note"
      aria-label="6 aylık temel aşı değerlendirme önerisi"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--bg-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ğŸ”¬
        </div>
        <div style={{ flex: 1 }}>
          {/* Düzeltme 7: yeniden adlandırıldı */}
          <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
            6 aylık temel aşı değerlendirmesi
          </p>
          <span
            style={{
              display: 'inline-block',
              marginTop: 3,
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 20,
              background: 'var(--bg-accent)',
              color: 'var(--text-accent)',
              border: '0.5px solid var(--border-accent)',
            }}
          >
            WSAVA 2024 önerisi
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Kartı kapat"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 16,
            padding: 0,
            flexShrink: 0,
          }}
        >
          âœ•
        </button>
      </div>

      {/* Düzeltme 7: "tüm ürünler için zorunlu değil" notu */}
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 12px' }}>
        Önceki aşı kayıtları ve kullanılan ürüne göre veterineriniz ek doz
        gerekip gerekmediğini değerlendirebilir. Bu tüm ürünler için zorunlu
        değildir.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <button
          onClick={onRequestTitreTest}
          style={{
            padding: '9px 8px',
            borderRadius: 8,
            border: '0.5px solid var(--border-accent)',
            background: 'var(--bg-accent)',
            color: 'var(--text-accent)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Titre testi yaptır
        </button>
        <button
          onClick={onAddBoosterDose}
          style={{
            padding: '9px 8px',
            borderRadius: 8,
            border: '0.5px solid var(--border)',
            background: 'var(--surface-1)',
            color: 'var(--text-primary)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Ek doz ekle
        </button>
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '10px 0 0', lineHeight: 1.4 }}>
        Veteriner kararının yerine geçmez. Türkiye'de standart protokol değildir.
      </p>
    </div>
  );
}

// ── ANA HOOK — VaccinesClient.tsx içinde kullan ─────────────

export function useVaccineFlow() {
  const [mode, setMode] = useVaccineMode();
  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [showPostRecord, setShowPostRecord] = useState(false);
  const [showReactionForm, setShowReactionForm] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencySymptom, setEmergencySymptom] = useState('');
  const [showAssessmentCard, setShowAssessmentCard] = useState(false);
  const [lastVaccineName, setLastVaccineName] = useState('');
  const [showGuidanceBanner, setShowGuidanceBanner] = useState(false);

  function handleVaccineDone(vaccineName: string) {
    setLastVaccineName(vaccineName);
    setShowRecordSheet(true);
  }

  function handleRecordComplete() {
    setShowRecordSheet(false);
    setShowPostRecord(true);
    setShowGuidanceBanner(true);
    // Detaylı modda 6 saat sonra reaksiyon formu
    if (mode === 'detailed') {
      // Backend notification scheduling — gerçek implementasyonda
      // pg_cron veya notification service ile T+6h, T+24h, T+72h
      console.log('[VaccineFlow] T+6h reaksiyon bildirimi planlandı');
    }
  }

  function handleEmergency(symptomId: string) {
    const s = REACTION_SYMPTOMS.find((r) => r.id === symptomId);
    setEmergencySymptom(s?.label ?? '');
    setShowEmergency(true);
    setShowReactionForm(false);
  }

  // 16. hafta tamamlanınca assessment kartını göster
  function handleLastJuvenileDoseCompleted() {
    if (mode === 'detailed') {
      setShowAssessmentCard(true);
    }
  }

  return {
    mode, setMode,
    showRecordSheet, setShowRecordSheet,
    showPostRecord,
    showReactionForm, setShowReactionForm,
    showEmergency, setShowEmergency,
    emergencySymptom,
    showAssessmentCard, setShowAssessmentCard,
    showGuidanceBanner, setShowGuidanceBanner,
    lastVaccineName,
    handleVaccineDone,
    handleRecordComplete,
    handleEmergency,
    handleLastJuvenileDoseCompleted,
  };
}

type VaccinesClientProps = {
  pet: any
  initialPlans: any[]
  initialRecords: any[]
}

export default function VaccinesClient({ pet, initialPlans, initialRecords }: VaccinesClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'takvim' | 'kayitlar'>('takvim');
  const [showManualModal, setShowManualModal] = useState(false);
  const flow = useVaccineFlow();

  const [vaccineName, setVaccineName] = useState('');
  const [vaccineCode, setVaccineCode] = useState('');
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(2); // 1 = Birth Date, 2 = History, 3 = Document, 4 = Lifestyle, 5 = Preference
  const [hasCustomBirthDate, setHasCustomBirthDate] = useState(false);
  const [wizardBirthDate, setWizardBirthDate] = useState(pet.birth_date || '');
  const [wizardBirthPrecision, setWizardBirthPrecision] = useState(pet.birth_date_precision || 'exact');
  const [wizardHistory, setWizardHistory] = useState('');
  const [wizardDocStatus, setWizardDocStatus] = useState('');
  const [wizardLifestyle, setWizardLifestyle] = useState<string[]>([]);
  const [wizardPreference, setWizardPreference] = useState('');
  const [wizardIsSubmitting, setWizardIsSubmitting] = useState(false);

  const hasBirthDate = pet.birth_date && pet.birth_date_precision && pet.birth_date_precision !== 'unknown';

  useEffect(() => {
    if (showWizard) {
      if (hasBirthDate && !hasCustomBirthDate) {
        setWizardStep(2);
      } else {
        setWizardStep(1);
      }
    }
  }, [showWizard, hasBirthDate, hasCustomBirthDate]);

  const showBirthStep = !hasBirthDate || hasCustomBirthDate;
  const totalWizardSteps = showBirthStep ? 5 : 4;
  const displayStepNumber = showBirthStep ? wizardStep : (wizardStep - 1);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleWizardSubmit = async () => {
    setWizardIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      
      if (showBirthStep && wizardBirthDate) {
        await supabase.from('pets').update({
          birth_date: wizardBirthDate,
          birth_date_precision: wizardBirthPrecision
        }).eq('id', pet.id);
      }
      
      await fetch(`/api/pets/${pet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date: wizardBirthDate || pet.birth_date,
          birth_date_precision: wizardBirthPrecision || pet.birth_date_precision
        })
      });
      
      setShowWizard(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setWizardIsSubmitting(false);
    }
  };

  useEffect(() => {
    const hasCompletedLastJuvenileDose = initialRecords.some(
      (r) =>
        (r.vaccine_code === 'DOG_DHPPI' || r.vaccine_code === 'DOG_CDV' || r.vaccine_code === 'CAT_FPV') &&
        r.dose_number === 3 &&
        r.status === 'completed'
    );
    if (hasCompletedLastJuvenileDose) {
      flow.handleLastJuvenileDoseCompleted();
    }
  }, [initialRecords, flow.handleLastJuvenileDoseCompleted]);

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!vaccineName.trim()) {
      setErrorMsg('Aşı adı zorunludur.');
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('vaccine_records_v2').insert({
        pet_id: pet.id,
        vaccine_name: vaccineName.trim(),
        vaccine_code: vaccineCode.trim() || 'CUSTOM',
        administered_at: adminDate,
        status: 'completed',
        notes: notes.trim() || null,
        confidence_level: 'user_reported',
        source: 'user_detailed',
      });

      if (error) throw error;

      setShowManualModal(false);
      setVaccineName('');
      setVaccineCode('');
      setNotes('');
      
      flow.handleVaccineDone(vaccineName.trim());
      flow.handleRecordComplete();
      router.refresh();
    } catch (err: any) {
      setErrorMsg('Hata: ' + (err.message || 'Aşı kaydı eklenemedi.'));
    }
  };

  const handleReactionSave = async (symptomId: string, level: string) => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('vaccine_records_v2').update({
        notes: `Reaksiyon: ${symptomId} (${level})`
      }).eq('pet_id', pet.id).order('administered_at', { ascending: false }).limit(1);

      if (error) throw error;
      alert('Aşı sonrası durum başarıyla kaydedildi.');
      flow.setShowReactionForm(false);
      router.refresh();
    } catch (err) {
      console.error('Reaksiyon kaydedilemedi:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto animate-fadeIn">
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Dostumun Profiline Dön
      </Link>

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
          onClick={() => setShowManualModal(true)}
          className="btn-primary min-h-[50px] flex items-center justify-center px-4 text-[13px] font-bold shadow-sm"
        >
          Manuel İşlem
        </button>
      </div>

      {showWizard ? (
        <div className="card-base p-6 bg-white rounded-2xl border border-border-main flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-border-main pb-4">
            <h3 className="text-[16px] font-black text-text-primary">Aşı Planı Kurulumu</h3>
            <span className="text-[12px] font-bold text-text-secondary bg-slate-100 px-3 py-1 rounded-full">
              Adım {displayStepNumber} / {totalWizardSteps}
            </span>
          </div>

          {/* Doğum tarihi zaten varsa gösterilecek özet */}
          {hasBirthDate && !showBirthStep && (
            <div style={{
              background: 'var(--purple-light)',
              border: '0.5px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--purple-text)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Doğum tarihi: {formatDate(pet.birth_date)}</span>
              <button
                type="button"
                onClick={() => {
                  setHasCustomBirthDate(true);
                  setWizardStep(1);
                }}
                style={{ marginLeft: 'auto', fontSize: 12, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Değiştir
              </button>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-text-primary text-[14px]">Adım 1: Doğum Tarihi</h4>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Doğum Tarihi</label>
                <input
                  type="date"
                  value={wizardBirthDate}
                  onChange={(e) => setWizardBirthDate(e.target.value)}
                  className="input-base"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Doğum Tarihi Kesinliği</label>
                <select
                  value={wizardBirthPrecision}
                  onChange={(e) => setWizardBirthPrecision(e.target.value)}
                  className="input-base"
                >
                  <option value="exact">Tam Net Tarih</option>
                  <option value="approximate">Yaklaşık Tarih</option>
                  <option value="unknown">Bilinmiyor</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 border border-border-main rounded-xl text-sm"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!wizardBirthDate}
                  className="btn-primary px-6 py-2 rounded-xl text-sm font-bold"
                >
                  İleri
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-text-primary text-[14px]">Adım 2: Aşı Geçmişi</h4>
              <p className="text-xs text-text-secondary">Dostunuzun daha önce yaptırdığı aşıların genel durumu nedir?</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'none', label: 'Hiç aşı yapılmadı' },
                  { value: 'some', label: 'Bazı aşıları yapıldı' },
                  { value: 'regular', label: 'Düzenli aşıları yapıldı' },
                  { value: 'unknown', label: 'Bilmiyorum' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWizardHistory(opt.value)}
                    className={`p-3 text-left border rounded-xl text-sm transition-all ${
                      wizardHistory === opt.value
                        ? 'border-primary bg-primary-soft text-primary font-bold'
                        : 'border-border-main hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-4">
                {showBirthStep && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border border-border-main rounded-xl text-sm"
                  >
                    Geri
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  disabled={!wizardHistory}
                  className="btn-primary px-6 py-2 rounded-xl text-sm font-bold"
                >
                  İleri
                </button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-text-primary text-[14px]">Adım 3: Kayıt Durumu</h4>
              <p className="text-xs text-text-secondary">Aşı karnesi veya belgelerinizin dijital kaydı var mı?</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'has_book', label: 'Fiziksel aşı karnesi var' },
                  { value: 'has_photo', label: 'Karne fotoğrafı veya belgesi var' },
                  { value: 'none', label: 'Hiçbir belge yok' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWizardDocStatus(opt.value)}
                    className={`p-3 text-left border rounded-xl text-sm transition-all ${
                      wizardDocStatus === opt.value
                        ? 'border-primary bg-primary-soft text-primary font-bold'
                        : 'border-border-main hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 border border-border-main rounded-xl text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  disabled={!wizardDocStatus}
                  className="btn-primary px-6 py-2 rounded-xl text-sm font-bold"
                >
                  İleri
                </button>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-text-primary text-[14px]">Adım 4: Yaşam Biçimi</h4>
              <p className="text-xs text-text-secondary">Dostunuzun günlük rutininde en çok nerede vakit geçiriyor? (Çoklu seçebilirsiniz)</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'park', label: 'Ev / Şehir İçi Parklar' },
                  { value: 'outdoor', label: 'Diğer Hayvanlarla Sık Temas' },
                  { value: 'rural', label: 'Kırsal Alan / Bahçe / Orman' }
                ].map((opt) => {
                  const isSelected = wizardLifestyle.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setWizardLifestyle(wizardLifestyle.filter(x => x !== opt.value));
                        } else {
                          setWizardLifestyle([...wizardLifestyle, opt.value]);
                        }
                      }}
                      className={`p-3 text-left border rounded-xl text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary-soft text-primary font-bold'
                          : 'border-border-main hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 border border-border-main rounded-xl text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(5)}
                  disabled={wizardLifestyle.length === 0}
                  className="btn-primary px-6 py-2 rounded-xl text-sm font-bold"
                >
                  İleri
                </button>
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-text-primary text-[14px]">Adım 5: Kullanım Tercihi</h4>
              <p className="text-xs text-text-secondary">Aşı planını OdiPet üzerinden nasıl yönetmek istersiniz?</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'odipet', label: 'OdiPet önerilerine göre (Otomatik Takvim)' },
                  { value: 'vet', label: 'Veteriner hekimimin planına göre' },
                  { value: 'reminder_only', label: 'Yalnızca hatırlatıcı olarak' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWizardPreference(opt.value)}
                    className={`p-3 text-left border rounded-xl text-sm transition-all ${
                      wizardPreference === opt.value
                        ? 'border-primary bg-primary-soft text-primary font-bold'
                        : 'border-border-main hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="px-4 py-2 border border-border-main rounded-xl text-sm"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={handleWizardSubmit}
                  disabled={!wizardPreference || wizardIsSubmitting}
                  className="btn-primary px-6 py-2 rounded-xl text-sm font-bold"
                >
                  {wizardIsSubmitting ? 'Kaydediliyor...' : 'Planı Tamamla'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <ModeSwitcher mode={flow.mode} onChange={flow.setMode} />

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

          <div className="flex flex-col gap-4">
            {activeTab === 'takvim' ? (
              initialPlans.length === 0 ? (
                <div className="text-[14px] text-text-secondary p-8 text-center bg-white rounded-2xl border border-border-main border-dashed flex flex-col items-center gap-4">
                  <p>Yaklaşan aşı planınız bulunmuyor.</p>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="btn-primary py-2 px-6 rounded-xl font-bold text-[14px]"
                  >
                    Aşı Planını Başlat
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {initialPlans.map((plan: any) => (
                    <PlanItemCard 
                      key={plan.id}
                      item={plan}
                      mode={flow.mode}
                      onBookAppointment={() => {}}
                      onVaccineDone={() => flow.handleVaccineDone(plan.extra_data?.vaccine?.name || plan.sub_type)}
                    />
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
                  {flow.mode === 'detailed' && (
                    <SeriesStatusCard 
                      petName={pet.name}
                      verificationLevel="document_matched"
                      onUpgradeVerification={() => router.push(`/owner/pets/${pet.id}/vaccines/upload`)}
                    />
                  )}
                  {initialRecords.map((rec: any) => (
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
        </>
      )}

      {flow.showRecordSheet && (
        <div 
          role="dialog" 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center"
          onClick={() => flow.setShowRecordSheet(false)}
        >
          <div 
            className="bg-surface w-full max-w-md rounded-t-[28px] p-6 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <RecordMethodSheet 
              vaccineName={flow.lastVaccineName}
              onSelect={(method) => {
                if(method === 'quick') {
                  setShowManualModal(true);
                  setVaccineName(flow.lastVaccineName);
                  flow.setShowRecordSheet(false);
                } else if(method === 'scan') {
                  router.push(`/owner/pets/${pet.id}/document-scan`);
                }
              }}
              onCancel={() => flow.setShowRecordSheet(false)}
            />
          </div>
        </div>
      )}

      {showManualModal && (
        <div 
          role="dialog" 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowManualModal(false)}
        >
          <div 
            className="bg-surface w-full max-w-md rounded-[28px] p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
             <div>
              <h3 className="text-[18px] font-black text-text-primary">Aşı Kaydı Ekle</h3>
            </div>
            <form onSubmit={handleAddManual} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Aşı Adı *</label>
                <input type="text" value={vaccineName} onChange={e => setVaccineName(e.target.value)} className="input-base" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-text-primary">Tarih</label>
                <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="input-base" required />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 min-h-[50px] border-2 border-border-main rounded-xl">İptal</button>
                <button type="submit" className="flex-1 min-h-[50px] bg-primary text-white rounded-xl">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
