'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  Loader2
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

export interface CanonicalPlanActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: CanonicalPlanContext | null;
  onSuccess?: () => void;
}

export function CanonicalPlanActionModal({
  isOpen,
  onClose,
  context,
  onSuccess,
}: CanonicalPlanActionModalProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showParasiteModal, setShowParasiteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !context) return null;

  const resolved = resolvePlanActions(context);
  const realPlanId = normalizePlanId(context.planId || context.plan?.id);
  const petId = context.petId || context.plan?.pet_id || '';

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
      const res = await fetch(`${getMutationRoute()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Tamamlama başarısız oldu.');
      }
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Completion error:', err);
      setErrorMsg(err.message || 'İşlem tamamlanırken bir hata oluştu.');
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
          const agendaPayload = {
            pet_id: petId,
            category: 'asi',
            input: {
              vaccine_name: resolved.displayTitle,
              vaccine_code: context.plan?.sub_type || 'CUSTOM',
              administered_at: details.product_expiry_at || new Date().toISOString().split('T')[0],
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
            handleCompleteSuccess();
            return;
          }
        } catch (agendaErr) {
          console.warn('[CanonicalPlanActionModal] Agenda write failed, falling back to plans PATCH:', agendaErr);
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
      if (details?.brand) {
        payload.brand_free_text = details.brand;
      }
      if (details?.product_name) {
        payload.product_free_text = details.product_name;
      }

      const res = await fetch(`${getMutationRoute()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Tamamlama başarısız oldu.');
      }

      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Detailed completion error:', err);
      setErrorMsg(err.message || 'Tamamlama detayları kaydedilemedi.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePostponeSubmit = async (newDate: string, note?: string) => {
    if (!realPlanId) return;
    setLoadingAction('postpone');
    try {
      const currentExtra = context.plan?.extra_data || {};
      const payload: any = {
        scheduled_at: newDate,
      };
      if (note) {
        payload.note = note;
        payload.extra_data = { ...currentExtra, postpone_note: note };
      }

      const res = await fetch(`${getMutationRoute()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erteleme başarısız oldu.');
      }

      setShowPostponeModal(false);
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Postpone error:', err);
      setErrorMsg(err.message || 'Erteleme sırasında bir hata oluştu.');
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
        throw new Error(data.error || 'Silme işlemi başarısız oldu.');
      }
      setShowDeleteConfirm(false);
      handleCompleteSuccess();
    } catch (err: any) {
      console.error('[CanonicalPlanActionModal] Delete error:', err);
      setErrorMsg(err.message || 'Plan silinemedi.');
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

  return (
    <>
      <Modal isOpen={isOpen && !showPostponeModal && !showDetailsModal && !showParasiteModal} onClose={onClose}>
        <div className="flex flex-col w-full max-w-sm mx-auto bg-white rounded-[24px] overflow-hidden shadow-2xl animate-fade-in border border-slate-100">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100/80">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                {resolved.category.toUpperCase()} GÖREVİ
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors active:scale-95"
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
                  className="flex-1 py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDeleteSubmit}
                  disabled={loadingAction === 'delete'}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {loadingAction === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Evet, Sil'}
                </button>
              </div>
            </div>
          ) : (
            /* Action Buttons List */
            <div className="p-4 pt-1 flex flex-col gap-2">
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
                    className={`w-full py-3 px-4 rounded-[18px] border font-bold text-[14px] flex items-center justify-between transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      {renderIcon(action.icon, `w-4 h-4 ${iconColor}`)}
                      <span>{action.label}</span>
                    </div>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                );
              })}

              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 text-center text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          )}

        </div>
      </Modal>

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
          onClose={() => setShowDetailsModal(false)}          onComplete={handleCompleteWithDetails}
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
}
