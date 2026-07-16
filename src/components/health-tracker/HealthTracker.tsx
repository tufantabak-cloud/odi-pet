'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthTracker, toDateKey, formatFrequency } from './useHealthTracker';
import { CategoryCard, toCategoryKey } from './CategoryCard';
import { CategoryGroup, FlowEvent, TaskRow } from './types';
import { buildPlanYapHref } from './lib/plan-link';
import { buildCoverageIntervals, CoverageInterval } from './lib/coverage';

interface HealthTrackerProps {
  petId: string;
  onEditTask?: (task: any) => void;
  refreshTrigger?: number;
}

/** Tarih kolonlarının ortak genişliği — her satırın kendi grid'i aynı ölçüyü kullanır */
const DATE_COL_WIDTH = 108;

/** 'YYYY-MM-DD' tarih anahtarını kısa Türkçe metne çevirir (örn. "13 Tem") */
function formatShortDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  if (isNaN(d.getTime())) return dateKey;
  const month = d.toLocaleDateString('tr-TR', { month: 'short' });
  const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${d.getDate()} ${formattedMonth}`;
}

/** Görünür aralıktaki event'leri tarih anahtarına göre gruplar */
function groupEventsByDate(events: FlowEvent[], visibleKeys: string[]): Map<string, FlowEvent[]> {
  const map = new Map<string, FlowEvent[]>();
  visibleKeys.forEach(k => map.set(k, []));
  events.forEach(e => {
    const raw = (e as any).due_date || e.scheduled_at || '';
    const key = raw.includes('T') ? raw.split('T')[0] : raw;
    if (map.has(key)) map.get(key)!.push(e);
  });
  return map;
}

/**
 * Fare ile bir kaydırma alanını sürükleyerek yatay gezinme (touch zaten
 * tarayıcı tarafından native destekleniyor). Sürükleme sırasında oluşan
 * "click" olayını bastırır ki kart menüsü yanlışlıkla açılmasın.
 */
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      moved = false;
      startX = e.pageX;
      startScroll = el.scrollLeft;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const endDrag = () => { isDown = false; };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [ref]);
}

export function HealthTracker({ petId, onEditTask, refreshTrigger }: HealthTrackerProps) {
  const {
    categoryGroups, loading, markEventStatus, postponeEvent, deleteEvent,
    visibleDates,
  } = useHealthTracker(petId, refreshTrigger);
  const [onlyShowMissed, setOnlyShowMissed] = useState(false);
  // Artırıldığında tüm satırlar bağımsız olarak "bugün"e geri kayar
  const [resetToken, setResetToken] = useState(0);

  const todayKey = toDateKey(new Date());
  const visibleKeys = visibleDates.map(toDateKey);

  if (loading) {
    return (
      <div className="py-4 bg-white rounded-3xl border border-border-main shadow-sm animate-pulse">
        <div className="px-5 mb-4">
          <div className="h-5 w-28 bg-border-main rounded" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-center gap-3 px-5 py-3">
            <div className="h-[100px] w-[100px] bg-border-main rounded-2xl shrink-0" />
            <div className="h-[100px] w-[100px] bg-border-main rounded-2xl shrink-0" />
            <div className="h-[100px] w-[100px] bg-border-main/60 rounded-2xl shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (categoryGroups.length === 0) {
    return (
      <div className="py-8 px-4 text-center text-text-secondary bg-bg-main rounded-2xl m-4 border border-dashed border-border-main">
        <p className="text-[14px] font-semibold">Henüz planlanmış bir etkinlik yok.</p>
      </div>
    );
  }

  const cardProps = {
    onMarkDone: (id: string) => markEventStatus(id, 'done'),
    onPostpone: (id: string) => postponeEvent(id, 1),
    onEdit: onEditTask || (() => {}),
    onDelete: deleteEvent,
  };

  /** Bir grup/alt grubun (filtre sonrası) event'leri */
  const visibleEventsOf = (flowEvents?: FlowEvent[]): FlowEvent[] => {
    let list = flowEvents || [];
    if (onlyShowMissed) list = list.filter(e => e.computedStatus === 'missed');
    return list;
  };

  /**
   * Her görev (taskRow) kendi başlığı + kendi bağımsız sürüklenebilir
   * tarih satırıyla render edilir. Satırlar birbirinden bağımsız kayar;
   * ortak olan yalnızca tarih dizisidir (visibleKeys), scroll konumu değil.
   */
  const renderTaskRows = (
    flowEvents: FlowEvent[] | undefined,
    taskRows: TaskRow[],
    categoryKey: ReturnType<typeof toCategoryKey>,
    group: CategoryGroup,
  ) => {
    const filtered = visibleEventsOf(flowEvents);
    return taskRows.map(row => {
      const rowEvents = filtered.filter(e => e.taskKey === row.task.title);
      const byDate = groupEventsByDate(rowEvents, visibleKeys);
      const hasVisible = Array.from(byDate.values()).some(l => l.length > 0);
      if (onlyShowMissed && !hasVisible) return null;

      // Koruma aralığı: görevin TÜM event'lerinden hesaplanır — "8 aylık
      // koruma" gibi uzun aralıklar tek bir uygulama kaydından doğabilsin.
      const allRowEvents = (flowEvents || []).filter(e => e.taskKey === row.task.title);
      const coverageIntervals = onlyShowMissed ? [] : buildCoverageIntervals(allRowEvents);
      const missedIntervals = onlyShowMissed ? [] : buildMissedIntervals(allRowEvents);

      // Son geçerlilik tarihi: en son done event'teki coverage.endDateKey (dd.mm.yy)
      const lastDoneWithCoverage = [...allRowEvents]
        .reverse()
        .find(e => e.status === 'done' && e.coverage?.endDateKey);
      const expiryDateLabel = lastDoneWithCoverage?.coverage?.endDateKey
        ? (() => {
            const [y, m, d] = lastDoneWithCoverage.coverage!.endDateKey.split('-');
            return `${d}.${m}.${y.slice(2)}`;
          })()
        : null;

      return (
        <div key={`${row.task.category}-${row.task.title}`} className="border-b border-border-main/20 last:border-b-0 py-1.5">
          <div className="px-4 flex items-baseline gap-2">
            <span className="text-[11px] font-extrabold text-text-primary">{row.task.title}</span>
            <span className="text-[9.5px] font-semibold text-text-secondary/70">
              {/* Aşıda frequency_label alt grup adıdır — orada gün bazlı frekansı göster */}
              {formatFrequency(row.task.frequency_days, row.subGroupLabel ? null : row.task.frequency_label)}
            </span>
            {expiryDateLabel && (
              <span className="text-[9px] font-semibold text-text-secondary/50">
                Son: {expiryDateLabel}
              </span>
            )}
          </div>
          <TimelineRow
            visibleKeys={visibleKeys}
            todayKey={todayKey}
            resetToken={resetToken}
            eventsByDate={byDate}
            categoryKey={categoryKey}
            coverageIntervals={coverageIntervals}
            missedIntervals={missedIntervals}
            getCreateHref={onlyShowMissed ? undefined : (dateKey) => buildPlanYapHref(petId, group, row, dateKey)}
            {...cardProps}
          />
        </div>
      );
    });
  };

  // Filtre aktifken herhangi bir kaçırılmış görev var mı?
  const anyMissed = !onlyShowMissed || categoryGroups.some(group => {
    const lists = group.subGroups && group.subGroups.length > 0
      ? group.subGroups.map(s => s.flowEvents || [])
      : [group.flowEvents || []];
    return lists.some(list => list.some(e => e.computedStatus === 'missed'));
  });

  return (
    <div className="py-2 bg-white flex flex-col gap-1">
      {/* Mini Filter Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-border-main/30 flex-wrap">
        <span className="text-[12px] font-bold text-text-secondary">Ajanda Akışı</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResetToken(t => t + 1)}
            className="px-3 py-1.5 rounded-full text-[11px] font-black border bg-[#eef3ff] border-[#5b86ff]/40 text-[#3358e0] transition-all active:scale-95"
          >
            Bugüne Dön
          </button>
          <button
            onClick={() => setOnlyShowMissed(!onlyShowMissed)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all active:scale-95 ${
              onlyShowMissed
                ? 'bg-[#e25353] border-[#e25353] text-white shadow-xs'
                : 'bg-white border-border-main text-text-secondary hover:text-primary hover:border-primary/40'
            }`}
          >
            {onlyShowMissed ? '🚨 Gecikenleri Gizle' : '🚨 Gecikenleri Filtrele'}
          </button>
        </div>
      </div>

      <p className="px-4 text-[10px] text-text-secondary/60 font-semibold -mt-0.5">
        Her satırı geçmiş veya ileri tarihlere sürükleyerek gezinebilirsiniz
      </p>

      {!anyMissed ? (
        <div className="py-8 px-4 text-center text-text-secondary bg-[#fdfaf5] rounded-3xl m-4 border border-dashed border-[#e69b24]/40">
          <p className="text-[13px] font-bold">Filtreye uygun gecikmiş görev bulunmuyor.</p>
        </div>
      ) : (
        categoryGroups.map(group => (
          <div key={group.category}>
            <CategoryHeader group={group} />

            {group.subGroups && group.subGroups.length > 0 ? (
              group.subGroups.map(sub => {
                const rows = renderTaskRows(sub.flowEvents, sub.taskRows, toCategoryKey(group.category), group);
                if (onlyShowMissed && rows.every(r => r === null)) return null;
                return (
                  <div key={sub.label} className="mb-1">
                    <div className="pt-1 pb-0.5 px-4 bg-[#faf9ff]">
                      <span className="text-[10px] font-bold text-primary/80">{sub.label}</span>
                    </div>
                    {rows}
                  </div>
                );
              })
            ) : (
              renderTaskRows(group.flowEvents, group.taskRows, toCategoryKey(group.category), group)
            )}
          </div>
        ))
      )}

      {/* Renk Lejandı */}
      <div className="flex items-center gap-4 px-4 pt-4 pb-2 mt-2 border-t border-border-main/30 flex-wrap">
        <LegendDot color="bg-[#f0fdf4] border border-[#86efac]" label="Yapıldı" />
        <LegendDot color="bg-[#eff6ff] border border-[#3b82f6]" label="Bugün" />
        <LegendDot color="bg-[#f5f8ff] border border-[#a9c3ff]" label="Yaklaşıyor" />
        <LegendDot color="bg-white border border-[#dde3ec]" label="Planlandı" />
        <LegendDot color="bg-[#fef2f2] border border-[#fca5a5]" label="Kaçırıldı" />
        <LegendDot color="bg-[#f0fdf4] border border-[#86efac]" label="Korumada" />
      </div>
    </div>
  );
}

/** Bir tarih anahtarını kapsayan koruma aralığını (varsa) döndürür */
function findCoveringInterval(key: string, intervals: CoverageInterval[]): CoverageInterval | undefined {
  return intervals.find(iv => key > iv.startDateKey && key < iv.endDateKey);
}

interface MissedInterval {
  startDateKey: string;
  endDateKey: string;
  sourceEvent: FlowEvent;
}

function buildMissedIntervals(events: FlowEvent[]): MissedInterval[] {
  const sorted = [...events].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const intervals: MissedInterval[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr.computedStatus === 'missed') {
      // Find the next done event after this missed event
      const nextDone = sorted.slice(i + 1).find(e => e.status === 'done' || e.status === 'completed' || e.computedStatus === 'done');
      
      const start = new Date(curr.due_date);
      start.setDate(start.getDate() + 1); // Day after missed event
      const startDateKey = toDateKey(start);

      let endDateKey = '9999-12-31';
      if (nextDone) {
        const end = new Date(nextDone.due_date);
        end.setDate(end.getDate() - 1); // Day before next done event
        endDateKey = toDateKey(end);
      }

      if (startDateKey <= endDateKey) {
        intervals.push({
          startDateKey,
          endDateKey,
          sourceEvent: curr
        });
      }
    }
  }
  return intervals;
}

function findCoveringMissedInterval(key: string, intervals: MissedInterval[]): MissedInterval | undefined {
  return intervals.find(iv => key >= iv.startDateKey && key <= iv.endDateKey);
}

/**
 * Tek satır: kendi başına yatay sürüklenebilir/kaydırılabilir tarih ekseni.
 * Diğer satırlardan bağımsız — kendi scroll konumunu tutar, kendi "bugün"
 * çizgisini kendi içinde taşır.
 */
function TimelineRow({
  visibleKeys, todayKey, resetToken, eventsByDate, categoryKey, coverageIntervals, missedIntervals, getCreateHref,
  onMarkDone, onPostpone, onEdit, onDelete,
}: {
  visibleKeys: string[];
  todayKey: string;
  /** Değiştiğinde satır "bugün"e geri kayar */
  resetToken: number;
  eventsByDate: Map<string, FlowEvent[]>;
  categoryKey: ReturnType<typeof toCategoryKey>;
  /** Görevin "uygulandı" tarihinden koruma bitişine kadar süren aralıkları — bu günler yeşil boyanır */
  coverageIntervals?: CoverageInterval[];
  missedIntervals?: MissedInterval[];
  /** Boş hücre için "plan yap" sayfasına deep-link üretir; null dönerse hücre pasif kalır */
  getCreateHref?: (dateKey: string) => string | null;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: FlowEvent) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  useDragScroll(scrollRef);

  const todayIndex = visibleKeys.indexOf(todayKey);
  const gridWidth = visibleKeys.length * DATE_COL_WIDTH;

  // Mount'ta ve "Bugüne Dön" tetiklendiğinde (resetToken değişince) bugüne kaydır
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || todayIndex < 0) return;
    el.scrollTo({
      left: Math.max(0, todayIndex * DATE_COL_WIDTH - el.clientWidth / 2 + DATE_COL_WIDTH / 2),
    });
  }, [resetToken, todayIndex]);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overscroll-x-contain scrollbar-none cursor-grab active:cursor-grabbing select-none"
    >
      <div className="relative" style={{ minWidth: gridWidth }}>
        {todayIndex >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#5b86ff] via-[#5b86ff]/40 to-transparent z-0 pointer-events-none"
            style={{ left: todayIndex * DATE_COL_WIDTH + DATE_COL_WIDTH / 2 - 1 }}
          />
        )}
        <div
          className="grid items-start py-2 relative z-10"
          style={{ gridTemplateColumns: `repeat(${visibleKeys.length}, ${DATE_COL_WIDTH}px)` }}
        >
          {visibleKeys.map(key => {
            const cellEvents = eventsByDate.get(key) || [];
            const isToday = key === todayKey;
            if (cellEvents.length === 0) {
              const coveringInterval = findCoveringInterval(key, coverageIntervals || []);
              // Koruma sürüyorsa: bu tarih bir "boşluk" değil, gerçek bir kaydın devamı —
              // tıklanınca YENİ kayıt açmak yerine o kaydın kendisi düzenlemeye açılır.
              if (coveringInterval) {
                return (
                  <div key={key} className="flex items-center justify-center min-h-[64px]">
                    <button
                      type="button"
                      onClick={() => onEdit(coveringInterval.sourceEvent)}
                      aria-label={`${formatShortDate(key)} — koruma sürüyor, kaydı düzenle`}
                      title={`${formatShortDate(key)} — koruma sürüyor, kaydı düzenle`}
                      className="w-[100px] min-h-[64px] rounded-2xl border border-[#86efac] bg-[#f0fdf4] text-[#166534] hover:bg-[#e2fbe8] hover:scale-[1.05] active:scale-95 flex flex-col items-start text-left overflow-hidden p-2.5 transition-all duration-200"
                    >
                      <div className="w-full flex items-center justify-between">
                        <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center bg-[#22c55e] text-white">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                        <span className="text-[8.5px] font-bold uppercase tracking-wide opacity-70">
                          Korumada
                        </span>
                      </div>
                      <span className="text-[10.5px] font-extrabold mt-auto pt-1.5">
                        {formatShortDate(key)}
                      </span>
                    </button>
                  </div>
                );
              }

              const coveringMissedInterval = findCoveringMissedInterval(key, missedIntervals || []);
              if (coveringMissedInterval) {
                return (
                  <div key={key} className="flex items-center justify-center min-h-[64px]">
                    <button
                      type="button"
                      onClick={() => onEdit(coveringMissedInterval.sourceEvent)}
                      aria-label={`${formatShortDate(key)} — görev gecikti, kaydı düzenle`}
                      title={`${formatShortDate(key)} — görev gecikti, kaydı düzenle`}
                      className="w-[100px] min-h-[64px] rounded-2xl border border-[#fca5a5] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2] hover:scale-[1.05] active:scale-95 flex flex-col items-start text-left overflow-hidden p-2.5 transition-all duration-200"
                    >
                      <div className="w-full flex items-center justify-between">
                        <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center bg-[#ef4444] text-white">
                          <span className="block text-[9px] font-black leading-none">!</span>
                        </div>
                        <span className="text-[8.5px] font-bold uppercase tracking-wide opacity-70">
                          Kaçırıldı
                        </span>
                      </div>
                      <span className="text-[10.5px] font-extrabold mt-auto pt-1.5">
                        {formatShortDate(key)}
                      </span>
                    </button>
                  </div>
                );
              }

              const href = getCreateHref?.(key) ?? null;
              return (
                <div key={key} className="flex items-center justify-center min-h-[64px]">
                  {href && (
                    <button
                      type="button"
                      onClick={() => router.push(href)}
                      aria-label={`${formatShortDate(key)} için kayıt ekle`}
                      title={`${formatShortDate(key)} için kayıt ekle`}
                      className={`w-[92px] min-h-[64px] rounded-2xl border border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                        isToday
                           ? 'border-[#5b86ff]/50 text-[#3358e0] hover:bg-[#eef3ff]'
                           : 'border-border-main text-text-secondary/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="text-[9.5px] font-bold">{formatShortDate(key)}</span>
                      {isToday && <span className="text-[7.5px] font-black uppercase tracking-wide">Bugün</span>}
                    </button>
                  )}
                </div>
              );
            }
            return (
              <div key={key} className="flex flex-col items-center gap-2 min-h-[24px]">
                {cellEvents.map(event => (
                  <CategoryCard
                    key={event.id}
                    event={event}
                    categoryKey={categoryKey}
                    onMarkDone={onMarkDone}
                    onPostpone={onPostpone}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Kategori başlığı: etiket + toplam kayıt sayısı */
function CategoryHeader({ group }: { group: CategoryGroup }) {
  const count = (group.subGroups && group.subGroups.length > 0)
    ? group.subGroups.reduce((sum, s) => sum + (s.flowEvents?.length || 0), 0)
    : (group.flowEvents?.length || 0);

  return (
    <div className="bg-[#f6f8fb] border-y border-border-main/40 mb-2 py-2 px-4 flex items-center gap-2">
      <h3 className="text-[11px] font-black text-[#556987] uppercase tracking-wider">{group.label}</h3>
      <span className="text-[10.5px] font-bold text-text-secondary/60 ml-2">{count} kayıt</span>
    </div>
  );
}

/** Lejant noktası */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3.5 h-3.5 rounded-sm ${color}`} />
      <span className="text-[11px] text-text-secondary font-bold">{label}</span>
    </div>
  );
}
