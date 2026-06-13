import React, { useRef, useState, MouseEvent } from 'react';
import { TrackerGroup } from './types';
import { ChipItem } from './ChipItem';
import { TodayMarker } from './TodayMarker';

interface TrackerRowProps {
  group: TrackerGroup;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
}

export function TrackerRow({ group, onMarkDone, onPostpone, onEdit, onDelete }: TrackerRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (group.events.length === 0) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  // Split events to insert TodayMarker
  // Any event before today (or already done) goes left.
  const pastEvents = group.events.filter(e => {
    const d = new Date(e.scheduled_at);
    d.setHours(0,0,0,0);
    return d.getTime() < today.getTime();
  });
  
  const futureEvents = group.events.filter(e => {
    const d = new Date(e.scheduled_at);
    d.setHours(0,0,0,0);
    return d.getTime() >= today.getTime();
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h3 className="text-[14px] font-black text-text-primary capitalize">{group.label}</h3>
        <span className="text-[12px] font-bold text-text-secondary bg-bg-main px-2.5 py-1 rounded-full">
          {group.events.length} Kayıt
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex items-center gap-3 overflow-x-auto pb-4 px-4 scrollbar-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        {pastEvents.map((event) => (
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

        {futureEvents.map((event) => (
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
