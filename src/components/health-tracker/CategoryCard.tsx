'use client';
import React, { useRef, useState } from 'react';
import { FlowEvent } from './types';
import { ActionSheet } from './ActionSheet';
import { CategoryKey } from '@/lib/categoryThemes';

interface CategoryCardProps {
  event: FlowEvent;
  categoryKey: CategoryKey;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: FlowEvent) => void;
  onDelete: (id: string) => void;
}

/** UI kategori etiketini (DB_CATEGORY_TO_UI çıktısı) CategoryKey'e çevirir */
export function toCategoryKey(uiCategory: string): CategoryKey {
  const map: Record<string, CategoryKey> = {
    Saglik: 'saglik',
    Kontrol: 'kontrol',
    Asi: 'asi',
    Parazit: 'parazit',
    'Bakım': 'bakim',
    Beslenme: 'beslenme',
    Hijyen: 'hijyen',
    Aktivite: 'aktivite',
  };
  return map[uiCategory] ?? 'saglik';
}

/** Durum başına açık zeminli tema: renk tek başına değil, ikon + etiketle birlikte anlatılır */
const STATUS_THEME = {
  done: {
    card: 'bg-[#f0fdf4] border-[#86efac] text-[#166534]',
    label: 'Yapıldı',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
    badge: 'bg-[#22c55e] text-white',
  },
  today: {
    card: 'bg-[#eff6ff] border-[#3b82f6] text-[#1d4ed8] shadow-md shadow-blue-500/10',
    label: 'Bugün',
    icon: <span className="block w-[7px] h-[7px] rounded-full bg-current" />,
    badge: 'bg-[#3b82f6] text-white',
  },
  upcoming: {
    card: 'bg-[#f5f8ff] border-[#a9c3ff] text-[#3559a8]',
    label: 'Yaklaşıyor',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
    badge: 'bg-[#7fa0f2] text-white',
  },
  future: {
    card: 'bg-white border-[#dde3ec] text-[#475569]',
    label: 'Planlandı',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
    badge: 'bg-[#94a3b8] text-white',
  },
  missed: {
    card: 'bg-[#fef2f2] border-[#fca5a5] text-[#b91c1c]',
    label: 'Kaçırıldı',
    icon: <span className="block text-[9px] font-black leading-none">!</span>,
    badge: 'bg-[#ef4444] text-white',
  },
} as const;

const COVERAGE_THEME = {
  protected: { bar: 'bg-[#22c55e]', text: 'text-[#166534]' },
  expiring: { bar: 'bg-amber-400', text: 'text-amber-700' },
  expired: { bar: 'bg-red-400', text: 'text-red-700' },
} as const;

function coverageLabel(coverage: NonNullable<FlowEvent['coverage']>): string {
  if (coverage.status === 'expired') return 'Koruma doldu';
  if (coverage.status === 'expiring') return `${coverage.daysRemaining} gün içinde bitiyor`;
  return `Koruma sürüyor · ${coverage.daysRemaining} gün`;
}

/** Tarih-grid akış kartı — açık zemin, durum ikonu + etiketi, esnek yükseklik */
export function CategoryCard({ event, categoryKey, onMarkDone, onPostpone, onEdit, onDelete }: CategoryCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { computedStatus } = event;

  const targetDate = new Date(event.scheduled_at);
  const month = targetDate.toLocaleDateString('tr-TR', { month: 'short' });
  const day = targetDate.getDate();
  const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  const isYearly = (event.pet_care_tasks?.frequency_days || 0) >= 365;

  const TIME_RELEVANT_CATEGORIES = ['Veteriner', 'Saglik'];
  const TIME_RELEVANT_SUB_CATEGORIES = ['İlaç Kullanımı', 'Tedavi & Pansuman'];
  const category = event.pet_care_tasks?.category ?? '';
  const subCategory = event.sub_category ?? '';
  const isTimeRelevant =
    TIME_RELEVANT_CATEGORIES.includes(category) ||
    TIME_RELEVANT_SUB_CATEGORIES.includes(subCategory);

  const hasSpecificTime =
    isTimeRelevant &&
    event.scheduled_at.includes('T') &&
    !event.scheduled_at.includes('T12:00:00') &&
    !event.scheduled_at.includes('T00:00:00');

  let dateText = `${day} ${formattedMonth}`;
  if (isYearly) {
    dateText = `${day} ${formattedMonth} ${targetDate.getFullYear()}`;
  } else if (hasSpecificTime) {
    const timeStr = event.scheduled_at.split('T')[1].slice(0, 5);
    dateText = `${day} ${formattedMonth}, ${timeStr}`;
  }

  const theme = STATUS_THEME[computedStatus] ?? STATUS_THEME.future;
  const title = event.pet_care_tasks?.title || event.title || 'Görev';
  const isStockTracker = event.taskKey === 'Mama Stok Takibi' || title === 'Mama Stok Takibi' || event.title === 'Mama Stok Yenileme' || event.title === 'Tahmini Bitiş';
  const isWeightTracker = event.taskKey === 'Kilo Takibi' || title === 'Kilo Takibi';

  let customLabel: string | null = null;
  if (isStockTracker) {
    if (computedStatus === 'done') {
      customLabel = '+Stok';
    } else if (computedStatus === 'upcoming' || computedStatus === 'future') {
      customLabel = 'Tahmini Bitiş';
    } else if (computedStatus === 'missed') {
      customLabel = 'Bitti';
    }
  } else if (isWeightTracker) {
    if (computedStatus === 'done') {
      customLabel = '+Ölçüm';
    } else if (computedStatus === 'upcoming' || computedStatus === 'future') {
      customLabel = 'Ölçüm Bekleniyor';
    } else if (computedStatus === 'missed') {
      customLabel = 'Ölçüm Gecikti';
    } else if (computedStatus === 'today') {
      customLabel = 'Kilo Ölç';
    }
  }

  const coverageTheme = event.coverage ? COVERAGE_THEME[event.coverage.status] : null;

  // Kart her zaman kendi görev satırının içinde render edilir; satır başlığı
  // görev adını zaten gösteriyor, kartta tekrar etmiyoruz.
  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        data-status={computedStatus}
        aria-label={`${title}, ${theme.label}, ${dateText}`}
        className={`
          flex flex-col items-start text-left overflow-hidden
          rounded-2xl border transition-all duration-200
          w-[100px] h-[64px] min-h-[64px] p-2.5
          ${theme.card}
          hover:scale-[1.05] active:scale-95
        `}
      >
        <div className="w-full flex items-center justify-between">
          <div className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${theme.badge}`}>
            {theme.icon}
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-wide opacity-70">
            {customLabel || theme.label}
          </span>
        </div>

        <span className="text-[10.5px] font-extrabold mt-auto pt-1.5">
          {dateText}
        </span>

        {/* Koruma durumu: çubuk + metin (yalnızca Aşı/Parazit 'done' kartlarında) */}
        {event.coverage && coverageTheme && (
          <div className="w-full mt-1">
            <div className="h-[3px] rounded-full bg-black/10 overflow-hidden">
              <div className={`h-full rounded-full ${coverageTheme.bar}`} style={{ width: `${event.coverage.percent}%` }} />
            </div>
            <p className={`mt-0.5 text-[8px] font-bold leading-tight ${coverageTheme.text}`}>
              {coverageLabel(event.coverage)}
            </p>
          </div>
        )}
      </button>

      {showMenu && (
        <ActionSheet
          event={event}
          anchorRef={containerRef}
          onClose={() => setShowMenu(false)}
          onMarkDone={onMarkDone}
          onPostpone={onPostpone}
          onEdit={(e) => onEdit(e as FlowEvent)}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
