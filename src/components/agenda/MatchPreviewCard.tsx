'use client';

import React from 'react';

export interface PlanCandidate {
  planId: string;
  mainPlanId: string;
  occurrenceScheduledAt: string;
  category: string;
  subCategory?: string;
  stableIdentity: string;
  distanceMinutes: number;
  repeatRule?: string;
  displayDate: string;
  rawPlan?: any;
}

export interface MatchPreviewResult {
  status: 'exact' | 'multiple' | 'none' | 'unsupported';
  candidate?: PlanCandidate;
  candidates?: PlanCandidate[];
  reason?: string;
  message?: string;
}

interface MatchPreviewCardProps {
  category: 'asi' | 'parazit' | 'ilac';
  matchResult: MatchPreviewResult | null;
  loading: boolean;
  selectedOption: 'link' | 'independent';
  selectedPlanId: string | null;
  onSelectOption: (option: 'link' | 'independent') => void;
  onSelectPlanId: (planId: string) => void;
  actualDate: string;
}

export const MatchPreviewCard: React.FC<MatchPreviewCardProps> = ({
  category,
  matchResult,
  loading,
  selectedOption,
  selectedPlanId,
  onSelectOption,
  onSelectPlanId,
  actualDate
}) => {
  if (category === 'ilac' || (matchResult && matchResult.status === 'unsupported')) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 animate-pulse flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-indigo-900">Eşleşen aktif görevler kontrol ediliyor...</span>
      </div>
    );
  }

  if (!matchResult) return null;

  const { status, candidate, candidates } = matchResult;

  if (status === 'none' || (!candidate && (!candidates || candidates.length === 0))) {
    return (
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="text-base">📌</span>
          <span>Eşleşen aktif plan bulunamadı. Kayıt <strong>bağımsız sağlık kaydı</strong> olarak eklenecektir.</span>
        </div>
      </div>
    );
  }

  if (status === 'exact' && candidate) {
    const isLinkSelected = selectedOption === 'link';

    return (
      <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            🎯 Eşleşen Görev Bulundu
          </span>
          <span className="text-xs text-slate-500 font-medium">Tarih: {candidate.displayDate}</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-sm space-y-1">
          <div className="font-bold text-sm text-slate-900">
            {candidate.subCategory || candidate.stableIdentity}
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>📅 Planlanan: <strong>{candidate.displayDate}</strong></span>
            <span>💉 Uygulanan: <strong>{actualDate}</strong></span>
            {candidate.rawPlan?.extra_data?.dose_number && (
              <span>🔢 Doz: <strong>{candidate.rawPlan.extra_data.dose_number}. Doz</strong></span>
            )}
          </div>
        </div>

        {/* Seçenekler */}
        <div className="space-y-2 pt-1">
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              isLinkSelected
                ? 'border-indigo-600 bg-indigo-50/90 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="match_choice"
              checked={isLinkSelected}
              onChange={() => {
                onSelectOption('link');
                onSelectPlanId(candidate.planId);
              }}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <div className="font-bold text-slate-900">Mevcut görevi tamamla ve sonraki tarihi planla</div>
              <div className="text-slate-600 mt-0.5">
                Bu görev tamamlandı olarak işaretlenir ve rutin takvim otomatik güncellenir.
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              !isLinkSelected
                ? 'border-indigo-600 bg-indigo-50/90 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="match_choice"
              checked={!isLinkSelected}
              onChange={() => onSelectOption('independent')}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <div className="font-bold text-slate-900">Bağımsız sağlık kaydı ekle</div>
              <div className="text-slate-600 mt-0.5">
                Giriş mevcut planları etkilemez, yalnızca geçmiş kayıt olarak eklenir.
              </div>
            </div>
          </label>
        </div>
      </div>
    );
  }

  if (status === 'multiple' && candidates && candidates.length > 0) {
    const isIndependent = selectedOption === 'independent';

    return (
      <div className="p-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            ⚠️ Birden Fazla Aday Görev Var
          </span>
          <span className="text-xs text-amber-900 font-medium">Lütfen bir görev seçin</span>
        </div>

        <div className="space-y-2">
          {candidates.map((c) => {
            const isSelected = selectedOption === 'link' && selectedPlanId === c.planId;
            return (
              <label
                key={c.planId}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/90 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="match_choice_multiple"
                  checked={isSelected}
                  onChange={() => {
                    onSelectOption('link');
                    onSelectPlanId(c.planId);
                  }}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">
                    {c.subCategory || c.stableIdentity} ({c.displayDate})
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Planlanan Tarih: {c.displayDate}
                  </div>
                </div>
              </label>
            );
          })}

          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              isIndependent
                ? 'border-amber-600 bg-amber-50/90 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="match_choice_multiple"
              checked={isIndependent}
              onChange={() => onSelectOption('independent')}
              className="mt-0.5 text-amber-600 focus:ring-amber-500"
            />
            <div className="text-xs">
              <div className="font-bold text-slate-900">Bağımsız kayıt ekle</div>
              <div className="text-slate-600 mt-0.5">
                Görevlerden hiçbirine bağlamadan bağımsız geçmiş kaydı ekler.
              </div>
            </div>
          </label>
        </div>
      </div>
    );
  }

  return null;
};
