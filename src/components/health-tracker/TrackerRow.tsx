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

  return (
    <div className="flex items-center gap-0 py-2.5 border-b border-border-main/30 last:border-0">
      {/* Sol Kolon: Görev adı + frekans */}
      <div className="shrink-0 w-[130px] min-w-[130px] pl-4 pr-2">
        <p className="text-[13px] font-bold text-text-primary leading-tight truncate">
          {taskRow.task.title}
        </p>
        <p className="text-[11px] text-text-secondary mt-0.5 truncate">
          {frequencyLabel}
        </p>
      </div>

      {/* Sağ Kolon: Yatay kaydırılabilir chip timeline */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex items-center gap-2 overflow-x-auto pr-4 scrollbar-none select-none flex-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        {pastEvents.map(event => (
          <div key={event.id} className="shrink-0">
            <ChipItem
              event={event}
              onMarkDone={onMarkDone}
              onPostpone={onPostpone}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}

        <TodayMarker />

        {todayAndFuture.map(event => (
          <div key={event.id} className="shrink-0">
            <ChipItem
              event={event}
              onMarkDone={onMarkDone}
              onPostpone={onPostpone}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
