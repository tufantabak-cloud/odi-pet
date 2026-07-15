'use client';
import React, { useEffect, useRef } from 'react';
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

/** Tarih kolonlarının ortak genişliği — başlık ve tüm hücreler aynı ölçüyü kullanır */
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

export function HealthTracker({ petId, onEditTask, refreshTrigger }: HealthTrackerProps) {
  const {
    categoryGroups, loading, markEventStatus, postponeEvent, deleteEvent,
    visibleDates, shiftRange, goToToday,
  } = useHealthTracker(petId, refreshTrigger);
  const [onlyShowMissed, setOnlyShowMissed] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayKey = toDateKey(new Date());
  const visibleKeys = visibleDates.map(toDateKey);
  const todayIndex = visibleKeys.indexOf(todayKey);
  const gridWidth = visibleDates.length * DATE_COL_WIDTH;

  // İlk açılışta (mobilde) bugün kolonunu görünür alana ortala — her render'da değil
  const didAutoScroll = useRef(false);
  useEffect(() => {
    if (loading || didAutoScroll.current || todayIndex < 0) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth >= gridWidth) { didAutoScroll.current = true; return; }
    el.scrollTo({
      left: Math.max(0, todayIndex * DATE_COL_WIDTH - el.clientWidth / 2 + DATE_COL_WIDTH / 2),
    });
    didAutoScroll.current = true;
  }, [loading, todayIndex, gridWidth]);

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

  /** Bir grup/alt grubun görünür penceredeki (ve filtre sonrası) event'leri */
  const visibleEventsOf = (flowEvents?: FlowEvent[]): FlowEvent[] => {
    let list = flowEvents || [];
    if (onlyShowMissed) list = list.filter(e => e.computedStatus === 'missed');
    return list;
  };

  /**
   * Her görev (taskRow) kendi satırında: görev adı + frekansı solda sticky,
   * event'leri kendi tarih kolonlarında. flowEvents kullanılır (coverage taşır),
   * taskKey ile görev bazında ayrıştırılır.
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

      // Koruma aralığı: onlyShowMissed filtresinden bağımsız, görevin TÜM
      // event'lerinden (görünür pencere dışındakiler dahil) hesaplanır —
      // "8 aylık koruma" gibi uzun aralıklar tek bir olaydan doğar.
      const allRowEvents = (flowEvents || []).filter(e => e.taskKey === row.task.title);
      const coverageIntervals = onlyShowMissed ? [] : buildCoverageIntervals(allRowEvents);

      return (
        <div key={`${row.task.category}-${row.task.title}`} className="border-b border-border-main/20 last:border-b-0">
          <div className="pt-1.5">
            <div className="sticky left-0 inline-flex items-baseline gap-2 px-4 max-w-full">
              <span className="text-[11px] font-extrabold text-text-primary">{row.task.title}</span>
              <span className="text-[9.5px] font-semibold text-text-secondary/70">
                {/* Aşıda frequency_label alt grup adıdır — orada gün bazlı frekansı göster */}
                {formatFrequency(row.task.frequency_days, row.subGroupLabel ? null : row.task.frequency_label)}
              </span>
            </div>
          </div>
          <TimelineRow
            eventsByDate={byDate}
            visibleKeys={visibleKeys}
            categoryKey={categoryKey}
            coverageIntervals={coverageIntervals}
            getCreateHref={onlyShowMissed ? undefined : (dateKey) => buildPlanYapHref(petId, group, row, dateKey)}
            {...cardProps}
          />
        </div>
      );
    });
  };

  // Filtre aktifken görünür pencerede hiç kaçırılmış görev var mı?
  const anyVisibleMissed = !onlyShowMissed || categoryGroups.some(group => {
    const lists = group.subGroups && group.subGroups.length > 0
      ? group.subGroups.map(s => s.flowEvents || [])
      : [group.flowEvents || []];
    return lists.some(list =>
      list.some(e => e.computedStatus === 'missed' && visibleKeys.includes(((e as any).due_date || '').split('T')[0]))
    );
  });

  return (
    <div className="py-2 bg-white flex flex-col gap-1">
      {/* Mini Filter Toolbar + tarih gezinmesi */}
      <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-border-main/30 flex-wrap">
        <span className="text-[12px] font-bold text-text-secondary">Ajanda Akışı</span>
        <div className="flex items-center gap-2">
          {todayIndex < 0 && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-full text-[11px] font-black border bg-[#eef3ff] border-[#5b86ff]/40 text-[#3358e0] transition-all active:scale-95"
            >
              Bugüne Dön
            </button>
          )}
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

      {/* Tarih gezinme okları + yatay kaydırılabilir ortak grid */}
      <div className="relative flex items-stretch">
        <NavArrow direction="left" onClick={() => shiftRange(-3)} />

        <div ref={scrollRef} className="flex-1 overflow-x-auto overscroll-x-contain scrollbar-none">
          <div className="relative" style={{ minWidth: gridWidth }}>
            {/* Bugün çizgisi: sayfa merkezine değil, bugünün gerçek kolonuna bağlı */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#5b86ff] via-[#5b86ff]/40 to-transparent z-0 pointer-events-none"
                style={{ left: todayIndex * DATE_COL_WIDTH + DATE_COL_WIDTH / 2 - 1 }}
              />
            )}

            {/* Tarih başlığı — kolonlar hücrelerle aynı grid ölçüsünde */}
            <div
              className="grid pb-3 border-b border-border-main/30"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DATE_COL_WIDTH}px)` }}
            >
              {visibleDates.map((d, i) => (
                <DateHeaderCell key={visibleKeys[i]} date={d} isToday={visibleKeys[i] === todayKey} />
              ))}
            </div>

            {!anyVisibleMissed ? (
              <div className="py-8 px-4 text-center text-text-secondary bg-[#fdfaf5] rounded-3xl m-4 border border-dashed border-[#e69b24]/40 relative z-10">
                <p className="text-[13px] font-bold">Filtreye uygun gecikmiş görev bulunmuyor.</p>
              </div>
            ) : (
              categoryGroups.map(group => (
                <div key={group.category} className="relative z-10">
                  <CategoryHeader group={group} />

                  {group.subGroups && group.subGroups.length > 0 ? (
                    group.subGroups.map(sub => {
                      const rows = renderTaskRows(sub.flowEvents, sub.taskRows, toCategoryKey(group.category), group);
                      if (onlyShowMissed && rows.every(r => r === null)) return null;
                      return (
                        <div key={sub.label} className="mb-1">
                          <div className="pt-1 pb-0.5 bg-[#faf9ff]">
                            <span className="sticky left-0 inline-block px-4 py-0.5 text-[10px] font-bold text-primary/80">{sub.label}</span>
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
          </div>
        </div>

        <NavArrow direction="right" onClick={() => shiftRange(3)} />
      </div>

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

/** Bir tarih anahtarı, koruma aralıklarından herhangi birinin (başlangıç, bitiş) arasında mı? */
function isDateCovered(key: string, intervals: CoverageInterval[]): boolean {
  return intervals.some(iv => key > iv.startDateKey && key < iv.endDateKey);
}

/** Tek satır: her görünür tarih kolonunda o güne ait kartlar; boşsa "kayıt ekle" ipucu ya da koruma aralığı rengi */
function TimelineRow({
  eventsByDate, visibleKeys, categoryKey, coverageIntervals, getCreateHref, onMarkDone, onPostpone, onEdit, onDelete,
}: {
  eventsByDate: Map<string, FlowEvent[]>;
  visibleKeys: string[];
  categoryKey: ReturnType<typeof toCategoryKey>;
  /** Görevin "uygulandı" tarihinden koruma bitişine kadar süren aralıkları — bu günler yeşil boyanır */
  coverageIntervals?: CoverageInterval[];
  /** Boş hücre için "plan yap" sayfasına deep-link üretir; null dönerse hücre pasif kalır */
  getCreateHref?: (dateKey: string) => string | null;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: FlowEvent) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="grid items-start py-2"
      style={{ gridTemplateColumns: `repeat(${visibleKeys.length}, ${DATE_COL_WIDTH}px)` }}
    >
      {visibleKeys.map(key => {
        const cellEvents = eventsByDate.get(key) || [];
        if (cellEvents.length === 0) {
          const href = getCreateHref?.(key) ?? null;
          const covered = isDateCovered(key, coverageIntervals || []);
          return (
            <div key={key} className="flex items-center justify-center min-h-[64px]">
              {href ? (
                <button
                  type="button"
                  onClick={() => router.push(href)}
                  aria-label={covered ? `${formatShortDate(key)} — koruma sürüyor` : `${formatShortDate(key)} için kayıt ekle`}
                  title={covered ? `${formatShortDate(key)} — koruma sürüyor` : `${formatShortDate(key)} için kayıt ekle`}
                  className={
                    covered
                      ? 'w-[92px] min-h-[64px] rounded-2xl border border-[#86efac] bg-[#f0fdf4] text-[#166534] hover:bg-[#e2fbe8] flex flex-col items-center justify-center gap-1 transition-colors'
                      : 'w-[92px] min-h-[64px] rounded-2xl border border-dashed border-border-main text-text-secondary/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors'
                  }
                >
                  {covered ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span className="text-[8.5px] font-bold uppercase tracking-wide">Korumada</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="text-[9.5px] font-bold">{formatShortDate(key)}</span>
                    </>
                  )}
                </button>
              ) : covered ? (
                <div className="w-[92px] min-h-[64px] rounded-2xl border border-[#86efac] bg-[#f0fdf4] text-[#166534] flex flex-col items-center justify-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span className="text-[8.5px] font-bold uppercase tracking-wide">Korumada</span>
                </div>
              ) : null}
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
  );
}

/** Kategori başlığı: etiket + toplam kayıt sayısı */
function CategoryHeader({ group }: { group: CategoryGroup }) {
  const count = (group.subGroups && group.subGroups.length > 0)
    ? group.subGroups.reduce((sum, s) => sum + (s.flowEvents?.length || 0), 0)
    : (group.flowEvents?.length || 0);

  return (
    <div className="bg-[#f6f8fb] border-y border-border-main/40 mb-2 py-2">
      {/* Yatay scroll'da görünür kalması için başlık içeriği sticky */}
      <div className="sticky left-0 inline-flex items-center gap-2 px-4 max-w-full">
        <h3 className="text-[11px] font-black text-[#556987] uppercase tracking-wider">{group.label}</h3>
        <span className="text-[10.5px] font-bold text-text-secondary/60 ml-2">{count} kayıt</span>
      </div>
    </div>
  );
}

/** Tarih başlığı hücresi — altındaki kolonla aynı dikey eksende */
function DateHeaderCell({ date, isToday }: { date: Date; isToday: boolean }) {
  const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase();
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });

  return (
    <div className="flex flex-col items-center gap-1 pt-1 relative z-10">
      <div
        className={`flex flex-col items-center justify-center shrink-0 w-[48px] h-[56px] rounded-xl border transition-all ${
          isToday
            ? 'bg-gradient-to-br from-[#5b86ff] to-[#3358e0] border-transparent text-white shadow-sm'
            : 'bg-[#f6f8fb] border-border-main/50 text-text-primary'
        }`}
      >
        <span className={`text-[8.5px] font-black tracking-wider ${isToday ? 'text-white/80' : 'text-text-secondary/70'}`}>
          {dayName}
        </span>
        <span className="text-[14px] font-black mt-0.5">{dayNum}</span>
        <span className={`text-[8px] font-bold ${isToday ? 'text-white/70' : 'text-text-secondary/60'}`}>
          {monthName}
        </span>
      </div>
      {isToday && (
        <span className="text-[9px] font-black text-[#3358e0] uppercase tracking-wider">Bugün</span>
      )}
    </div>
  );
}

/** Tarih penceresini kaydıran ok butonu */
function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'left' ? 'Önceki günler' : 'Sonraki günler'}
      className="shrink-0 w-7 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-bg-main/60 transition-colors rounded-lg my-1"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
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
