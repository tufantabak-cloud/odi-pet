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
        <div className="mx-4 mb-6">
          {/* Gecikmiş Görevler */}
          {actionRequiredEvents.some(e => e.computedStatus === 'missed') && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-[#ff7675]" />
                <h3 className="text-[12px] font-extrabold text-[#ff7675] uppercase tracking-wider">Gecikmiş Görevler</h3>
              </div>
              <div className="flex flex-col gap-2">
                {actionRequiredEvents.filter(e => e.computedStatus === 'missed').map(e => (
                  <ActionBannerItem 
                    key={e.id} 
                    event={e} 
                    onMarkDone={markEventStatus}
                    onPostpone={postponeEvent}
                    onEdit={onEditTask}
                    onDelete={deleteEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bugün */}
          {actionRequiredEvents.some(e => e.computedStatus === 'today') && (
            <div>
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-[#6c5ce7]" />
                <h3 className="text-[12px] font-extrabold text-[#6c5ce7] uppercase tracking-wider">Bugün</h3>
              </div>
              <div className="flex flex-col gap-2">
                {actionRequiredEvents.filter(e => e.computedStatus === 'today').map(e => (
                  <ActionBannerItem 
                    key={e.id} 
                    event={e} 
                    onMarkDone={markEventStatus}
                    onPostpone={postponeEvent}
                    onEdit={onEditTask}
                    onDelete={deleteEvent}
                  />
                ))}
              </div>
            </div>
          )}
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

/** Yeni temiz Action Banner Satırı */
function ActionBannerItem({ 
  event, 
  onMarkDone, 
  onPostpone, 
  onEdit, 
  onDelete 
}: { 
  event: any; 
  onMarkDone: (id: string, status: string) => void;
  onPostpone: (id: string, days: number) => void;
  onEdit?: (event: any) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  
  const isMissed = event.computedStatus === 'missed';
  
  // Dışarı tıklama
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const d = new Date(event.scheduled_at);
  const day = d.getDate();
  const month = d.toLocaleDateString('tr-TR', { month: 'long' });
  const year = d.getFullYear();
  const dateStr = `${day} ${month} ${year}`;
  
  let diffStr = '';
  if (isMissed) {
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const schDate = new Date(d);
    schDate.setHours(0,0,0,0);
    const diffDays = Math.round((todayDate.getTime() - schDate.getTime()) / (1000 * 60 * 60 * 24));
    diffStr = `» ${diffDays} gün gecikti`;
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
      isMissed ? 'bg-[#fff5f5] border-[#ffe3e3]' : 'bg-white border-border-main/50'
    }`}>
      
      {/* Sol: Yuvarlak ve Metinler */}
      <div className="flex items-center gap-3">
        {/* Checkbox Yuvarlağı */}
        <button 
          onClick={() => onMarkDone(event.id, 'done')}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            isMissed ? 'border-[#ff7675]/50 hover:bg-[#ff7675]/10' : 'border-[#6c5ce7]/30 hover:bg-[#6c5ce7]/10'
          }`}
        />
        
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-text-primary">
            {event.pet_care_tasks?.title || 'Görev'}
          </span>
          <div className={`flex items-center gap-1 text-[11px] font-bold mt-0.5 ${isMissed ? 'text-[#ff7675]' : 'text-text-secondary'}`}>
            <span className="opacity-70">🕒</span>
            <span>{dateStr}</span>
            {isMissed && <span className="ml-1 text-[#ff7675]">{diffStr}</span>}
          </div>
        </div>
      </div>

      {/* Sağ: Butonlar */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPostpone(event.id, 1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[12px] shadow-sm transition-transform active:scale-95 ${
            isMissed ? 'bg-white text-[#ff7675]' : 'bg-surface text-[#6c5ce7]'
          }`}
        >
          <span className="text-[14px]">📅</span> +1 Gün
        </button>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[16px] transition-colors ${
              isMissed ? 'bg-white text-[#ff7675]' : 'bg-surface text-text-secondary'
            }`}
          >
            ⋮
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-10 w-32 bg-white border border-border-main/50 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <button 
                onClick={() => { setMenuOpen(false); onEdit?.(event); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-main transition-colors text-[13px] font-bold text-[#6c5ce7]"
              >
                <span>✏️</span> Düzenle
              </button>
              <button 
                onClick={() => { setMenuOpen(false); onDelete(event.id); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[#fff5f5] transition-colors text-[13px] font-bold text-[#ff7675]"
              >
                <span>❌</span> Sil
              </button>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
