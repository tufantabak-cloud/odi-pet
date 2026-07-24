'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { FirstAidIcon, VaccineIcon, ParasiteIcon } from '@/components/icons/PetIcons';
import { SmartScanner } from '@/components/ui/SmartScanner';

interface HealthTabProps {
  petId: string;
  petName: string;
}

export default function HealthTab({ petId, petName }: HealthTabProps) {
  const supabase = createBrowserSupabaseClient();
  const [hideVaultBanner, setHideVaultBanner] = useState(true);
  const [vaccineRecords, setVaccineRecords] = useState<any[]>([]);
  const [parasiteRecords, setParasiteRecords] = useState<any[]>([]);
  const [loadingVaccines, setLoadingVaccines] = useState(true);
  const [loadingParasites, setLoadingParasites] = useState(true);
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

  const loadVaccines = useCallback(async () => {
    setLoadingVaccines(true);
    const { data } = await supabase
      .from('vaccine_records_v2')
      .select('*')
      .eq('pet_id', petId)
      .not('administered_at', 'is', null)
      .neq('status', 'migrated_to_plan')
      .order('administered_at', { ascending: false });
    setVaccineRecords(data || []);
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

  useEffect(() => {
    loadVaccines();
    loadParasites();
  }, [loadVaccines, loadParasites]);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ── Dijital Belge Kasası Yönlendirme Bannerı ── */}
      {!hideVaultBanner && (
        <div className="card-base p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xs bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
              <FirstAidIcon width={24} height={24} />
            </div>
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

      {/* ── 1. Aşı Karnesi ve Belgeleri Bölümü ── */}
      <div id="section-vaccines" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <VaccineIcon width={22} height={22} />
            </div>
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
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
              <ParasiteIcon width={22} height={22} />
            </div>
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
