'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  Loader2,
  FileText,
  ChevronRight
} from 'lucide-react';
import {
  resolvePlanActions,
  normalizePlanId,
  CanonicalPlanContext,
  CanonicalPlanActionType
} from '@/lib/plans/canonicalActionResolver';
import { PostponeModal } from './PostponeModal';
import { CompletionDetailsModal } from './CompletionDetailsModal';
import type { ApplicationDetails } from '@/lib/health-records/application-details';
import dynamic from 'next/dynamic';

const ParasitePlanCompletionModal = dynamic(
  () => import('@/components/pets/ParasitePlanCompletionModal'),
  { ssr: false }
);

function sanitizeErrorMessage(rawMessage: string | undefined, defaultFallback = 'İşlem tamamlanırken bir hata oluştu.'): string {
  if (!rawMessage) return defaultFallback;
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('coerce') ||
    lower.includes('json object') ||
    lower.includes('pgrst') ||
    lower.includes('null value') ||
    lower.includes('syntax error') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error')
  ) {
    return 'İşlem gerçekleştirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.';
  }
  return rawMessage;
}

export interface CanonicalPlanActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: CanonicalPlanContext | null;
  onSuccess?: () => void;
  petId?: string;
  initialAction?: CanonicalPlanActionType | 'complete_details';
  initialApplicationDetails?: ApplicationDetails | null;
  sourceTab?: string;
}

export function CanonicalPlanActionModal({
  isOpen,
  onClose,
  context,
  onSuccess,
  petId: propsPetId,
  initialAction,
  initialApplicationDetails,
  sourceTab,
}: CanonicalPlanActionModalProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showParasiteModal, setShowParasiteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialAction === 'complete_details') {
      setShowDetailsModal(true);
    }
  }, [isOpen, initialAction]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !context) return null;

  const resolved = resolvePlanActions(context);
  const realPlanId = normalizePlanId(context.planId || context.plan?.id);
  const petId = propsPetId || context.petId || context.plan?.pet_id || (context.plan as any)?.pets?.id || '';

  const sourceRecordUrl = petId ? (
    resolved.isVaccine || resolved.category === 'asi'
      ? `/owner/pets/${petId}?tab=asi`
      : resolved.isParasite || resolved.category === 'parazit'
      ? `/owner/pets/${petId}?tab=parazit`
      : resolved.category === 'beslenme'
      ? `/owner/pets/${petId}/nutrition`
      : resolved.category === 'bakim'
      ? `/owner/pets/${petId}/care`
      : `/owner/pets/${petId}`
  ) : null;

  const handleActionClick = (actionId: CanonicalPlanActionType) => {
    setErrorMsg(null);
    switch (actionId) {
      case 'complete':
        if (resolved.completionMode === 'parasite_protocol') {
          setShowParasiteModal(true);
        } else if (resolved.completionMode === 'completion_details') {
          setShowDetailsModal(true);
        } else {
          executeSimpleCompletion();
        }
        break;

      case 'postpone':
        setShowPostponeModal(true);
        break;

      case 'edit':
        if (resolved.editRoute) {
          onClose();
          router.push(resolved.editRoute);
        }
        break;

      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const getMutationRoute = (): string => {
    if (resolved.sourceTable === 'health_schedules' && petId) {
      return `/api/pets/${petId}/schedules/${realPlanId}`;
    }
    return `/api/plans/${realPlanId}`;
  };

  const executeSimpleCompletion = async () => {
    if (!realPlanId) return;
    setLoadingAction('complete');
    try {
      const primaryRoute = getMutationRoute();
      let res = await fetch(primaryRoute, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      // UI Güvenlik Ağı (Safety Net): Birincil rota başarısız olursa alternatif rotayı dene
      if (!res.ok) {
        const isSchedulesRoute = primaryRoute.includes('/schedules/');
        const fallbackRoute = isSchedulesRoute
          ? `/api/plans/${realPlanId}`
          : (petId ? `/api/pets/${petId}/schedules/${realPlanId}` : null);

        if (fallbackRoute) {
          const fallbackRes = await fetch(fallbackRoute, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          }).catch(() => null);

          if (fallbackRes && fallbackRes.ok) {
            res = fallbackRes;
          }
        }
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(data.error, 'Tamamlama başarısız oldu.'));
      }
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Completion error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'İşlem tamamlanırken bir hata oluştu.'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCompleteWithDetails = async (details: ApplicationDetails | null) => {
    if (!realPlanId) return;
    setLoadingAction('complete');
    try {
      // 1. If it's a vaccine plan and we have petId, attempt agenda write to create canonical record
      if (resolved.isVaccine && petId && details) {
        try {
          const detectedVaccineCode =
            context.plan?.extra_data?.vaccine_code ||
            context.plan?.extra_data?.vaccine?.code ||
            ((resolved.displayTitle || '').toLowerCase().includes('kuduz') ? 'DOG_RABIES' : context.plan?.sub_type) ||
            'CUSTOM';

          const agendaPayload = {
            pet_id: petId,
            category: 'asi',
            input: {
              pet_id: petId,
              vaccine_name: resolved.displayTitle,
              vaccine_code: detectedVaccineCode,
              administered_at: details.administered_at || new Date().toISOString().split('T')[0],
              notes: details.product_notes || undefined,
              brand_name: details.brand || undefined,
            },
            idempotencyKey: crypto.randomUUID(),
            selectedPlanId: realPlanId,
            applicationDetails: details,
          };
          const agendaRes = await fetch('/api/agenda/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaPayload),
          });
          if (agendaRes.ok) {
            // Planın statusunu da tamamlandı olarak kesinleştir
            await fetch(`${getMutationRoute()}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' }),
            }).catch(() => {});

            handleCompleteSuccess();
            return;
          } else {
            const errData = await agendaRes.json().catch(() => ({}));
            console.error('[CanonicalPlanActionModal] Agenda write failed:', errData);
            const isMedical = resolved.isVaccine || resolved.isParasite;
            if (isMedical) {
              throw new Error(errData.error || `${resolved.category === 'asi' ? 'Aşı' : 'Parazit'} kaydı oluşturulamadı. Lütfen tekrar deneyiniz.`);
            }
          }
        } catch (agendaErr: any) {
          console.error('[CanonicalPlanActionModal] Agenda write error:', agendaErr);
          const isMedical = resolved.isVaccine || resolved.isParasite;
          if (isMedical) {
            throw agendaErr;
          }
        }
      }

      // 2. Fallback to standard canonical PATCH /api/plans/[id] preserving details in extra_data
      const currentExtra = context.plan?.extra_data || {};
      const payload: any = {
        status: 'completed',
        extra_data: {
          ...currentExtra,
          application_details: details,
        },
      };
      if (details?.product_notes) {
        payload.notes = details.product_notes;
      }
      const vet = (details as any)?.veterinarian || details?.provider_name;
      if (vet) {
        payload.vet_name = vet;
        if (!payload.extra_data) payload.extra_data = {};
        payload.extra_data.veterinarian = vet;
        payload.extra_data.provider_name = vet;
      }
      // brand_free_text ve product_free_text alanları API tarafından parazit protokolü anahtarı olarak
      // değerlendirildiği için yalnızca kategori 'parazit' ise root payload'a eklenmelidir.
      if (resolved.category === 'parazit') {
        if (details?.brand) {
          payload.brand_free_text = details.brand;
        }
        if (details?.product_name) {
          payload.product_free_text = details.product_name;
        }
      }

      const res = await fetch(`${getMutationRoute()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(data.error, 'Tamamlama başarısız oldu.'));
      }

      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Detailed completion error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'Tamamlama detayları kaydedilemedi.'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePostponeSubmit = async (newDate: string, note?: string) => {
    if (!realPlanId) return;
    setLoadingAction('postpone');
    try {
      const currentExtra = context.plan?.extra_data || {};
      const isoDate = newDate.includes('T') ? newDate : `${newDate}T09:00:00.000Z`;
      const payload: any = {
        scheduled_at: isoDate,
        due_date: isoDate,
      };
      if (note) {
        payload.note = note;
        payload.notes = note;
        payload.extra_data = { ...currentExtra, postpone_note: note };
      }

      const res = await fetch(`${getMutationRoute()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(data.error, 'Erteleme başarısız oldu.'));
      }

      setShowPostponeModal(false);
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Postpone error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'Erteleme sırasında bir hata oluştu.'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!realPlanId) return;
    setLoadingAction('delete');
    try {
      const res = await fetch(`${getMutationRoute()}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(data.error, 'Silme işlemi başarısız oldu.'));
      }
      setShowDeleteConfirm(false);
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Delete error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'Plan silinemedi.'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCompleteSuccess = () => {
    setShowParasiteModal(false);
    setShowDetailsModal(false);
    setShowPostponeModal(false);
    setShowDeleteConfirm(false);
    onClose();
    if (onSuccess) onSuccess();
    router.refresh();
  };

  const renderIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'CheckCircle2':
        return <CheckCircle2 className={className} />;
      case 'Clock':
        return <Clock className={className} />;
      case 'Pencil':
        return <Pencil className={className} />;
      case 'Trash2':
        return <Trash2 className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  if (!mounted) return null;

  const isSubModalOpen = showPostponeModal || showDetailsModal || showParasiteModal;

  const modalContent = (
    <>
      {isOpen && !isSubModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 sm:pt-5 pb-3 border-b border-slate-100/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                {resolved.category.toUpperCase()} GÖREVİ
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors active:scale-95"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Info */}
            <div className="px-6 py-4 flex flex-col gap-1.5">
              <h3 className="text-[18px] font-extrabold text-slate-900 leading-snug tracking-tight">
                {resolved.displayTitle}
              </h3>
              {resolved.displayDate && (
                <div className="flex items-center gap-1.5 text-slate-500 text-[13px] font-medium">
                  <CalendarDays className="w-4 h-4 text-purple-500" />
                  <span>{resolved.displayDate}</span>
                </div>
              )}
              {resolved.isCompleted && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bu görev zaten tamamlanmış</span>
                </div>
              )}
              {errorMsg && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Delete Confirmation View */}
            {showDeleteConfirm ? (
              <div className="p-6 bg-rose-50/50 border-t border-rose-100 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-rose-950">Planı Silmek İstiyor musunuz?</h4>
                    <p className="text-[12px] text-rose-800/80 mt-0.5">
                      Bu plan takviminizden ve hatırlatıcılardan kaldırılacaktır.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 min-h-[48px] py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleDeleteSubmit}
                    disabled={loadingAction === 'delete'}
                    className="flex-1 min-h-[48px] py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    {loadingAction === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Evet, Sil'}
                  </button>
                </div>
              </div>
            ) : (
              /* Action Buttons List */
              <div className="p-4 pt-1 flex flex-col gap-2 pb-6 sm:pb-4">
                {resolved.actions.map((action) => {
                  const isLoading = loadingAction === action.id;
                  let btnStyle = 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/70';
                  let iconColor = 'text-slate-600';

                  if (action.variant === 'primary') {
                    btnStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-[0_4px_16px_-2px_rgba(5,150,105,0.3)]';
                    iconColor = 'text-white';
                  } else if (action.variant === 'danger') {
                    btnStyle = 'bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 border-rose-200/60';
                    iconColor = 'text-rose-600';
                  }

                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action.id)}
                      disabled={action.disabled || !!loadingAction}
                      className={`w-full min-h-[48px] py-3 px-4 rounded-[18px] border font-bold text-[14px] flex items-center justify-between transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        {renderIcon(action.icon, `w-5 h-5 ${iconColor}`)}
                        <span>{action.label}</span>
                      </div>
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </button>
                  );
                })}

                {sourceRecordUrl && (
                  <Link
                    href={sourceRecordUrl}
                    onClick={onClose}
                    data-testid="view-source-record"
                    className="w-full min-h-[48px] py-3 px-4 rounded-[18px] border border-purple-200/80 bg-purple-50/50 hover:bg-purple-100/70 text-purple-700 font-bold text-[14px] flex items-center justify-between transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span>Kaynak Kaydı Görüntüle</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </Link>
                )}

                <button
                  onClick={onClose}
                  className="w-full min-h-[44px] mt-1 py-2.5 text-center text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domain-specific sub modals */}
      {showPostponeModal && (
        <PostponeModal
          isOpen={true}
          taskTitle={resolved.displayTitle}
          currentDate={context.scheduledAt || new Date().toISOString().split('T')[0]}
          onClose={() => setShowPostponeModal(false)}
          onPostpone={handlePostponeSubmit}
        />
      )}

      {showDetailsModal && (
        <CompletionDetailsModal
          isOpen={true}
          taskTitle={resolved.displayTitle}
          category={resolved.category as any}
          onClose={() => {
            setShowDetailsModal(false);
            onClose();
          }}
          onNavigateAway={() => {
            setShowDetailsModal(false);
            onClose();
          }}
          onComplete={handleCompleteWithDetails}
          petId={petId}
          initialDetails={initialApplicationDetails}
          planId={realPlanId}
          plan={context.plan}
          sourceTab={sourceTab}
        />
      )}

      {showParasiteModal && realPlanId && (
        <ParasitePlanCompletionModal
          planId={realPlanId}
          petId={petId!}
          sourceTable={resolved.sourceTable}
          onClose={() => setShowParasiteModal(false)}
          onSuccess={() => handleCompleteSuccess()}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
