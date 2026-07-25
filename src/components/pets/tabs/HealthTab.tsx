'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ShieldCheckIcon, BugIcon, StethoscopeIcon, CarrierIcon } from '@/components/icons/PetIcons';
import { SmartScanner } from '@/components/ui/SmartScanner';

interface HealthTabProps {
  petId: string;
  petName: string;
}

export default function HealthTab({ petId, petName }: HealthTabProps) {
  const supabase = createBrowserSupabaseClient();
  const [hideVaultBanner, setHideVaultBanner] = useState(true);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<any[]>([]);
  const [parasiteRecords, setParasiteRecords] = useState<any[]>([]);
  const [vetRecords, setVetRecords] = useState<any[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingVaccines, setLoadingVaccines] = useState(true);
  const [loadingParasites, setLoadingParasites] = useState(true);
  const [loadingVet, setLoadingVet] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Check localStorage for banner state on mount
  useEffect(() => {
    const isHidden = localStorage.getItem('hide_vault_banner') === 'true';
    setHideVaultBanner(isHidden);
  }, []);

  const handleCloseVaultBanner = () => {
    localStorage.setItem('hide_vault_banner', 'true');
    setHideVaultBanner(true);
  };

  const loadHealthRecords = useCallback(async () => {
    setLoadingHealth(true);
    const { data } = await supabase
      .from('health_records')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });
    setHealthRecords(data || []);
    setLoadingHealth(false);
  }, [supabase, petId]);

  const loadVaccines = useCallback(async () => {
    setLoadingVaccines(true);
    const { data } = await supabase
      .from('vaccine_records_v2')
      .select('*')
      .eq('pet_id', petId)
      .not('administered_at', 'is', null)
      .order('administered_at', { ascending: false });

    const EXCLUDED = new Set(['cancelled', 'migrated_to_plan', 'overdue', 'pending', 'upcoming', 'scheduled', 'planned']);
    const filtered = (data || []).filter((v: any) => v.administered_at && (!v.status || v.status === 'completed' || v.status === 'done') && !EXCLUDED.has(v.status));
    setVaccineRecords(filtered);
    setLoadingVaccines(false);
  }, [supabase, petId]);

  const loadParasites = useCallback(async () => {
    setLoadingParasites(true);
    const { data } = await supabase
      .from('parasite_records')
      .select('*')
      .eq('pet_id', petId)
      .order('administered_at', { ascending: false });
    setParasiteRecords(data || []);
    setLoadingParasites(false);
  }, [supabase, petId]);

  const loadVetRecords = useCallback(async () => {
    setLoadingVet(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, clinics(name)')
      .eq('pet_id', petId)
      .order('scheduled_at', { ascending: false });
    setVetRecords(data || []);
    setLoadingVet(false);
  }, [supabase, petId]);

  useEffect(() => {
    loadHealthRecords();
    loadVaccines();
    loadParasites();
    loadVetRecords();
  }, [loadHealthRecords, loadVaccines, loadParasites, loadVetRecords]);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ── Dijital Belge Kasası Yönlendirme Bannerı ── */}
      {!hideVaultBanner && (
        <div className="card-base p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <ShieldCheckIcon badgeSize="md" size={22} />
            <div className="flex-1 pr-6">
              <h3 className="font-extrabold text-text-primary text-[14px] mb-1">Dijital Belge Kasası</h3>
              <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
                Evcil hayvanınızın tüm raporları, pasaportu ve belgeleri Dijital Belge Kasası'nda güvende.
              </p>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-pet-section', { 
                    detail: { section: 'Raporlar & Belgeler', tab: 'vault' } 
                  }));
                }}
                className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1 hover:scale-[1.02] transition-transform"
              >
                Belge Kasasına Git →
              </button>
            </div>
            <button 
              onClick={handleCloseVaultBanner}
              className="absolute top-3 right-3 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Kapat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── 1. Sağlık Karnesi ve Muayene Kayıtları Bölümü ── */}
      <div id="section-health" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <StethoscopeIcon badgeSize="md" size={22} />
            <div>
              <h3 className="font-extrabold text-text-primary text-[16px]">Sağlık Karnesi ve Muayene Kayıtları</h3>
              <p className="text-[12px] text-text-secondary">{petName} için geçmiş sağlık, muayene ve tedavi kayıtları</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/owner/plan-yap/saglik?pet_id=${petId}`}
              className="px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-[12px] hover:bg-primary-hover transition-all shadow-xs"
            >
              🩺 Sağlık Planla
            </Link>
            <Link
              href={`/owner/plan-yap/saglik?pet_id=${petId}&mode=log`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-[12px] hover:bg-emerald-700 transition-all shadow-xs"
            >
              📋 Sağlık Kaydı Ekle
            </Link>
          </div>
        </div>

        {/* Sağlık Geçmişi Listesi */}
        {loadingHealth ? (
          <p className="text-[13px] text-text-secondary py-3">Yükleniyor...</p>
        ) : healthRecords.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border-main text-center bg-bg-main/50">
            <p className="text-[13px] text-text-secondary font-medium mb-1">Henüz kaydedilmiş bir sağlık veya muayene kaydı bulunmuyor.</p>
            <p className="text-[11px] text-text-secondary/80">Sağlık takvimi veya randevu oluşturmak için "Sağlık Planla" veya muayene/tedavi kaydetmek için "Sağlık Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {healthRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">🩺</div>
                  <div>
                    <h4 className="font-bold text-text-primary text-[14px]">{rec.title || rec.type || 'Sağlık Kaydı'}</h4>
                    <p className="text-[11px] text-text-secondary">
                      Tarih: <span className="font-semibold">{rec.date ? new Date(rec.date).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</span>
                      {rec.type && ` • Tür: ${rec.type}`}
                      {rec.notes && ` • Not: ${rec.notes}`}
                    </p>
                  </div>
                </div>
                {rec.document_path && (
                  <a
                    href={rec.document_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    📄 Belge
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Aşı Karnesi ve Belgeleri Bölümü ── */}
      <div id="section-vaccines" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon badgeSize="md" size={22} />
            <div>
              <h3 className="font-extrabold text-text-primary text-[16px]">Aşı Karnesi ve Belgeleri</h3>
              <p className="text-[12px] text-text-secondary">{petName} için geçmiş aşı kayıtları ve karnesi</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[12px] hover:bg-indigo-100 transition-colors border border-indigo-200/60 flex items-center gap-1.5"
            >
              📷 Belge / OCR Tara
            </button>
            <Link
              href={`/owner/plan-yap/asi?pet_id=${petId}`}
              className="px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-[12px] hover:bg-primary-hover transition-all shadow-xs"
            >
              💉 Aşı Planla
            </Link>
            <Link
              href={`/owner/plan-yap/asi?pet_id=${petId}&mode=log`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-[12px] hover:bg-emerald-700 transition-all shadow-xs"
            >
              📋 Aşı Kaydı Ekle
            </Link>
          </div>
        </div>

        {/* Aşı Geçmişi Listesi */}
        {loadingVaccines ? (
          <p className="text-[13px] text-text-secondary py-3">Yükleniyor...</p>
        ) : vaccineRecords.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border-main text-center bg-bg-main/50">
            <p className="text-[13px] text-text-secondary font-medium mb-1">Henüz kaydedilmiş bir aşı bulunmuyor.</p>
            <p className="text-[11px] text-text-secondary/80">Aşı takvimi oluşturmak için "Aşı Planla" veya geçmiş aşıları kaydetmek için "Aşı Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vaccineRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                  <div>
                    <h4 className="font-bold text-text-primary text-[14px]">{rec.vaccine_name}</h4>
                    <p className="text-[11px] text-text-secondary">
                      Uygulama: <span className="font-semibold">{new Date(rec.administered_at).toLocaleDateString('tr-TR')}</span>
                      {rec.dose_number && ` • Doz ${rec.dose_number}`}
                      {rec.brand_name && ` • ${rec.brand_name}`}
                      {rec.lot_number && ` • Lot: ${rec.lot_number}`}
                    </p>
                  </div>
                </div>
                {rec.document_storage_path && (
                  <a
                    href={rec.document_storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    📄 Belge
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Parazit Geçmişi Bölümü ── */}
      <div id="section-parasite" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <BugIcon badgeSize="md" size={22} />
            <div>
              <h3 className="font-extrabold text-text-primary text-[16px]">Parazit Geçmişi</h3>
              <p className="text-[12px] text-text-secondary">{petName} için geçmiş parazit uygulamaları</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/owner/plan-yap/parazit?pet_id=${petId}`}
              className="px-3.5 py-2 rounded-xl bg-teal-600 text-white font-bold text-[12px] hover:bg-teal-700 transition-all shadow-xs"
            >
              🐛 Parazit Planla
            </Link>
            <Link
              href={`/owner/plan-yap/parazit?pet_id=${petId}&mode=log`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-[12px] hover:bg-emerald-700 transition-all shadow-xs"
            >
              📋 Parazit Kaydı Ekle
            </Link>
          </div>
        </div>

        {/* Parazit Geçmişi Listesi */}
        {loadingParasites ? (
          <p className="text-[13px] text-text-secondary py-3">Yükleniyor...</p>
        ) : parasiteRecords.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border-main text-center bg-bg-main/50">
            <p className="text-[13px] text-text-secondary font-medium mb-1">Henüz kaydedilmiş bir parazit uygulaması bulunmuyor.</p>
            <p className="text-[11px] text-text-secondary/80">İç ve dış parazit korumasını başlatmak için "Parazit Planla" veya tamamlanan bir uygulamayı girmek için "Parazit Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {parasiteRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">🛡️</div>
                  <div>
                    <h4 className="font-bold text-text-primary text-[14px]">
                      {rec.brand_free_text || rec.product_free_text || rec.parasite_code || 'Parazit Koruması'}
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Tarih: <span className="font-semibold">{new Date(rec.administered_at).toLocaleDateString('tr-TR')}</span>
                      {rec.protection_duration_days && ` • ${rec.protection_duration_days} gün koruma`}
                      {rec.application_method && ` • ${rec.application_method}`}
                    </p>
                  </div>
                </div>
                {rec.document_storage_path && (
                  <a
                    href={rec.document_storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    📄 Fotoğraf
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Veteriner & Randevu Geçmişi Bölümü ── */}
      <div id="section-vet" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl p-2 bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
              <CarrierIcon width={24} height={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-text-primary text-[16px]">Veteriner & Randevu Geçmişi</h3>
              <p className="text-[12px] text-text-secondary">{petName} için geçmiş veteriner kontrolleri ve randevular</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/owner/plan-yap/kontrol?pet_id=${petId}`}
              className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-[12px] hover:bg-purple-700 transition-all shadow-xs"
            >
              🏥 Randevu Planla
            </Link>
            <Link
              href={`/owner/plan-yap/kontrol?pet_id=${petId}&mode=log`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-[12px] hover:bg-emerald-700 transition-all shadow-xs"
            >
              📋 Veteriner Kaydı Ekle
            </Link>
          </div>
        </div>

        {/* Veteriner Kayıtları Listesi */}
        {loadingVet ? (
          <p className="text-[13px] text-text-secondary py-3">Yükleniyor...</p>
        ) : vetRecords.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border-main text-center bg-bg-main/50">
            <p className="text-[13px] text-text-secondary font-medium mb-1">Henüz kaydedilmiş bir veteriner randevusu veya klinik ziyareti bulunmuyor.</p>
            <p className="text-[11px] text-text-secondary/80">Veteriner kontrolü veya klinik randevusu oluşturmak için "Randevu Planla" veya geçmiş klinik ziyaretlerini girmek için "Veteriner Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vetRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">🏥</div>
                  <div>
                    <h4 className="font-bold text-text-primary text-[14px]">
                      {rec.clinics?.name || rec.title || rec.reason || 'Veteriner Ziyareti'}
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Tarih: <span className="font-semibold">{rec.scheduled_at ? new Date(rec.scheduled_at).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</span>
                      {rec.doctor_name && ` • Dr. ${rec.doctor_name}`}
                      {rec.notes && ` • ${rec.notes}`}
                    </p>
                  </div>
                </div>
                {rec.status && (
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    {rec.status === 'completed' || rec.status === 'done' ? '✓ Tamamlandı' : rec.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OCR Smart Scanner Modalı */}
      {isScannerOpen && (
        <SmartScanner
          petId={petId}
          onClose={() => setIsScannerOpen(false)}
          onSave={() => {
            setIsScannerOpen(false);
            loadVaccines();
          }}
        />
      )}
    </div>
  );
}
