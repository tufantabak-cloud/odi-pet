'use client';
import React, { useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
import { TaskRow as TaskRowType } from './types';
import { ChipItem } from './ChipItem';
import { TodayMarker } from './TodayMarker';

interface TrackerRowProps {
  taskRow: TaskRowType;
  frequencyLabel: string;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
}

export function TrackerRow({ taskRow, frequencyLabel, onMarkDone, onPostpone, onEdit, onDelete }: TrackerRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftVal, setScrollLeftVal] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftVal(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeftVal - walk;
  };

  if (taskRow.events.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastEvents = taskRow.events.filter(e => {
    const d = new Date(e.scheduled_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });
  const todayAndFuture = taskRow.events.filter(e => {
    const d = new Date(e.scheduled_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  });

  const displayFreq = frequencyLabel === taskRow.task.title ? null : frequencyLabel;

  const displayPastEvents = isExpanded ? pastEvents : pastEvents.slice(-1); // son 1 geçmiş veya hepsi
  const hiddenPastCount = isExpanded ? 0 : pastEvents.length - displayPastEvents.length;

  const displayFutureEvents = isExpanded ? todayAndFuture : todayAndFuture.slice(0, 3); // ilk 3 gelecek (bugün dahil) veya hepsi
  const hiddenFutureCount = isExpanded ? 0 : todayAndFuture.length - displayFutureEvents.length;

  return (
    <div className="flex items-center py-3 border-b border-border-main/50 last:border-0 relative">
      {/* Sol Kolon: Görev adı + frekans (alt alta, daha iyi sığması için) */}
      <div className="shrink-0 w-[120px] flex flex-col justify-center pl-4 pr-2">
        <p className="text-[13px] font-bold text-text-primary leading-tight truncate">
          {taskRow.task.title}
        </p>
        {displayFreq && (
          <p className="text-[11px] text-text-secondary mt-0.5 truncate">
            {displayFreq}
          </p>
        )}
      </div>

      {/* Sağ Kolon: Timeline */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex items-center overflow-x-auto pr-4 scrollbar-none select-none flex-1 relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        {/* Geçmiş Etkinlikler Bölümü: Sağa yaslı ve sabit minimum genişlikte. */}
        <div className="flex items-center justify-end min-w-[120px] shrink-0">
          {hiddenPastCount > 0 ? (
            <div className="shrink-0 px-2 flex items-center justify-center cursor-pointer hover:bg-bg-main rounded-xl transition-colors py-1 mr-1" onClick={() => setIsExpanded(true)}>
              <span className="text-[10px] font-bold text-text-secondary/60">+{hiddenPastCount}</span>
            </div>
          ) : isExpanded && pastEvents.length > 1 ? (
            <div className="shrink-0 px-2 flex items-center justify-center cursor-pointer hover:bg-bg-main rounded-xl transition-colors py-1 mr-1" onClick={() => setIsExpanded(false)}>
              <span className="text-[10px] font-bold text-text-secondary/60">Daralt</span>
            </div>
          ) : null}

          {displayPastEvents.map((event, i) => (
            <React.Fragment key={event.id}>
              {i > 0 && <div className="w-3 h-px bg-border-main shrink-0" />}
              <div className="shrink-0">
                <ChipItem
                  event={event}
                  onMarkDone={onMarkDone}
                  onPostpone={onPostpone}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Geçmiş -> Bugün Bağlantısı */}
        <div className="w-3 h-px bg-border-main shrink-0" />

        {/* Bugün Çizgisi (Dikey Kahverengi Bar) */}
        <TodayMarker />

        {/* Bugün -> Gelecek Bağlantısı */}
        <div className="w-3 h-px bg-border-main shrink-0" />

        {/* Gelecek Etkinlikler Bölümü: Sola yaslı. */}
        <div className="flex items-center justify-start min-w-[280px] shrink-0">
          {displayFutureEvents.map((event, i) => (
            <React.Fragment key={event.id}>
              {i > 0 && <div className="w-3 h-px bg-border-main shrink-0" />}
              <div className="shrink-0">
                <ChipItem
                  event={event}
                  onMarkDone={onMarkDone}
                  onPostpone={onPostpone}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </React.Fragment>
          ))}

          {hiddenFutureCount > 0 ? (
            <div className="shrink-0 px-2 flex items-center justify-center cursor-pointer hover:bg-bg-main rounded-xl transition-colors py-1 ml-1" onClick={() => setIsExpanded(true)}>
              <span className="text-[10px] font-bold text-text-secondary/60">+{hiddenFutureCount}</span>
            </div>
          ) : isExpanded && todayAndFuture.length > 3 ? (
            <div className="shrink-0 px-2 flex items-center justify-center cursor-pointer hover:bg-bg-main rounded-xl transition-colors py-1 ml-1" onClick={() => setIsExpanded(false)}>
              <span className="text-[10px] font-bold text-text-secondary/60">Daralt</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
