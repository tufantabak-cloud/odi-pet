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
    <div className="py-3 bg-white rounded-3xl border border-border-main shadow-sm">
      {categoryGroups.map((group, gi) => (
        <div key={group.category} className={gi > 0 ? 'mt-2' : ''}>
          {/* Kategori Başlığı */}
          <div className="flex items-center justify-between px-5 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{group.icon}</span>
              <h3 className="text-[14px] font-black text-text-primary">{group.label}</h3>
            </div>
            <button className="text-text-secondary hover:text-text-primary transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="13" cy="8" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Görev Satırları */}
          <div className="flex flex-col">
            {group.taskRows.map(taskRow => (
              <TrackerRow
                key={taskRow.task.id}
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

      {/* Renk Lejandı */}
      <div className="flex items-center gap-4 px-5 pt-3 pb-2 mt-2 border-t border-border-main/30 flex-wrap">
        <LegendDot color="bg-emerald-500" label="Yapıldı" />
        <LegendDot color="bg-red-400" label="Kaçırıldı" />
        <LegendDot color="border border-teal-400 bg-white" label="Yaklaşıyor" />
        <LegendDot color="border-2 border-blue-500 bg-white" label="Bugün" />
        <LegendDot color="bg-gray-200" label="Planlandı" />
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
