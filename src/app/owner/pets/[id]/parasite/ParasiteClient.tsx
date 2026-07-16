'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  checkCollarAgeRestriction,
  checkParasiteConflict,
  checkCollarSpotOnSameDayConflict,
  closeCombinedParasitePlans,
  scheduleNextParasiteDose,
  checkEarMiteCoverage
} from '@/features/pets/parasite-algorithm';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { ParasiteManualRecordForm } from '@/components/pets/ParasiteManualRecordForm';
import { Database } from '@/lib/database.types';

// ─────────────────────────────────────────────────────
// Banner bileşenleri
// ─────────────────────────────────────────────────────

export function SpotOnPostRecordBanner({ productName, onDismiss }: { productName: string; onDismiss: () => void }) {
  return (
    <div role="alert" style={{ background: 'var(--bg-warning, #fffbeb)', border: '0.5px solid #fcd34d', borderRadius: 12, padding: '14px 16px', marginBottom: 12, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontWeight: 500, fontSize: 14, color: '#b45309', margin: '0 0 8px' }}>{productName} uygulandı</p>
        <button onClick={onDismiss} aria-label="Kapat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>✕</button>
      </div>
      <ul style={{ fontSize: 13, color: '#111827', lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
        <li>Uygulama bölgesine <strong>24 saat</strong> dokunmayın, yalatmayın.</li>
        <li><strong>48 saat</strong> boyunca banyo yaptırmayın veya ıslatmayın.</li>
        <li>Çok evcil hayvan varsa uygulama sonrası <strong>birbirinden ayırın</strong>.</li>
      </ul>
    </div>
  );
}

export function CollarFollowUpBanner({ productName, onDismiss }: { productName: string; onDismiss: () => void }) {
  return (
    <div role="note" style={{ background: '#e0f2fe', border: '0.5px solid #bae6fd', borderRadius: 12, padding: '14px 16px', marginBottom: 12, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontWeight: 500, fontSize: 14, color: '#0369a1', margin: '0 0 8px' }}>{productName} takıldı</p>
        <button onClick={onDismiss} aria-label="Kapat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>✕</button>
      </div>
      <ul style={{ fontSize: 13, color: '#111827', lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
        <li>İlk <strong>48 saat</strong> boyunca tasma bölgesini (boyun/göğüs) kontrol edin.</li>
        <li>Kızarıklık, tüy dökülmesi veya kaşıma görülürse tasmayı çıkarın ve veterinerinize danışın.</li>
        <li>Tasmayı <strong>iki parmak girecek şekilde</strong> takın — ne çok sıkı ne çok gevşek.</li>
        <li>Yüzme veya sık banyo yapıyorsa koruma süresi kısalabilir.</li>
      </ul>
    </div>
  );
}

export function EarMiteInsightCard({ message, onDismiss }: { productName: string; message: string; onDismiss: () => void }) {
  return (
    <div role="note" style={{ background: '#f3f4f6', border: '0.5px solid #bae6fd', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔍</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: '#111827', margin: '0 0 4px' }}>Kulak uyuzu koruması sağlandı</p>
          <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.55, margin: 0 }}>{message}</p>
        </div>
        <button onClick={onDismiss} aria-label="Kapat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16, flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Source badge
// ─────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    user_manual: { label: 'Manuel Kayıt', bg: '#eff6ff', color: '#1d4ed8' },
    plan_completion: { label: 'Plan Tamamlaması', bg: '#f0fdf4', color: '#15803d' },
    migration: { label: 'Aktarılan Kayıt', bg: '#fef3c7', color: '#b45309' },
    scanner: { label: 'Belgeden Eklendi', bg: '#faf5ff', color: '#7c3aed' },
  };
  const c = config[source] || { label: source, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: c.bg, color: c.color, fontWeight: 500 }}>
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────
// Method label
// ─────────────────────────────────────────────────────

function methodLabel(m: string) {
  const map: Record<string, string> = {
    spot_on: 'Ense Damlası',
    collar: 'Tasma',
    oral: 'Oral Tablet',
    injection: 'Enjeksiyon',
    topical: 'Topikal',
  };
  return map[m] || m;
}

// ─────────────────────────────────────────────────────
// Ana bileşen
// ─────────────────────────────────────────────────────

export default function ParasiteClient({ pet }: { pet: any }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');

  // Protokoller (parasite_products yerine parasite_protocols)
  const [protocols, setProtocols] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  // Geçmiş: /api/pets/[id]/parasite-records'tan gelir
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manuel kayıt formu görünürlüğü
  const [showManualForm, setShowManualForm] = useState(false);

  // Eski form alanları (plan tamamlama için kullanılmaya devam ediyor)
  const [appliedBy, setAppliedBy] = useState<'owner' | 'clinic'>('owner');
  const [applicationMethod, setApplicationMethod] = useState<string>('spot_on');
  const [protocolId, setProtocolId] = useState<string>('');
  const [applicationDate, setApplicationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clinicId, setClinicId] = useState<string>('');
  const [vetName, setVetName] = useState<string>('');

  // Uyarı/durum alanları
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [sameDayWarning, setSameDayWarning] = useState<string | null>(null);
  const [earMiteInsight, setEarMiteInsight] = useState<string | null>(null);
  const [showPostRecordWarning, setShowPostRecordWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isCollarBannerDismissed, setIsCollarBannerDismissed] = useState(false);

  // ── Geçmiş kaydı yükle (API) ──────────────────────────────
  const loadHistory = async () => {
    const res = await fetch(`/api/pets/${pet.id}/parasite-records`);
    if (res.ok) {
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    }
  };

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [protoRes, clinicRes] = await Promise.all([
          supabase
            .from('parasite_protocols')
            .select('id, protocol_name, parasite_type, parasite_code, default_application_method, allowed_application_methods, default_protection_duration_days, min_age_weeks')
            .eq('species', pet.species)
            .eq('is_active', true)
            .order('protocol_name'),
          supabase.from('clinics').select('id, name').order('name'),
        ]);
        if (protoRes.data) setProtocols(protoRes.data);
        if (clinicRes.data) setClinics(clinicRes.data);
        await loadHistory();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, pet.id, pet.species]);

  // ── Mode loader ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('odipet_parasite_mode');
    if (saved === 'simple' || saved === 'detailed') setMode(saved);
  }, []);

  const dismissKey = `odipet_spoton_banner_dismissed_${pet.id}_${applicationDate}`;
  const collarDismissKey = `odipet_collar_banner_dismissed_${pet.id}_${applicationDate}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsBannerDismissed(localStorage.getItem(dismissKey) === 'true');
    }
  }, [dismissKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCollarBannerDismissed(localStorage.getItem(collarDismissKey) === 'true');
    }
  }, [collarDismissKey]);

  const changeMode = (m: 'simple' | 'detailed') => {
    setMode(m);
    localStorage.setItem('odipet_parasite_mode', m);
  };

  const selectedProtocol = protocols.find(p => p.id === protocolId);
  const parasiteType: 'internal' | 'external' | 'combined' =
    (selectedProtocol?.parasite_type as 'internal' | 'external' | 'combined') ?? 'combined';

  // ── Form submit (eski akış — protokol bazlı) ──────────────
  const handleSubmit = async (bypassWarnings = false) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Tasma yaş kısıtı
      if (applicationMethod === 'collar') {
        const ageCheck = await checkCollarAgeRestriction(pet.birth_date, protocolId, applicationDate, supabase);
        if (!ageCheck.allowed) {
          setError(ageCheck.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Çakışma kontrolü
      if (!bypassWarnings) {
        const conflict = await checkParasiteConflict(pet.id, protocolId, applicationDate, supabase);
        if (conflict.hasConflict) {
          setConflictWarning(conflict.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Aynı gün tasma+damla kontrolü
      if (!bypassWarnings && ['collar', 'spot_on'].includes(applicationMethod)) {
        const sameDayConflict = await checkCollarSpotOnSameDayConflict(pet.id, applicationMethod, applicationDate, supabase);
        if (sameDayConflict.hasConflict) {
          setSameDayWarning(sameDayConflict.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 4. Kayıt oluştur — yeni API kullan
      const payload = {
        parasite_protocol_id: protocolId,
        administered_at: applicationDate,
        application_method: applicationMethod,
        notes: appliedBy === 'clinic' ? `Klinik uygulaması${vetName ? ` — ${vetName}` : ''}` : null,
      };
      const createRes = await fetch(`/api/pets/${pet.id}/parasite-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || 'Kayıt oluşturulamadı.');
      }

      // 5. Kombine protokolse planları kapat
      await closeCombinedParasitePlans(pet.id, protocolId, applicationDate, supabase);

      // 6. Sonraki dozu planla
      await scheduleNextParasiteDose(pet.id, protocolId, applicationDate, parasiteType, applicationMethod, supabase);

      // 6b. Tasma için T+48 kontrol planı
      if (applicationMethod === 'collar') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const scheduledTime = new Date();
          scheduledTime.setHours(scheduledTime.getHours() + 48);
          type PlanInsert = Database['public']['Tables']['plans']['Insert'];
          const collarPlan: PlanInsert = {
            pet_id: pet.id,
            user_id: user.id,
            category: 'saglik',
            sub_type: 'Hatırlatma',
            scheduled_at: scheduledTime.toISOString(),
            status: 'active',
            extra_data: {
              source: 'system',
              collar_check: true,
              message: `Tasma takılalı 48 saat oldu. ${pet.name}'nın boyun bölgesini kontrol ettiniz mi?`,
              protocol_name: selectedProtocol?.protocol_name || 'Tasma',
            } satisfies Record<string, unknown>,
          };
          await supabase.from('plans').insert(collarPlan);
        }
      }

      // 7. Kulak uyuzu insight
      if (mode === 'detailed') {
        const earMite = await checkEarMiteCoverage(protocolId, supabase);
        if (earMite.coversEarMites) setEarMiteInsight(earMite.message);
      }

      // 8. Onboarding
      try {
        const { markOnboardingStep } = await import('@/hooks/useOnboardingProgress');
        await markOnboardingStep(pet.id, 'parasite_first', supabase);
      } catch {}

      setShowPostRecordWarning(true);
      setSuccess(true);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypassWarning = () => {
    setConflictWarning(null);
    setSameDayWarning(null);
    handleSubmit(true);
  };

  const { progress: onboardingProgress } = useOnboardingProgress(pet.id);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      {/* Onboarding banner */}
      {onboardingProgress && !onboardingProgress.steps.find(s => s.id === 'parasite_first')?.done && (
        <div style={{ background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 8, padding: '9px 12px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <i className="ti ti-sparkles" style={{ color: '#534AB7', fontSize: 16, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#26215C', lineHeight: 1.5, margin: 0 }}>
            Profilini tamamlayarak kişiselleştirilmiş öneriler alabilirsin.
          </p>
        </div>
      )}

      {/* Başlık + Geri */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Parazit Koruması</h1>
        <Link href={`/owner/pets/${pet.id}`} style={{ fontSize: 14, color: '#534AB7', textDecoration: 'none' }}>Geri Dön</Link>
      </div>

      {/* Mode Switcher */}
      <div style={{ background: '#f9f9f9', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{mode === 'simple' ? 'Basit mod' : 'Detaylı mod'}</p>
          <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
            {mode === 'simple' ? 'Tarih ve hatırlatma — uyarılar sınırlandırılmıştır' : 'Detaylı uyarılar, insight kartları'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['simple', 'detailed'] as const).map(m => (
            <button key={m} onClick={() => changeMode(m)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '0.5px solid', borderColor: mode === m ? '#534AB7' : '#ddd', background: mode === m ? '#534AB7' : '#fff', color: mode === m ? '#fff' : '#333', cursor: 'pointer', fontWeight: mode === m ? 500 : 400 }}>
              {m === 'simple' ? 'Basit' : 'Detaylı'}
            </button>
          ))}
        </div>
      </div>

      {/* ──── KAYIT FORMU veya BAŞARI ──── */}
      {success ? (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: '#065f46', fontWeight: 'bold', margin: '0 0 8px' }}>Kayıt Başarıyla Oluşturuldu!</p>

          {appliedBy === 'owner' && applicationMethod === 'spot_on' && !isBannerDismissed && (
            <SpotOnPostRecordBanner
              productName={selectedProtocol?.protocol_name || 'Uygulama'}
              onDismiss={() => { localStorage.setItem(dismissKey, 'true'); setIsBannerDismissed(true); }}
            />
          )}
          {applicationMethod === 'collar' && !isCollarBannerDismissed && (
            <CollarFollowUpBanner
              productName={selectedProtocol?.protocol_name || 'Tasma'}
              onDismiss={() => { localStorage.setItem(collarDismissKey, 'true'); setIsCollarBannerDismissed(true); }}
            />
          )}
          {mode === 'detailed' && earMiteInsight && (
            <EarMiteInsightCard
              productName={selectedProtocol?.protocol_name || 'Uygulama'}
              message={earMiteInsight}
              onDismiss={() => setEarMiteInsight(null)}
            />
          )}

          <button
            onClick={() => { setSuccess(false); setEarMiteInsight(null); setShowPostRecordWarning(false); setProtocolId(''); }}
            style={{ marginTop: 12, padding: '8px 16px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Yeni Kayıt Ekle
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: 10, borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {conflictWarning && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: 12, borderRadius: 6, color: '#92400e', fontSize: 13, marginBottom: 12 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>⚠️ Parazit Koruması Çakışması</p>
              <p style={{ margin: '0 0 12px' }}>{conflictWarning}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleBypassWarning} style={{ padding: '6px 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Yine de Kaydet</button>
                <button onClick={() => setConflictWarning(null)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>İptal Et</button>
              </div>
            </div>
          )}

          {sameDayWarning && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: 12, borderRadius: 6, color: '#92400e', fontSize: 13, marginBottom: 12 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>⚠️ Aynı Gün Çakışma Riski</p>
              <p style={{ margin: '0 0 12px' }}>{sameDayWarning}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleBypassWarning} style={{ padding: '6px 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Yine de Kaydet</button>
                <button onClick={() => setSameDayWarning(null)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>İptal Et</button>
              </div>
            </div>
          )}

          {/* Uygulama Tipi */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Tipi</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { setAppliedBy('owner'); setApplicationMethod('spot_on'); }} style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 6, border: '1px solid', borderColor: (appliedBy === 'owner' && applicationMethod !== 'collar') ? '#534AB7' : '#e5e7eb', background: (appliedBy === 'owner' && applicationMethod !== 'collar') ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                🏠 Ev Uygulaması
              </button>
              <button type="button" onClick={() => { setAppliedBy('owner'); setApplicationMethod('collar'); }} style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 6, border: '1px solid', borderColor: (appliedBy === 'owner' && applicationMethod === 'collar') ? '#534AB7' : '#e5e7eb', background: (appliedBy === 'owner' && applicationMethod === 'collar') ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                🧣 Tasma Taktım
              </button>
              <button type="button" onClick={() => { setAppliedBy('clinic'); setApplicationMethod('spot_on'); }} style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 6, border: '1px solid', borderColor: appliedBy === 'clinic' ? '#534AB7' : '#e5e7eb', background: appliedBy === 'clinic' ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                🏥 Klinik Uygulaması
              </button>
            </div>
          </div>

          {/* Protokol seçimi */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Protokol Seçin</label>
            <select value={protocolId} onChange={e => setProtocolId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} required>
              <option value="">-- Protokol Seçin --</option>
              {protocols
                .filter(p => applicationMethod === 'collar' ? p.default_application_method === 'collar' : p.default_application_method !== 'collar')
                .map(p => (
                  <option key={p.id} value={p.id}>{p.protocol_name}</option>
                ))}
            </select>
          </div>

          {/* Uygulama yöntemi (damla/tablet) */}
          {appliedBy !== 'clinic' && applicationMethod !== 'collar' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Yöntemi</label>
              <select value={applicationMethod} onChange={e => setApplicationMethod(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
                <option value="spot_on">Ense Damlası (Spot-on)</option>
                <option value="oral">Oral Tablet</option>
                <option value="injection">Enjeksiyon</option>
                <option value="topical">Topikal</option>
              </select>
            </div>
          )}

          {/* Uygulama tarihi */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Tarihi</label>
            <input type="date" value={applicationDate} onChange={e => setApplicationDate(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} required />
          </div>

          {/* Klinik bilgileri */}
          {appliedBy === 'clinic' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Klinik</label>
                <select value={clinicId} onChange={e => setClinicId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
                  <option value="">-- Klinik Seçin --</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulayan Veteriner (İsteğe Bağlı)</label>
                <input type="text" placeholder="Veteriner Hekim Adı" value={vetName} onChange={e => setVetName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
              </div>
            </>
          )}

          <button type="button" disabled={isSubmitting || !protocolId} onClick={() => handleSubmit(false)} style={{ width: '100%', padding: 12, borderRadius: 6, border: 'none', background: !protocolId ? '#ccc' : '#534AB7', color: '#fff', fontWeight: 'bold', cursor: !protocolId ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? 'Kaydediliyor...' : 'Parazit Korumasını Kaydet'}
          </button>
        </div>
      )}

      {/* ──── MANUEL KAYIT FORMU ──── */}
      <div style={{ marginBottom: 16 }}>
        {!showManualForm ? (
          <button
            id="add-manual-record-btn"
            type="button"
            onClick={() => setShowManualForm(true)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px dashed #534AB7', background: '#f8f7ff', color: '#534AB7', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            + Uygulama Kaydı Ekle
          </button>
        ) : (
          <ParasiteManualRecordForm
            petId={pet.id}
            protocols={protocols}
            onComplete={async () => {
              setShowManualForm(false);
              await loadHistory();
            }}
            onCancel={() => setShowManualForm(false)}
          />
        )}
      </div>

      {/* ──── GEÇMİŞ UYGULAMALAR ──── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', margin: '0 0 16px' }}>Geçmiş Uygulamalar</h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Yükleniyor...</p>
        ) : history.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Henüz kaydedilmiş bir uygulama bulunmuyor.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(item => (
              <div key={item.id} style={{ padding: 12, border: '1px solid #f3f4f6', borderRadius: 8, background: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 'bold', fontSize: 14 }}>
                      {item.protocol_name || item.parasite_code || 'Bilinmeyen Protokol'}
                    </p>
                    {(item.brand_free_text || item.product_free_text) && (
                      <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280' }}>
                        {[item.brand_free_text, item.product_free_text].filter(Boolean).join(' — ')}
                      </p>
                    )}
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#4b5563' }}>
                      {methodLabel(item.application_method)}
                      {item.protection_duration_days ? ` • ${item.protection_duration_days} gün koruma` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      <SourceBadge source={item.source} />
                    </div>
                    {item.notes && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>📝 {item.notes}</p>
                    )}
                    {item.document_storage_path && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#534AB7' }}>📎 Belge mevcut</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
                      {item.administered_at}
                    </p>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#d1fae5', color: '#065f46' }}>
                      Tamamlandı
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
