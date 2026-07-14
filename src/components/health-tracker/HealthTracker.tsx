'use client';
import React, { useState } from 'react';
import { useHealthTracker } from './useHealthTracker';
import { TrackerRow } from './TrackerRow';

interface HealthTrackerProps {
  petId: string;
  onEditTask?: (task: any) => void;
  refreshTrigger?: number;
}

export function HealthTracker({ petId, onEditTask, refreshTrigger }: HealthTrackerProps) {
  const { categoryGroups, loading, markEventStatus, postponeEvent, deleteEvent, formatFrequency } = useHealthTracker(petId, refreshTrigger);
  const [onlyShowMissed, setOnlyShowMissed] = useState(false);

  // Generate date range: past 15 days to future 30 days
  const dateRange = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = -15; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const formatDateKey = (date: Date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  };

  const todayStr = formatDateKey(new Date());

  // Center "Today" scroll columns on mount with robust retry
  React.useEffect(() => {
    let attempts = 0;
    const centerToday = () => {
      const scrollContainers = document.querySelectorAll('.timeline-scroll-container');
      const todayCell = document.querySelector('[data-is-today="true"]');
      
      if (todayCell && scrollContainers.length > 0) {
        const cellLeft = (todayCell as HTMLElement).offsetLeft;
        const cellWidth = (todayCell as HTMLElement).offsetWidth;
        
        // If layout hasn't fully settled (offsetLeft is abnormally 0), retry
        if (cellLeft === 0 && attempts < 15) {
          attempts++;
          setTimeout(centerToday, 80);
          return;
        }

        scrollContainers.forEach(container => {
          const containerWidth = container.clientWidth;
          if (containerWidth > 0) {
            const scrollTarget = cellLeft - (containerWidth / 2) + (cellWidth / 2);
            container.scrollLeft = scrollTarget;
          }
        });
      } else if (attempts < 15) {
        attempts++;
        setTimeout(centerToday, 80);
      }
    };

    if (!loading) {
      // Small initial delay to let React finish rendering the elements
      setTimeout(centerToday, 100);
    }
  }, [loading, categoryGroups]);

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

  // Filter categoryGroups based on missed/overdue state if filter is active
  const filteredGroups = categoryGroups.map(group => {
    if (!onlyShowMissed) return group;

    const filteredRows = group.taskRows.map(row => {
      const missedEvents = row.events.filter(e => e.computedStatus === 'missed');
      return {
        ...row,
        events: missedEvents
      };
    }).filter(row => row.events.length > 0);

    const filteredSubGroups = group.subGroups ? group.subGroups.map(sub => {
      const subRows = sub.taskRows.map(row => {
        const missedEvents = row.events.filter(e => e.computedStatus === 'missed');
        return { ...row, events: missedEvents };
      }).filter(row => row.events.length > 0);
      return { ...sub, taskRows: subRows };
    }).filter(sub => sub.taskRows.length > 0) : undefined;

    return {
      ...group,
      taskRows: filteredRows,
      subGroups: filteredSubGroups
    };
  }).filter(group => group.taskRows.length > 0 || (group.subGroups && group.subGroups.length > 0));

  return (
    <div className="py-2 bg-white flex flex-col gap-4">
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

      {/* Scrollable Date Header */}
      <div className="flex items-center border-b border-border-main/30 pb-3">
        {/* Placeholder for left title column */}
        <div className="shrink-0 w-[120px] pl-4">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Takvim</span>
        </div>
        
        {/* Scrollable strip */}
        <div className="timeline-scroll-container flex items-center gap-2 overflow-x-auto pr-4 scrollbar-none select-none flex-1">
          {dateRange.map((date) => {
            const dateKey = formatDateKey(date);
            const isToday = dateKey === todayStr;
            const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase();
            const dayNum = date.getDate();
            
            return (
              <div
                key={dateKey}
                data-is-today={isToday ? "true" : "false"}
                className={`flex flex-col items-center justify-center shrink-0 w-[136px] h-[64px] rounded-2xl border transition-all ${
                  isToday
                    ? 'bg-primary border-primary text-white shadow-xs scale-102 font-bold'
                    : 'bg-[#f6f8fb] border-border-main/50 text-text-primary'
                }`}
              >
                <span className={`text-[10px] font-black tracking-wider ${isToday ? 'text-white/80' : 'text-text-secondary/70'}`}>
                  {dayName}
                </span>
                <span className="text-[16px] font-black mt-0.5">
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="py-8 px-4 text-center text-text-secondary bg-[#fdfaf5] rounded-3xl m-4 border border-dashed border-[#e69b24]/40">
          <p className="text-[13px] font-bold">Filtreye uygun gecikmiş görev bulunmuyor.</p>
        </div>
      ) : (
        filteredGroups.map((group) => (
          <div key={group.category} className="mb-4">
            {/* Kategori Başlığı */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#f6f8fb] border-y border-border-main/40 mb-2 relative overflow-hidden">
              <div className="flex items-center gap-2 pl-1">
                <span className="text-[14px] shrink-0">{group.icon}</span>
                <h3 className="text-[11px] font-black text-[#556987] uppercase tracking-wider">{group.label} Takibi</h3>
              </div>
              <button 
                onClick={() => setOnlyShowMissed(!onlyShowMissed)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:bg-border-main/30 transition-colors"
              >
                <span className="text-[16px] leading-none">···</span>
              </button>
            </div>

            {/* Aşı kategorisi: alt gruplar (Zorunlu / Opsiyonel) + aşı isimleri */}
            {group.subGroups && group.subGroups.length > 0 ? (
              <div className="flex flex-col">
                {group.subGroups.map((subGroup) => (
                  <div key={subGroup.label} className="mb-2">
                    {/* Aşı satırları */}
                    <div className="flex flex-col">
                      {subGroup.taskRows.map(taskRow => (
                        <TrackerRow
                          key={`${taskRow.task.id}-${taskRow.task.title}`}
                          taskRow={taskRow}
                          dateRange={dateRange}
                          formatDateKey={formatDateKey}
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
                    dateRange={dateRange}
                    formatDateKey={formatDateKey}
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
        ))
      )}

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
      <div className={`w-3.5 h-3.5 rounded-sm ${color}`} />
      <span className="text-[11px] text-text-secondary font-bold">{label}</span>
    </div>
  );
}
