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

  return (
    <div className="py-2 bg-white">
      {categoryGroups.map((group) => (
        <div key={group.category} className="mb-6">
          {/* Kategori Başlığı */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f6f5f2] rounded-xl mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[15px] opacity-70 grayscale">{group.icon}</span>
              <h3 className="text-[14px] font-bold text-text-primary">{group.label}</h3>
            </div>
            <button className="text-text-secondary hover:text-text-primary transition-colors p-1">
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
