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

  // Geçmiş ve gelecek event'leri ayır (today marker pozisyonunu belirlemek için)
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
        className={`flex items-center overflow-x-auto pr-4 scrollbar-none select-none flex-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        {pastEvents.map((event, i) => (
          <React.Fragment key={event.id}>
            {i > 0 && <div className="w-4 h-px bg-border-main shrink-0" />}
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

        {pastEvents.length > 0 && <div className="w-4 h-px bg-border-main shrink-0" />}
        <TodayMarker />
        {todayAndFuture.length > 0 && <div className="w-4 h-px bg-border-main shrink-0" />}

        {todayAndFuture.map((event, i) => (
          <React.Fragment key={event.id}>
            {i > 0 && <div className="w-4 h-px bg-border-main shrink-0" />}
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
    </div>
  );
}
