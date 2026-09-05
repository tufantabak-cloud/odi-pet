'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ShieldCheckIcon, BugIcon, StethoscopeIcon, CarrierIcon, VaccineIcon, ParasiteIcon } from '@/components/icons/PetIcons';
import { SmartScanner } from '@/components/ui/SmartScanner';
import { PlanItemActionMenu } from '@/components/pets/common/PlanItemActionMenu';
import { PostponeModal } from '@/components/pets/common/PostponeModal';
import { ArchiveConfirmModal } from '@/components/pets/common/ArchiveConfirmModal';

interface HealthTabProps {
  petId: string;
  petName: string;
  onMarkDone?: (item: any) => void;
  onPostpone?: (item: any) => void;
  onEdit?: (item: any) => void;
  /** Pre-fetched server data — skips initial client-side fetches when provided */
  initialVaccines?: any[];
  initialParasites?: any[];
  initialVetRecords?: any[];
}

export default function HealthTab({ petId, petName, onMarkDone, onPostpone, onEdit, initialVaccines, initialParasites, initialVetRecords }: HealthTabProps) {
  const supabase = createBrowserSupabaseClient();

  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<any[]>(initialVaccines ?? []);
  const [parasiteRecords, setParasiteRecords] = useState<any[]>(initialParasites ?? []);
  const [vetRecords, setVetRecords] = useState<any[]>(initialVetRecords ?? []);
  const [loadingHealth, setLoadingHealth] = useState(true);
  // Skip spinner for vaccines/parasites/vet if initial server data was provided
  const [loadingVaccines, setLoadingVaccines] = useState(!initialVaccines);
  const [loadingParasites, setLoadingParasites] = useState(!initialParasites);
  const [loadingVet, setLoadingVet] = useState(!initialVetRecords);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Action Modals State
  const [rescheduleItem, setRescheduleItem] = useState<{ id: string; title: string; type: 'vaccine' | 'parasite' | 'vet' | 'health'; currentDate?: string } | null>(null);
  const [archiveItem, setArchiveItem] = useState<{ id: string; title: string; type: 'vaccine' | 'parasite' | 'vet' | 'health' } | null>(null);


  const loadHealthRecords = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch(`/api/pets/${petId}/records`);
      if (res.ok) {
        const data = await res.json();
        setHealthRecords(Array.isArray(data) ? data : []);
      } else {
        setHealthRecords([]);
      }
    } catch {
      setHealthRecords([]);
    } finally {
      setLoadingHealth(false);
    }
  }, [petId]);

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
    // Always fetch health records (no server-side prefetch for this endpoint)
    loadHealthRecords();
    // Only fetch vaccine/parasite/vet records if initial server data was NOT provided
    if (!initialVaccines) loadVaccines();
    if (!initialParasites) loadParasites();
    if (!initialVetRecords) loadVetRecords();
  }, [loadHealthRecords]);

  // Action Save Handlers
  const handleRescheduleSave = async (newDate: string, reason?: string) => {
    if (!rescheduleItem) return;
    const { id, type } = rescheduleItem;

    if (type === 'vaccine') {
      await supabase.from('vaccine_records_v2').update({ administered_at: newDate, notes: reason }).eq('id', id);
      await loadVaccines();
    } else if (type === 'parasite') {
      await supabase.from('parasite_records').update({ administered_at: newDate, notes: reason }).eq('id', id);
      await loadParasites();
    } else if (type === 'vet') {
      await supabase.from('appointments').update({ scheduled_at: newDate, notes: reason }).eq('id', id);
      await loadVetRecords();
    } else if (type === 'health') {
      await fetch(`/api/pets/${petId}/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, notes: reason }),
      });
      await loadHealthRecords();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveItem) return;
    const { id, type } = archiveItem;

    if (type === 'vaccine') {
      await supabase.from('vaccine_records_v2').update({ status: 'archived' }).eq('id', id);
      setVaccineRecords((prev) => prev.filter((r) => r.id !== id));
    } else if (type === 'parasite') {
      await supabase.from('parasite_records').update({ status: 'archived' }).eq('id', id);
      setParasiteRecords((prev) => prev.filter((r) => r.id !== id));
    } else if (type === 'vet') {
      await supabase.from('appointments').update({ status: 'archived' }).eq('id', id);
      setVetRecords((prev) => prev.filter((r) => r.id !== id));
    } else if (type === 'health') {
      await fetch(`/api/pets/${petId}/records/${id}`, { method: 'DELETE' });
      setHealthRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">

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
        </div>

        {/* Sağlık Geçmişi Listesi */}
        {loadingHealth ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-text-secondary font-medium">Sağlık kayıtları yükleniyor...</p>
          </div>
        ) : healthRecords.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border-main text-center bg-bg-main/50 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <StethoscopeIcon size={24} badgeSize="none" />
            </div>
            <p className="text-[14px] text-text-primary font-bold">Henüz Sağlık Kaydı Yok</p>
            <p className="text-[12px] text-text-secondary/80 max-w-sm leading-relaxed mb-1">Sağlık takvimi veya randevu oluşturmak için "Sağlık Planla" veya muayene/tedavi kaydetmek için "Sağlık Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {healthRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    <StethoscopeIcon size={18} badgeSize="none" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-[14px]">{rec.title || rec.type || 'Sağlık Kaydı'}</h4>
                    <p className="text-[11px] text-text-secondary">
                      Tarih: <span className="font-semibold">{rec.date ? new Date(rec.date).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</span>
                      {rec.type && ` • Tür: ${rec.type}`}
                      {rec.notes && ` • Not: ${rec.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rec.document_path && (
                    <a
                      href={rec.document_path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      📄 Belge
                    </a>
                  )}
                  <PlanItemActionMenu
                    itemId={rec.id}
                    itemTitle={rec.title || rec.type || 'Sağlık Kaydı'}
                    itemType="health"
                    onMarkDone={undefined}
                    onPostpone={undefined}
                    onEdit={onEdit ? () => onEdit(rec) : undefined}
                    onArchiveOrDelete={() =>
                      setArchiveItem({
                        id: rec.id,
                        title: rec.title || rec.type || 'Sağlık Kaydı',
                        type: 'health',
                      })
                    }
                  />
                </div>
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
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[12px] hover:bg-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all border border-indigo-200/60 flex items-center gap-1.5"
            >
              📷 Belge / OCR Tara
            </button>
          </div>
        </div>

        {/* Aşı Geçmişi Listesi */}
        {loadingVaccines ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-text-secondary font-medium">Aşı kayıtları yükleniyor...</p>
          </div>
        ) : vaccineRecords.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border-main text-center bg-bg-main/50 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <VaccineIcon size={24} />
            </div>
            <p className="text-[14px] text-text-primary font-bold">Henüz Aşı Kaydı Yok</p>
            <p className="text-[12px] text-text-secondary/80 max-w-sm leading-relaxed mb-1">Geçmiş veya gelecek aşı planlarınızı alt navigasyondaki Hızlı Erişim (+) butonundan ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vaccineRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3 hover:border-emerald-300/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                    <VaccineIcon size={20} />
                  </div>
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
                <div className="flex items-center gap-2">
                  {rec.document_storage_path && (
                    <a
                      href={rec.document_storage_path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      📄 Belge
                    </a>
                  )}
                  <PlanItemActionMenu
                    itemId={rec.id}
                    itemTitle={rec.vaccine_name || 'Aşı Kaydı'}
                    itemType="vaccine"
                    onMarkDone={undefined}
                    onPostpone={undefined}
                    onEdit={onEdit ? () => onEdit(rec) : undefined}
                    onArchiveOrDelete={() =>
                      setArchiveItem({
                        id: rec.id,
                        title: rec.vaccine_name || 'Aşı Kaydı',
                        type: 'vaccine',
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Parazit Geçmişi Bölümü ── */}
      <div id="section-parasite" className="card-base p-5 border border-border-main flex flex-col gap-4 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main/50 pb-4">
          <div className="flex items-center gap-3">
            <BugIcon badgeSize="md" size={22} />
            <div>
              <h3 className="font-extrabold text-text-primary text-[16px]">Parazit Geçmişi</h3>
              <p className="text-[12px] text-text-secondary">{petName} için geçmiş parazit uygulamaları</p>
            </div>
          </div>
        </div>

        {/* Parazit Geçmişi Listesi */}
        {loadingParasites ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-text-secondary font-medium">Parazit kayıtları yükleniyor...</p>
          </div>
        ) : parasiteRecords.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border-main text-center bg-bg-main/50 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <ParasiteIcon size={24} />
            </div>
            <p className="text-[14px] text-text-primary font-bold">Henüz Parazit Kaydı Yok</p>
            <p className="text-[12px] text-text-secondary/80 max-w-sm leading-relaxed mb-1">İç ve dış parazit koruma planlarınızı alt navigasyondaki Hızlı Erişim (+) butonundan ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {parasiteRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3 hover:border-teal-300/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
                    <ParasiteIcon size={20} />
                  </div>
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
                <div className="flex items-center gap-2">
                  {rec.document_storage_path && (
                    <a
                      href={rec.document_storage_path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      📄 Fotoğraf
                    </a>
                  )}
                  <PlanItemActionMenu
                    itemId={rec.id}
                    itemTitle={rec.brand_free_text || rec.product_free_text || rec.parasite_code || 'Parazit Koruması'}
                    itemType="parasite"
                    onMarkDone={undefined}
                    onPostpone={undefined}
                    onEdit={onEdit ? () => onEdit(rec) : undefined}
                    onArchiveOrDelete={() =>
                      setArchiveItem({
                        id: rec.id,
                        title: rec.brand_free_text || rec.product_free_text || rec.parasite_code || 'Parazit Koruması',
                        type: 'parasite',
                      })
                    }
                  />
                </div>
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
        </div>

        {/* Veteriner Kayıtları Listesi */}
        {loadingVet ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-text-secondary font-medium">Veteriner kayıtları yükleniyor...</p>
          </div>
        ) : vetRecords.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border-main text-center bg-bg-main/50 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <CarrierIcon width={24} height={24} />
            </div>
            <p className="text-[14px] text-text-primary font-bold">Henüz Veteriner Kaydı Yok</p>
            <p className="text-[12px] text-text-secondary/80 max-w-sm leading-relaxed mb-1">Veteriner kontrolü veya klinik randevusu oluşturmak için "Randevu Planla" veya geçmiş klinik ziyaretlerini girmek için "Veteriner Kaydı Ekle" butonunu kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vetRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-border-main/60 bg-bg-main flex items-center justify-between gap-3 hover:border-purple-300/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
                    <CarrierIcon width={20} height={20} />
                  </div>
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
                <div className="flex items-center gap-2">
                  {rec.status && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200/50">
                      {rec.status === 'completed' || rec.status === 'done' ? '✓ Tamamlandı' : rec.status}
                    </span>
                  )}
                  <PlanItemActionMenu
                    itemId={rec.id}
                    itemTitle={rec.clinics?.name || rec.title || rec.reason || 'Veteriner Ziyareti'}
                    itemType="appointment"
                    onMarkDone={undefined}
                    onPostpone={undefined}
                    onEdit={onEdit ? () => onEdit(rec) : undefined}
                    onArchiveOrDelete={() =>
                      setArchiveItem({
                        id: rec.id,
                        title: rec.clinics?.name || rec.title || rec.reason || 'Veteriner Ziyareti',
                        type: 'vet',
                      })
                    }
                  />
                </div>
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

      {/* Tarih Erteleme / Güncelleme Modalı */}
      {rescheduleItem && (
        <PostponeModal
          isOpen={!!rescheduleItem}
          taskTitle={rescheduleItem.title}
          currentDate={rescheduleItem.currentDate || new Date().toISOString()}
          onClose={() => setRescheduleItem(null)}
          onPostpone={(newDate, note) => handleRescheduleSave(newDate, note)}
        />
      )}

      {/* Soft Delete / Arşivleme Onay Modalı */}
      {archiveItem && (
        <ArchiveConfirmModal
          isOpen={!!archiveItem}
          itemTitle={archiveItem.title}
          isHealthRecord={true}
          onClose={() => setArchiveItem(null)}
          onConfirm={handleArchiveConfirm}
        />
      )}
    </div>
  );
}
