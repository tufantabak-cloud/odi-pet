'use client';

// ============================================================
// OdiPet â€” VaccinesClient.tsx v3
// Mockup v2 dÃ¼zeltmeleri tam entegrasyon:
//
// MOD SÄ°STEMÄ°
//   simple: yalnÄ±zca tarih + hatÄ±rlatma
//   detailed: gÃ¼ven rozeti + reaksiyon takibi + insight kartÄ±
//
// DÃœZELTÄ°LMÄ°Å BÄ°LEÅENLER
//   1. "KayÄ±tlara gÃ¶re tamamlandÄ±" + gÃ¼ven rozeti
//   2. Doz numarasÄ± dinamik hesaplama aÃ§Ä±klamasÄ±
//   3. "AÅŸÄ± yapÄ±ldÄ±" â†’ kayÄ±t yÃ¶ntemi seÃ§imi
//   4. AnlÄ±k ciddi reaksiyon uyarÄ±sÄ± (kayÄ±t anÄ±nda)
//   5. Reaksiyon 4 seviye: normal / hafif / dikkat / acil
//   6. Acil dili eyleme dÃ¶nÃ¼k
//   7. "6 aylÄ±k temel aÅŸÄ± deÄŸerlendirmesi" (26. hafta)
//   8. Risk bazlÄ± aÅŸÄ± dili dÃ¼zeltmesi
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AdministrationRoute } from '@/lib/database.types';

// â”€â”€ TÄ°PLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type VaccineMode = 'simple' | 'detailed';

export type VerificationLevel =
  | 'user_reported'
  | 'document_uploaded'
  | 'document_matched'
  | 'clinic_verified'
  | 'official_verified'
  | 'estimated';

export type RecordMethod = 'scan' | 'quick' | 'detailed';

// DÃ¼zeltme 5: 4 seviye reaksiyon
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
  is_risk_based: boolean; // DÃ¼zeltme 8
  dose_number: number;
  dose_basis: string; // DÃ¼zeltme 2: aÃ§Ä±klama metni
  extra_data: {
    vaccine: { code: string; name: string };
    booster_ui_label?: string;
    clinical_booster_days?: number;
    legal_booster_days?: number;
    administration_route?: AdministrationRoute;
  };
}

// â”€â”€ MOD YÃ–NETÄ°CÄ°SÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ MOD TOGGLE BÄ°LEÅENÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          {mode === 'simple' ? 'Basit mod' : 'DetaylÄ± mod'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {mode === 'simple'
            ? 'Tarih ve hatÄ±rlatma â€” reaksiyon takibi yok'
            : 'GÃ¼ven rozeti, reaksiyon takibi, insight kartlarÄ±'}
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
            {m === 'simple' ? 'Basit' : 'DetaylÄ±'}
          </button>
        ))}
      </div>
    </div>
  );
}

// â”€â”€ DÃœZELTME 1: GÃœVENÄ°LÄ°RLÄ°K ROZETÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VERIFICATION_LABELS: Record<VerificationLevel, string> = {
  user_reported: 'KullanÄ±cÄ± beyanÄ±',
  document_uploaded: 'Belge yÃ¼klendi',
  document_matched: 'Belgeyle eÅŸleÅŸti',
  clinic_verified: 'Veteriner onaylÄ±',
  official_verified: 'ResmÃ® doÄŸrulama',
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

// DÃ¼zeltme 1: "KayÄ±tlara gÃ¶re tamamlandÄ±" â€” kesin ifade kullanÄ±lmÄ±yor
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
          Yavru serisi kayÄ±tlara gÃ¶re tamamlandÄ±
        </p>
        <VerificationBadge level={verificationLevel} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
        {verificationLevel === 'user_reported' &&
          'GÃ¼ven seviyesini artÄ±rmak iÃ§in belge yÃ¼kleyebilir veya veteriner onayÄ± alabilirsin.'}
        {verificationLevel === 'document_matched' &&
          'Belgeyle eÅŸleÅŸtirildi. Veteriner onayÄ±yla resmÃ® doÄŸrulamaya geÃ§ebilirsin.'}
        {(verificationLevel === 'clinic_verified' ||
          verificationLevel === 'official_verified') &&
          'DoÄŸrulama tamamlandÄ±.'}
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
          Belge yÃ¼kle â†’
        </button>
      )}
    </div>
  );
}

// â”€â”€ DÃœZELTME 2: DÄ°NAMÄ°K DOZ AÃ‡IKLAMASI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // DÃ¼zeltme 8: Risk bazlÄ± aÅŸÄ± dili
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
            Risk bazlÄ±
          </span>
        </div>
        {/* DÃ¼zeltme 8: kesin dil yok */}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          YaÅŸam biÃ§imine gÃ¶re deÄŸerlendirilmesi Ã¶neriliyor. Veterinerinize danÄ±ÅŸÄ±n.
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
            {/* DÃ¼zeltme 2: doz numarasÄ± dinamik */}
            {item.extra_data.vaccine.name} â€” {item.dose_number}. doz
          </p>
          {/* DÃ¼zeltme 2: hesaplama aÃ§Ä±klamasÄ± */}
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

      {/* A2 Booster banner â€” yalnÄ±zca detaylÄ± modda */}
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
                WSAVA: {Math.round(item.extra_data.clinical_booster_days / 365)} yÄ±l
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
                TR yasal: 1 yÄ±l
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
        {/* DÃ¼zeltme 3: "AÅŸÄ± yapÄ±ldÄ±" â†’ yÃ¶ntem seÃ§imi */}
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
          AÅŸÄ± yapÄ±ldÄ±
        </button>
      </div>
    </div>
  );
}

// â”€â”€ DÃœZELTME 3: KAYIT YÃ–NTEMÄ° SEÃ‡Ä°MÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    { id: 'scan', icon: 'ğŸ“·', title: 'Belgeyi tara', sub: 'En hÄ±zlÄ± yÃ¶ntem â€” OCR otomatik okur' },
    { id: 'quick', icon: 'âœï¸', title: 'HÄ±zlÄ± kayÄ±t', sub: 'AÅŸÄ± adÄ±, tarih ve klinik' },
    { id: 'detailed', icon: 'ğŸ“‹', title: 'AyrÄ±ntÄ±lÄ± kayÄ±t', sub: 'Lot, Ã¼rÃ¼n ve diÄŸer bilgiler' },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
        {vaccineName} â€” kaydÄ± nasÄ±l eklemek istersin?
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
        Ä°ptal
      </button>
    </div>
  );
}

// â”€â”€ DÃœZELTME 4 + 6: KAYIT SONRASI UYARILAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      {/* DÃ¼zeltme 4 + 6: AnlÄ±k ciddi reaksiyon uyarÄ±sÄ± â€” eyleme dÃ¶nÃ¼k dil */}
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
          Ciddi belirti gÃ¶rÃ¼lÃ¼rse
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
          Ä°lk saatlerde yÃ¼z ÅŸiÅŸmesi, nefes gÃ¼Ã§lÃ¼ÄŸÃ¼, tekrarlayan kusma veya Ã§Ã¶kme gÃ¶rÃ¼lÃ¼rse{' '}
          <strong>bu belirtiler acil veteriner deÄŸerlendirmesi gerektirir.</strong>{' '}
          En yakÄ±n veteriner kliniÄŸiyle hemen iletiÅŸime geÃ§in.
        </p>
      </div>

      {/* GÃ¶zetim uyarÄ±sÄ± */}
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
            Alerjik reaksiyonlar genellikle <strong>ilk 1 saat</strong> iÃ§inde geliÅŸir.
            Klinik yakÄ±nÄ±nda <strong>30â€“45 dakika</strong> kalÄ±n.
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

      {/* DetaylÄ± modda: kontrol bildirimleri */}
      {mode === 'detailed' && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          6 saat Â· 24 saat Â· belirti varsa 72 saat sonra kontrol bildirimi gÃ¶nderilecek.
        </p>
      )}
    </div>
  );
}

// â”€â”€ DÃœZELTME 5: 4 SEVÄ°YE REAKSÄ°YON FORMU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REACTION_SYMPTOMS: ReactionSymptom[] = [
  { id: 'normal', label: 'Normal gÃ¶rÃ¼nÃ¼yor', level: 'normal' },
  { id: 'lethargy', label: 'Biraz halsiz veya iÅŸtahsÄ±z', level: 'mild' },
  { id: 'injection_site', label: 'Enjeksiyon yerinde hassasiyet', level: 'mild' },
  { id: 'vomiting_once', label: 'Bir kez hafif kusma / ishal', level: 'mild' },
  { id: 'vomiting_repeat', label: 'Tekrarlayan kusma / ishal', level: 'caution' },
  { id: 'face_swelling', label: 'YÃ¼zde ÅŸiÅŸme / nefes gÃ¼Ã§lÃ¼ÄŸÃ¼', level: 'emergency' },
  { id: 'collapse', label: 'Ã‡Ã¶kme / bayÄ±lma / ÅŸok belirtisi', level: 'emergency' },
  { id: 'other', label: 'BaÅŸka bir belirti var', level: 'mild' },
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
      // DÃ¼zeltme 5: acil â†’ formu durdur
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
        {petName} bugÃ¼n nasÄ±l gÃ¶rÃ¼nÃ¼yor?
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
        KÄ±rmÄ±zÄ± seÃ§enekler doÄŸrudan acil yÃ¶nlendirme ekranÄ±nÄ± aÃ§ar.
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

// â”€â”€ DÃœZELTME 6: ACÄ°L EKRANI â€” eyleme dÃ¶nÃ¼k dil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      aria-label="Acil veteriner yÃ¶nlendirmesi"
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
            Acil veteriner deÄŸerlendirmesi
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {petName} iÃ§in
          </p>
        </div>
      </div>

      {/* DÃ¼zeltme 6: kesin ve eyleme dÃ¶nÃ¼k dil */}
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
          Bu belirtiler acil veteriner deÄŸerlendirmesi gerektirir. En yakÄ±n
          veteriner kliniÄŸiyle <strong>hemen iletiÅŸime geÃ§in.</strong>
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
          En yakÄ±n kliniÄŸi gÃ¶ster
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
          Pet bilgilerini paylaÅŸ
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
        Reaksiyonu geÃ§ti, geri dÃ¶n
      </button>
    </div>
  );
}

// â”€â”€ DÃœZELTME 7: 6 AYLIK DEÄERLENDÄ°RME KARTI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      aria-label="6 aylÄ±k temel aÅŸÄ± deÄŸerlendirme Ã¶nerisi"
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
          {/* DÃ¼zeltme 7: yeniden adlandÄ±rÄ±ldÄ± */}
          <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
            6 aylÄ±k temel aÅŸÄ± deÄŸerlendirmesi
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
            WSAVA 2024 Ã¶nerisi
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="KartÄ± kapat"
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

      {/* DÃ¼zeltme 7: "tÃ¼m Ã¼rÃ¼nler iÃ§in zorunlu deÄŸil" notu */}
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 12px' }}>
        Ã–nceki aÅŸÄ± kayÄ±tlarÄ± ve kullanÄ±lan Ã¼rÃ¼ne gÃ¶re veterineriniz ek doz
        gerekip gerekmediÄŸini deÄŸerlendirebilir. Bu tÃ¼m Ã¼rÃ¼nler iÃ§in zorunlu
        deÄŸildir.
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
          Titre testi yaptÄ±r
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
        Veteriner kararÄ±nÄ±n yerine geÃ§mez. TÃ¼rkiye'de standart protokol deÄŸildir.
      </p>
    </div>
  );
}

// â”€â”€ ANA HOOK â€” VaccinesClient.tsx iÃ§inde kullan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // DetaylÄ± modda 6 saat sonra reaksiyon formu
    if (mode === 'detailed') {
      // Backend notification scheduling â€” gerÃ§ek implementasyonda
      // pg_cron veya notification service ile T+6h, T+24h, T+72h
      console.log('[VaccineFlow] T+6h reaksiyon bildirimi planlandÄ±');
    }
  }

  function handleEmergency(symptomId: string) {
    const s = REACTION_SYMPTOMS.find((r) => r.id === symptomId);
    setEmergencySymptom(s?.label ?? '');
    setShowEmergency(true);
    setShowReactionForm(false);
  }

  // 16. hafta tamamlanÄ±nca assessment kartÄ±nÄ± gÃ¶ster
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
