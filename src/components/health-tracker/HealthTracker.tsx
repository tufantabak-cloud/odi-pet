import React, { useMemo } from 'react';
import { useHealthTracker } from './useHealthTracker';
import { TrackerRow } from './TrackerRow';
import { TrackerGroup } from './types';

interface HealthTrackerProps {
  petId: string;
  onEditTask?: (event: any) => void;
}

export function HealthTracker({ petId, onEditTask }: HealthTrackerProps) {
  const { events, loading, markEventStatus, postponeEvent, deleteEvent } = useHealthTracker(petId);

  const groups = useMemo(() => {
    const categories: Record<string, TrackerGroup> = {
      health: { category: 'health', label: 'Sağlık & Aşı', events: [] },
      medication: { category: 'medication', label: 'İlaç & Takviye', events: [] },
      care: { category: 'care', label: 'Bakım', events: [] },
    };

    events.forEach(event => {
      const cat = event.pet_care_tasks?.category || 'care';
      if (!categories[cat]) {
        categories[cat] = { category: cat, label: cat, events: [] };
      }
      categories[cat].events.push(event);
    });

    return Object.values(categories).filter(g => g.events.length > 0);
  }, [events]);

  if (loading) {
    return (
      <div className="py-6 px-4 animate-pulse">
        <div className="h-6 w-32 bg-border-main rounded mb-4"></div>
        <div className="flex gap-3 overflow-hidden">
          <div className="h-10 w-32 bg-border-main rounded-2xl"></div>
          <div className="h-10 w-32 bg-border-main rounded-2xl"></div>
          <div className="h-10 w-32 bg-border-main rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-8 px-4 text-center text-text-secondary bg-bg-main rounded-2xl m-4 border border-dashed border-border-main">
        <p className="text-[14px] font-semibold">Henüz planlanmış bir etkinlik yok.</p>
      </div>
    );
  }

  return (
    <div className="py-4 bg-white rounded-3xl border border-border-main shadow-sm">
      <div className="px-5 mb-5 flex justify-between items-center">
        <h2 className="text-[16px] font-black text-text-primary">Yaklaşan Etkinlikler</h2>
      </div>
      
      <div className="flex flex-col gap-2">
        {groups.map(group => (
          <TrackerRow 
            key={group.category} 
            group={group} 
            onMarkDone={(id) => markEventStatus(id, 'done')}
            onPostpone={(id) => postponeEvent(id, 1)}
            onEdit={onEditTask || (() => {})}
            onDelete={deleteEvent}
          />
        ))}
      </div>
    </div>
  );
}
