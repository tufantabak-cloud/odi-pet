import { FlowEvent, TaskRow } from '../types';
import { getEventSortDate } from './normalize-events';

/**
 * Bir kategorinin tüm taskRows'unu düz, kronolojik bir akışa çevirir.
 * Kartın grid'deki konumunu içerik sırası değil, event tarihi belirler.
 */
export function buildFlowEvents(taskRows: TaskRow[]): FlowEvent[] {
  const flat: FlowEvent[] = [];
  taskRows.forEach(row => {
    row.events.forEach(event => {
      flat.push({ ...event, taskKey: row.task.title, taskTitle: row.task.title });
    });
  });
  flat.sort((a, b) => getEventSortDate(a) - getEventSortDate(b));
  return flat;
}

const COVERAGE_WARN_DAYS = 7;

/**
 * Sadece Aşı/Parazit gibi "koruma süresi" olan kategoriler için: her taskKey
 * grubu içinde ardışık iki event'i eşleştirir. Önceki event 'done' ise,
 * koruma penceresinin (bir sonraki dozun tarihine, yoksa frequency_days'e
 * göre) hâlâ geçerli olup olmadığını hesaplar ve event.coverage'a yazar.
 */
export function computeCoverage(flowEvents: FlowEvent[]): void {
  const byTaskKey = new Map<string, FlowEvent[]>();
  flowEvents.forEach(e => {
    if (!byTaskKey.has(e.taskKey)) byTaskKey.set(e.taskKey, []);
    byTaskKey.get(e.taskKey)!.push(e);
  });

  const nowMs = Date.now();
  const warnMs = COVERAGE_WARN_DAYS * 24 * 60 * 60 * 1000;

  byTaskKey.forEach(taskEvents => {
    for (let i = 0; i < taskEvents.length; i++) {
      const curr = taskEvents[i];
      if (curr.computedStatus !== 'done') continue;

      const next = taskEvents[i + 1];
      const startMs = getEventSortDate(curr);
      let endMs: number | null = null;
      if (next) {
        endMs = getEventSortDate(next);
      } else {
        const freqDays = curr.pet_care_tasks?.frequency_days || 0;
        if (freqDays > 0) endMs = startMs + freqDays * 24 * 60 * 60 * 1000;
      }
      if (endMs === null) continue; // koruma süresi bilinmiyor — çubuk gösterilmez

      const dayMs = 24 * 60 * 60 * 1000;
      const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / dayMs));
      const totalMs = Math.max(endMs - startMs, dayMs);
      const percent = Math.max(0, Math.min(100, Math.round(((endMs - nowMs) / totalMs) * 100)));

      if (nowMs >= endMs) curr.coverage = { status: 'expired', daysRemaining: 0, percent: 0 };
      else if (endMs - nowMs <= warnMs) curr.coverage = { status: 'expiring', daysRemaining, percent };
      else curr.coverage = { status: 'protected', daysRemaining, percent };
    }
  });
}
