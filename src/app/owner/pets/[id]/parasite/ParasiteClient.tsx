'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface SpotOnPostRecordBannerProps {
  productName: string;
  onDismiss: () => void;
}

export function SpotOnPostRecordBanner({
  productName,
  onDismiss,
}: SpotOnPostRecordBannerProps) {
  return (
    <div role="alert" style={{
      background: 'var(--bg-warning, #fffbeb)',
      border: '0.5px solid var(--border-warning, #fcd34d)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 12,
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-warning, #b45309)', margin: '0 0 8px' }}>
          {productName} uygulandı
        </p>
        <button onClick={onDismiss} aria-label="Kapat"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', fontSize: 16 }}>
          ✕
        </button>
      </div>
      <ul style={{ fontSize: 13, color: 'var(--text-primary, #111827)', lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
        <li>Uygulama bölgesine <strong>24 saat</strong> dokunmayın, yalatmayın.</li>
        <li><strong>48 saat</strong> boyunca banyo yaptırmayın veya ıslatmayın.</li>
        <li>Çok evcil hayvan varsa uygulama sonrası <strong>birbirinden ayırın</strong>.</li>
      </ul>
    </div>
  );
}

interface CollarFollowUpBannerProps {
  productName: string;
  onDismiss: () => void;
}

export function CollarFollowUpBanner({
  productName,
  onDismiss,
}: CollarFollowUpBannerProps) {
  return (
    <div role="note" style={{
      background: 'var(--bg-accent, #e0f2fe)',
      border: '0.5px solid var(--border-accent, #bae6fd)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 12,
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-accent, #0369a1)', margin: '0 0 8px' }}>
          {productName} takıldı
        </p>
        <button onClick={onDismiss} aria-label="Kapat"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', fontSize: 16 }}>
          ✕
        </button>
      </div>
      <ul style={{ fontSize: 13, color: 'var(--text-primary, #111827)', lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
        <li>İlk <strong>48 saat</strong> boyunca tasma bölgesini (boyun/göğüs) kontrol edin.</li>
        <li>Kızarıklık, tüy dökülmesi veya kaşıma görülürse tasmayı çıkarın ve veterinerinize danışın.</li>
        <li>Tasmayı <strong>iki parmak girecek şekilde</strong> takın — ne çok sıkı ne çok gevşek.</li>
        <li>Yüzme veya sık banyo yapıyorsa koruma süresi kısalabilir.</li>
      </ul>
    </div>
  );
}

interface EarMiteInsightCardProps {
  productName: string;
  message: string;
  onDismiss: () => void;
}

export function EarMiteInsightCard({
  productName,
  message,
  onDismiss,
}: EarMiteInsightCardProps) {
  return (
    <div role="note" style={{
      background: 'var(--surface-2, #f3f4f6)',
      border: '0.5px solid var(--border-accent, #bae6fd)',
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 10,
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-accent, #e0f2fe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>
          🔍
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary, #111827)', margin: '0 0 4px' }}>
            Kulak uyuzu koruması sağlandı
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary, #4b5563)', lineHeight: 1.55, margin: 0 }}>
            {message}
          </p>
        </div>
        <button onClick={onDismiss} aria-label="Kapat"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', fontSize: 16, flexShrink: 0 }}>
          ✕
        </button>
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', margin: '8px 0 0', lineHeight: 1.4 }}>
        Yalnızca bilgi amaçlıdır. Kulak muayenesi için veterinerinize danışın.
      </p>
    </div>
  );
}

export default function ParasiteClient({ pet }: { pet: any }) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  
  const [products, setProducts] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [appliedBy, setAppliedBy] = useState<'owner' | 'clinic'>('owner');
  const [applicationMethod, setApplicationMethod] = useState<string>('spot_on');
  const [productId, setProductId] = useState<string>('');
  const [applicationDate, setApplicationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clinicId, setClinicId] = useState<string>('');
  const [vetName, setVetName] = useState<string>('');

  // Alerts / Warnings states
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [sameDayWarning, setSameDayWarning] = useState<string | null>(null);
  const [earMiteInsight, setEarMiteInsight] = useState<string | null>(null);
  const [showPostRecordWarning, setShowPostRecordWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isCollarBannerDismissed, setIsCollarBannerDismissed] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, clinicRes] = await Promise.all([
          supabase.from('parasite_products').select('*').order('name'),
          supabase.from('clinics').select('id, name').order('name')
        ]);
        if (prodRes.data) setProducts(prodRes.data);
        if (clinicRes.data) setClinics(clinicRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  // Mode loader from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('odipet_parasite_mode');
    if (saved === 'simple' || saved === 'detailed') {
      setMode(saved);
    }
  }, []);

  const dismissKey = `odipet_spoton_banner_dismissed_${pet.id}_${applicationDate}`;
  const collarDismissKey = `odipet_collar_banner_dismissed_${pet.id}_${applicationDate}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem(dismissKey) === 'true';
      setIsBannerDismissed(isDismissed);
    }
  }, [dismissKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCollarDismissed = localStorage.getItem(collarDismissKey) === 'true';
      setIsCollarBannerDismissed(isCollarDismissed);
    }
  }, [collarDismissKey]);

  const handleDismissBanner = () => {
    localStorage.setItem(dismissKey, 'true');
    setIsBannerDismissed(true);
  };

  const handleDismissCollarBanner = () => {
    localStorage.setItem(collarDismissKey, 'true');
    setIsCollarBannerDismissed(true);
  };

  const changeMode = (m: 'simple' | 'detailed') => {
    setMode(m);
    localStorage.setItem('odipet_parasite_mode', m);
  };

  const selectedProductObj = products.find(p => p.id === productId);
  const parasiteType = selectedProductObj
    ? (selectedProductObj.type === 'internal' || selectedProductObj.type === 'external' || selectedProductObj.type === 'combined'
        ? selectedProductObj.type
        : 'combined')
    : 'combined';

  const handleSubmit = async (bypassWarnings = false) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Tasma ise yaş kısıt kontrolü
      if (applicationMethod === 'collar') {
        const ageCheck = await checkCollarAgeRestriction(
          pet.birth_date, productId, applicationDate, supabase
        );
        if (!ageCheck.allowed) {
          setError(ageCheck.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Çakışma kontrolü
      if (!bypassWarnings) {
        const conflict = await checkParasiteConflict(
          pet.id, productId, applicationDate, supabase
        );
        if (conflict.hasConflict) {
          setConflictWarning(conflict.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Aynı gün tasma + damla kontrolü
      if (!bypassWarnings && ['collar', 'spot_on'].includes(applicationMethod)) {
        const sameDayConflict = await checkCollarSpotOnSameDayConflict(
          pet.id, applicationMethod, applicationDate, supabase
        );
        if (sameDayConflict.hasConflict) {
          setSameDayWarning(sameDayConflict.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 4. Kayıt oluştur
      const confidenceLevel = appliedBy === 'clinic' ? 'clinic_verified' : 'user_reported';
      const { error: insertErr } = await supabase.from('parasite_plan_items').insert({
        pet_id: pet.id,
        product_id: productId || null,
        parasite_type: parasiteType,
        application_method: applicationMethod,
        dose_number: 1,
        recommended_start: applicationDate,
        recommended_end: applicationDate,
        scheduled_date: applicationDate,
        status: 'completed',
        plan_origin: 'user_created',
        applied_by: appliedBy,
        extra_data: {
          confidence_level: confidenceLevel,
          clinic_id: appliedBy === 'clinic' ? clinicId : null,
          vet_name: appliedBy === 'clinic' ? vetName : null,
          recorded_at: new Date().toISOString()
        }
      } as any);

      if (insertErr) throw insertErr;

      // 5. Kombine ürünse ilgili planları kapat
      await closeCombinedParasitePlans(pet.id, productId, applicationDate, supabase);

      // 6. Sonraki dozu planla
      await scheduleNextParasiteDose(
        pet.id, productId, applicationDate, parasiteType, applicationMethod, supabase
      );

      // 6b. Tasma için T+48 saat sonra kontrol planla
      if (applicationMethod === 'collar') {
        const scheduledTime = new Date();
        scheduledTime.setHours(scheduledTime.getHours() + 48);
        await supabase.from('plans').insert({
          pet_id: pet.id,
          category: 'saglik',
          sub_type: 'Hatırlatma',
          title: `Tasma Kontrolü — ${selectedProductObj?.name || 'Tasma'}`,
          scheduled_at: scheduledTime.toISOString(),
          status: 'active',
          extra_data: {
            source: 'system',
            collar_check: true,
            message: `Tasma takılalı 48 saat oldu. ${pet.name}'nın boyun bölgesini kontrol ettiniz mi? Kızarıklık veya rahatsızlık varsa veterinerinize danışın.`
          }
        } as any);
      }

      // 7. Kulak uyuzu insight kontrolü (detaylı modda)
      if (mode === 'detailed') {
        const earMite = await checkEarMiteCoverage(productId, supabase);
        if (earMite.coversEarMites) {
          setEarMiteInsight(earMite.message);
        }
      }

      // 8. Uygulama yöntemine göre post-kayıt uyarıları göster
      setShowPostRecordWarning(true);
      setSuccess(true);

      // Parazit koruması eklendiğinde onboarding adımı parasite_first'ü true yap
      try {
        const { markOnboardingStep } = await import('@/hooks/useOnboardingProgress');
        await markOnboardingStep(pet.id, 'parasite_first', supabase);
      } catch (opErr) {
        console.error('Onboarding step parasite_first could not be marked:', opErr);
      }
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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      {onboardingProgress && !onboardingProgress.steps.find(s => s.id === 'parasite_first')?.done && (
        <div style={{
          background: '#EEEDFE',
          border: '0.5px solid #AFA9EC',
          borderRadius: 8,
          padding: '9px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <i className="ti ti-sparkles" style={{ color: '#534AB7', fontSize: 16, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, color: '#26215C', lineHeight: 1.5, margin: 0 }}>
              Profilini tamamlayarak kişiselleştirilmiş öneriler alabilirsin.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Parazit Koruması Ekle</h1>
        <Link href={`/owner/pets/${pet.id}`} style={{ fontSize: 14, color: '#534AB7', textDecoration: 'none' }}>Geri Dön</Link>
      </div>

      {/* Mode Switcher */}
      <div style={{
        background: 'var(--surface-1, #f9f9f9)',
        border: '0.5px solid var(--border, #e5e5e5)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
            {mode === 'simple' ? 'Basit mod' : 'Detaylı mod'}
          </p>
          <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
            {mode === 'simple'
              ? 'Tarih ve hatırlatma — uyarılar sınırlandırılmıştır'
              : 'Güven rozeti, detaylı uyarılar, insight kartları'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['simple', 'detailed'].map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m as any)}
              style={{
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 6,
                border: '0.5px solid',
                borderColor: mode === m ? '#534AB7' : '#ddd',
                background: mode === m ? '#534AB7' : '#fff',
                color: mode === m ? '#fff' : '#333',
                cursor: 'pointer',
                fontWeight: mode === m ? 500 : 400,
              }}
            >
              {m === 'simple' ? 'Basit' : 'Detaylı'}
            </button>
          ))}
        </div>
      </div>

      {success ? (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <p style={{ color: '#065f46', fontWeight: 'bold', margin: '0 0 8px' }}>Kayıt Başarıyla Oluşturuldu!</p>
          
          {appliedBy === 'owner' && applicationMethod === 'spot_on' && !isBannerDismissed && (
            <SpotOnPostRecordBanner
              productName={selectedProductObj?.name || 'Seçilen Ürün'}
              onDismiss={handleDismissBanner}
            />
          )}

          {applicationMethod === 'collar' && !isCollarBannerDismissed && (
            <CollarFollowUpBanner
              productName={selectedProductObj?.name || 'Seçilen Tasma'}
              onDismiss={handleDismissCollarBanner}
            />
          )}

          {mode === 'detailed' && earMiteInsight && (
            <EarMiteInsightCard
              productName={selectedProductObj?.name || 'Seçilen Ürün'}
              message={earMiteInsight}
              onDismiss={() => setEarMiteInsight(null)}
            />
          )}

          {showPostRecordWarning && (appliedBy !== 'owner' || applicationMethod !== 'spot_on') && applicationMethod !== 'collar' && (
            <div style={{ textAlign: 'left', fontSize: 13, color: '#374151', background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 6, marginTop: 12 }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 6px' }}>⚠️ Kritik Post-Uygulama Talimatları:</p>
              {applicationMethod === 'collar' && (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li>İlk 48 saat boyunca boyun bölgesinde kızarıklık veya tüy dökülmesi kontrolü yapın.</li>
                  <li>Tasma takıldıktan sonra dostunuzun cildini alerjik reaksiyonlara karşı izleyin.</li>
                </ul>
              )}
              {applicationMethod !== 'spot_on' && applicationMethod !== 'collar' && (
                <p style={{ margin: 0 }}>Uygulama sonrasında dostunuzun genel durumunu izleyin, olası uyuşukluk durumunda hekiminize başvurun.</p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setSuccess(false);
              setEarMiteInsight(null);
              setShowPostRecordWarning(false);
              setProductId('');
            }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Yeni Kayıt Ekle
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
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

          {/* Form */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Tipi</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setAppliedBy('owner'); setApplicationMethod('spot_on'); }}
                style={{
                  flex: 1, padding: 10, borderRadius: 6, border: '1px solid',
                  borderColor: (appliedBy === 'owner' && applicationMethod !== 'collar') ? '#534AB7' : '#e5e7eb',
                  background: (appliedBy === 'owner' && applicationMethod !== 'collar') ? '#eff6ff' : '#fff',
                  cursor: 'pointer', fontSize: 12
                }}
              >
                🏠 Ev Uygulaması (Damla/Tablet)
              </button>
              <button
                type="button"
                onClick={() => { setAppliedBy('owner'); setApplicationMethod('collar'); }}
                style={{
                  flex: 1, padding: 10, borderRadius: 6, border: '1px solid',
                  borderColor: (appliedBy === 'owner' && applicationMethod === 'collar') ? '#534AB7' : '#e5e7eb',
                  background: (appliedBy === 'owner' && applicationMethod === 'collar') ? '#eff6ff' : '#fff',
                  cursor: 'pointer', fontSize: 12
                }}
              >
                🧣 Tasma Taktım
              </button>
              <button
                type="button"
                onClick={() => { setAppliedBy('clinic'); setApplicationMethod('spot_on'); }}
                style={{
                  flex: 1, padding: 10, borderRadius: 6, border: '1px solid',
                  borderColor: appliedBy === 'clinic' ? '#534AB7' : '#e5e7eb',
                  background: appliedBy === 'clinic' ? '#eff6ff' : '#fff',
                  cursor: 'pointer', fontSize: 12
                }}
              >
                🏥 Klinik Uygulaması
              </button>
            </div>
            {mode === 'detailed' && (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', color: '#4b5563' }}>
                  Güven Seviyesi: {appliedBy === 'clinic' ? 'Veteriner Onaylı (clinic_verified)' : 'Kullanıcı Beyanı (user_reported)'}
                </span>
              </div>
            )}
          </div>

          {/* Application Method details */}
          {appliedBy !== 'clinic' && applicationMethod !== 'collar' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Yöntemi</label>
              <select
                value={applicationMethod}
                onChange={(e) => setApplicationMethod(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              >
                <option value="spot_on">Ense Damlası (Spot-on)</option>
                <option value="tablet">Oral Tablet</option>
                <option value="injection">Enjeksiyon</option>
                <option value="other">Diğer</option>
              </select>
            </div>
          )}

          {/* Product Selection */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Ürün Seçin</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              required
            >
              <option value="">-- Ürün Seçin --</option>
              {products
                .filter(p => {
                  if (applicationMethod === 'collar') return p.application_method === 'collar';
                  return p.application_method !== 'collar';
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.active_ingredient})
                  </option>
                ))}
            </select>
          </div>

          {/* Application Date */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulama Tarihi</label>
            <input
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              required
            />
          </div>

          {/* Clinic selection (Only for clinic verified) */}
          {appliedBy === 'clinic' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Klinik</label>
                <select
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                  required
                >
                  <option value="">-- Klinik Seçin --</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>Uygulayan Veteriner (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="Veteriner Hekim Adı"
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                />
              </div>
            </>
          )}

          <button
            type="button"
            disabled={isSubmitting || !productId}
            onClick={() => handleSubmit(false)}
            style={{
              width: '100%', padding: 12, borderRadius: 6, border: 'none',
              background: !productId ? '#ccc' : '#534AB7', color: '#fff',
              fontWeight: 'bold', cursor: !productId ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Parazit Korumasını Kaydet'}
          </button>
        </div>
      )}
    </div>
  );
}
