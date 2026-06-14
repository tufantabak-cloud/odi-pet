'use client';
import React from 'react';
import { useHealthTracker } from './useHealthTracker';
import { TrackerRow } from './TrackerRow';

interface HealthTrackerProps {
  petId: string;
  onEditTask?: (event: any) => void;
}

export function HealthTracker({ petId, onEditTask }: HealthTrackerProps) {
  const { categoryGroups, loading, markEventStatus, postponeEvent, deleteEvent, formatFrequency } = useHealthTracker(petId);

  if (loading) {
    return (
      <div className="py-4 bg-white rounded-3xl border border-border-main shadow-sm animate-pulse">
        <div className="px-5 mb-4">
          <div className="h-5 w-28 bg-border-main rounded" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="w-[110px] space-y-1.5">
              <div className="h-3.5 w-20 bg-border-main rounded" />
              <div className="h-3 w-14 bg-border-main/60 rounded" />
            </div>
            <div className="flex gap-2 flex-1 overflow-hidden">
              <div className="h-12 w-[76px] bg-border-main rounded-2xl shrink-0" />
              <div className="h-12 w-[76px] bg-border-main rounded-2xl shrink-0" />
              <div className="h-12 w-[76px] bg-border-main/60 rounded-2xl shrink-0" />
            </div>
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

  // T1: Aksiyon Gerekiyor Banner'ı için event'leri topla
  const actionRequiredEvents = categoryGroups.flatMap(g => {
    if (g.subGroups && g.subGroups.length > 0) {
      return g.subGroups.flatMap(sg => 
        sg.taskRows.flatMap(tr => 
          tr.events.filter(e => e.computedStatus === 'today' || e.computedStatus === 'missed')
        )
      );
    }
    return g.taskRows.flatMap(tr => 
      tr.events.filter(e => e.computedStatus === 'today' || e.computedStatus === 'missed')
    );
  }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const displayActionEvents = actionRequiredEvents.slice(0, 3);
  const hiddenActionCount = actionRequiredEvents.length - displayActionEvents.length;

  return (
    <div className="py-2 bg-white">
      {actionRequiredEvents.length > 0 && (
        <div className="mx-4 mb-6 bg-error/5 border border-error/20 rounded-2xl p-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-error" />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-error animate-pulse">🔴</span>
            <h3 className="text-[14px] font-extrabold text-error">Aksiyon Gerekiyor</h3>
          </div>
          <div className="flex flex-col gap-2">
            {displayActionEvents.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-white rounded-xl p-2.5 shadow-sm border border-border-main/50">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-text-primary line-clamp-1">{e.pet_care_tasks?.title || 'Görev'}</span>
                  <span className={`text-[11px] font-medium ${e.computedStatus === 'missed' ? 'text-error' : 'text-[#b47120]'}`}>
                    {e.computedStatus === 'missed' ? 'Kaçırıldı' : 'Bugün'}
                  </span>
                </div>
                <button 
                  onClick={() => markEventStatus(e.id, 'done')}
                  className="bg-success text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-success/90 active:scale-95 transition-transform"
                >
                  Tamamla
                </button>
              </div>
            ))}
            {hiddenActionCount > 0 && (
              <p className="text-[11px] text-text-secondary text-center mt-1 font-medium">
                +{hiddenActionCount} görev daha bekliyor
              </p>
            )}
          </div>
        </div>
      )}

      {categoryGroups.map((group) => (
        <div key={group.category} className="mb-6">
          {/* Kategori Başlığı */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border-main/50 mb-3 relative">
            {/* T4: Kategori başlıkları daha belirgin */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-r-sm" />
            <div className="flex items-center gap-2.5 pl-1">
              <span className="text-[18px] opacity-90">{group.icon}</span>
              <h3 className="text-[13px] font-extrabold text-text-primary uppercase tracking-wider">{group.label}</h3>
            </div>
            <button className="text-text-secondary hover:text-text-primary transition-colors p-1 bg-bg-main rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="13" cy="8" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Aşı kategorisi: alt gruplar (Zorunlu / Opsiyonel) + aşı isimleri */}
          {group.subGroups && group.subGroups.length > 0 ? (
            <div className="flex flex-col">
              {group.subGroups.map((subGroup) => (
                <div key={subGroup.label} className="mb-2">
                  {/* Alt grup başlığı */}
                  <div className="flex items-center gap-2 px-4 py-1.5">
                    <div className="w-1 h-4 rounded-full bg-primary/30" />
                    <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
                      {subGroup.label}
                    </span>
                  </div>
                  {/* Aşı satırları */}
                  <div className="flex flex-col">
                    {subGroup.taskRows.map(taskRow => (
                      <TrackerRow
                        key={`${taskRow.task.id}-${taskRow.task.title}`}
                        taskRow={taskRow}
                        frequencyLabel={formatFrequency(taskRow.task.frequency_days, taskRow.task.frequency_label)}
                        onMarkDone={(id) => markEventStatus(id, 'done')}
                        onPostpone={(id) => postponeEvent(id, 1)}
                        onEdit={onEditTask || (() => {})}
                        onDelete={deleteEvent}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Diğer kategoriler: düz satır listesi */
            <div className="flex flex-col">
              {group.taskRows.map(taskRow => (
                <TrackerRow
                  key={`${taskRow.task.id}-${taskRow.task.title}`}
                  taskRow={taskRow}
                  frequencyLabel={formatFrequency(taskRow.task.frequency_days, taskRow.task.frequency_label)}
                  onMarkDone={(id) => markEventStatus(id, 'done')}
                  onPostpone={(id) => postponeEvent(id, 1)}
                  onEdit={onEditTask || (() => {})}
                  onDelete={deleteEvent}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Renk Lejandı */}
      <div className="flex items-center gap-4 px-4 pt-4 pb-2 mt-2 border-t border-border-main/30 flex-wrap">
        <LegendDot color="bg-[#2ca67a]" label="Yapıldı" />
        <LegendDot color="bg-[#e25353]" label="Kaçırıldı" />
        <LegendDot color="border border-[#93c5fd] bg-[#eff6ff]" label="Yaklaşıyor" />
        <LegendDot color="border border-[#d49944] bg-[#fdf8ed]" label="Bugün" />
        <LegendDot color="border border-[#e5e7eb] bg-[#fcfcfc]" label="Planlandı" />
      </div>
    </div>
  );
}

/** Lejant noktası */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-sm ${color}`} />
      <span className="text-[11px] text-text-secondary font-medium">{label}</span>
    </div>
  );
}
