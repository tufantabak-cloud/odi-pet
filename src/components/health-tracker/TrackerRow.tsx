'use client';
import React, { useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
import { TaskRow as TaskRowType } from './types';
import { ChipItem } from './ChipItem';
import { TodayMarker } from './TodayMarker';

interface TrackerRowProps {
  taskRow: TaskRowType;
  dateRange: Date[];
  formatDateKey: (date: Date) => string;
  frequencyLabel: string;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
}

export function TrackerRow({ 
  taskRow, 
  dateRange, 
  formatDateKey, 
  frequencyLabel, 
  onMarkDone, 
  onPostpone, 
  onEdit, 
  onDelete 
}: TrackerRowProps) {
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

  const displayFreq = frequencyLabel === taskRow.task.title ? null : frequencyLabel;

  return (
    <div className="flex items-center py-3 border-b border-border-main/50 last:border-0 relative">
      {/* Sol Kolon: Görev adı + frekans */}
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
        className={`timeline-scroll-container flex items-center overflow-x-auto pr-4 scrollbar-none select-none flex-1 relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
      >
        {/* Yatay Arka Plan Çizgisi (Tüm hücreleri bağlar) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-border-main/30 -z-10" />

        {/* 46 adet Tarih Kolonu */}
        <div className="flex items-center gap-2 relative">
          {dateRange.map((date) => {
            const dateKey = formatDateKey(date);
            // Tarihe denk gelen etkinlikleri bul — çoklu format desteği ile
            const matchedEvent = taskRow.events.find(e => {
              // 1) due_date ile doğrudan eşleştir (normalize)
              if (e.due_date) {
                const normalized = e.due_date.includes('T') ? e.due_date.split('T')[0] : e.due_date;
                if (normalized === dateKey) return true;
              }
              // 2) scheduled_at üzerinden fallback
              if (e.scheduled_at) {
                try {
                  const d = new Date(e.scheduled_at);
                  const eventDateKey = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
                  if (eventDateKey === dateKey) return true;
                } catch { /* skip */ }
              }
              return false;
            });

            return (
              <div 
                key={dateKey} 
                className="shrink-0 w-[136px] h-[48px] flex items-center justify-center"
              >
                {matchedEvent ? (
                  <div className="bg-white px-2 py-0.5 rounded-2xl">
                    <ChipItem
                      event={matchedEvent}
                      onMarkDone={onMarkDone}
                      onPostpone={onPostpone}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                ) : (
                  // Boş hücre: Arkadaki çizgi görünecek
                  <div className="w-full h-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
