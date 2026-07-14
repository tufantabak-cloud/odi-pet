'use client';
import React, { useState } from 'react';
import { useHealthTracker } from './useHealthTracker';
import { CategoryFlowRow } from './CategoryFlowRow';
import { toCategoryKey } from './CategoryCard';
import { CategoryGroup, FlowBucket } from './types';
import { PetIcons } from '@/components/icons/PetIcons';
import { categoryThemes } from '@/lib/categoryThemes';

interface HealthTrackerProps {
  petId: string;
  onEditTask?: (task: any) => void;
  refreshTrigger?: number;
}

/** Sadece 'missed' event'leri bırakan bir FlowBucket türet */
function filterFlowMissed(flow?: FlowBucket): FlowBucket {
  if (!flow) return { before: [], anchor: null, after: [] };
  const before = flow.before.filter(e => e.computedStatus === 'missed');
  const after = flow.after.filter(e => e.computedStatus === 'missed');
  const anchor = flow.anchor && flow.anchor.computedStatus === 'missed' ? flow.anchor : null;
  return { before, anchor, after };
}

function flowCount(flow?: FlowBucket): number {
  if (!flow) return 0;
  return flow.before.length + (flow.anchor ? 1 : 0) + flow.after.length;
}

export function HealthTracker({ petId, onEditTask, refreshTrigger }: HealthTrackerProps) {
  const { categoryGroups, loading, markEventStatus, postponeEvent, deleteEvent } = useHealthTracker(petId, refreshTrigger);
  const [onlyShowMissed, setOnlyShowMissed] = useState(false);

  const today = new Date();
  const refDays = [-2, -1, 0, 1, 2, 3].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d;
  });

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

  // onlyShowMissed aktifken her grubun flow'unu (ve varsa subGroups'unu) filtrele
  const filteredGroups: CategoryGroup[] = categoryGroups.map(group => {
    if (!onlyShowMissed) return group;
    return {
      ...group,
      flow: filterFlowMissed(group.flow),
      subGroups: group.subGroups?.map(sub => ({ ...sub, flow: filterFlowMissed(sub.flow) })),
    };
  }).filter(group => {
    if (!onlyShowMissed) return true;
    const hasSubGroups = group.subGroups && group.subGroups.length > 0;
    if (hasSubGroups) return group.subGroups!.some(sub => flowCount(sub.flow) > 0);
    return flowCount(group.flow) > 0;
  });

  return (
    <div className="py-2 bg-white flex flex-col gap-1">
      {/* Mini Filter Toolbar */}
      <div className="flex items-center justify-between px-4 pb-2 border-b border-border-main/30">
        <span className="text-[12px] font-bold text-text-secondary">Ajanda Akışı</span>
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

      {/* Bugün eksenini gösteren referans tarih şeridi + dikey çizgi başlangıcı */}
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-[#5b86ff] via-[#5b86ff]/40 to-transparent z-0 pointer-events-none" />

        <div className="grid grid-cols-[minmax(0,1fr)_116px_minmax(0,1fr)] items-start pb-3 border-b border-border-main/30">
          <div className="flex justify-end gap-1.5 pr-3 pt-1">
            {refDays.slice(0, 2).map(d => (
              <RefDatePill key={d.toISOString()} date={d} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 relative z-10">
            <RefDatePill date={today} isToday />
            <span className="text-[9px] font-black text-[#3358e0] uppercase tracking-wider">Bugün</span>
          </div>
          <div className="flex justify-start gap-1.5 pl-3 pt-1">
            {refDays.slice(3, 6).map(d => (
              <RefDatePill key={d.toISOString()} date={d} />
            ))}
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="py-8 px-4 text-center text-text-secondary bg-[#fdfaf5] rounded-3xl m-4 border border-dashed border-[#e69b24]/40 relative z-10">
            <p className="text-[13px] font-bold">Filtreye uygun gecikmiş görev bulunmuyor.</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.category} className="relative z-10">
              <CategoryHeader group={group} />

              {group.subGroups && group.subGroups.length > 0 ? (
                group.subGroups.map(sub => (
                  flowCount(sub.flow) > 0 ? (
                    <div key={sub.label} className="mb-1">
                      <div className="px-4 pt-1 pb-0.5">
                        <span className="text-[10px] font-bold text-text-secondary/80">{sub.label}</span>
                      </div>
                      <CategoryFlowRow
                        flow={sub.flow!}
                        categoryKey={toCategoryKey(group.category)}
                        onMarkDone={(id) => markEventStatus(id, 'done')}
                        onPostpone={(id) => postponeEvent(id, 1)}
                        onEdit={onEditTask || (() => {})}
                        onDelete={deleteEvent}
                      />
                    </div>
                  ) : null
                ))
              ) : (
                <CategoryFlowRow
                  flow={group.flow!}
                  categoryKey={toCategoryKey(group.category)}
                  onMarkDone={(id) => markEventStatus(id, 'done')}
                  onPostpone={(id) => postponeEvent(id, 1)}
                  onEdit={onEditTask || (() => {})}
                  onDelete={deleteEvent}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Renk Lejandı */}
      <div className="flex items-center gap-4 px-4 pt-4 pb-2 mt-2 border-t border-border-main/30 flex-wrap">
        <LegendDot color="bg-gradient-to-br from-[#33c08c] to-[#1f9d6c]" label="Yapıldı" />
        <LegendDot color="bg-gradient-to-br from-[#5b86ff] to-[#3358e0]" label="Bugün" />
        <LegendDot color="bg-gradient-to-br from-[#8fb2ff] to-[#5b86ff]" label="Yaklaşıyor" />
        <LegendDot color="bg-gradient-to-br from-[#3a4256] to-[#2b3140]" label="Planlandı" />
        <LegendDot color="bg-gradient-to-br from-[#ff6c6c] to-[#d43a3a]" label="Kaçırıldı" />
      </div>
    </div>
  );
}

/** Kategori başlığı: gradyanlı ikon rozeti + etiket + kayıt sayısı (global filtreyi tetiklemez) */
function CategoryHeader({ group }: { group: CategoryGroup }) {
  const key = toCategoryKey(group.category);
  const theme = categoryThemes[key];
  const icon = PetIcons[key]?.icon;
  const count = (group.subGroups && group.subGroups.length > 0)
    ? group.subGroups.reduce((sum, s) => sum + flowCount(s.flow), 0)
    : flowCount(group.flow);

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#f6f8fb] border-y border-border-main/40 mb-2">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: theme ? `linear-gradient(135deg, ${theme.progressColor}, ${theme.textColor})` : undefined }}
      >
        {icon ? icon({ size: 18 }) : null}
      </div>
      <h3 className="text-[11px] font-black text-[#556987] uppercase tracking-wider">{group.label}</h3>
      <span className="ml-auto text-[10.5px] font-bold text-text-secondary/70">{count} kayıt</span>
    </div>
  );
}

/** Referans tarih şeridindeki tekil gün rozeti — sadece bağlam için, kartlarla hizalı değil */
function RefDatePill({ date, isToday = false }: { date: Date; isToday?: boolean }) {
  const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase();
  const dayNum = date.getDate();
  return (
    <div
      className={`flex flex-col items-center justify-center shrink-0 w-[40px] h-[48px] rounded-xl border transition-all ${
        isToday
          ? 'bg-gradient-to-br from-[#5b86ff] to-[#3358e0] border-transparent text-white shadow-sm'
          : 'bg-[#f6f8fb] border-border-main/50 text-text-primary'
      }`}
    >
      <span className={`text-[8.5px] font-black tracking-wider ${isToday ? 'text-white/80' : 'text-text-secondary/70'}`}>
        {dayName}
      </span>
      <span className="text-[13px] font-black mt-0.5">
        {dayNum}
      </span>
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
