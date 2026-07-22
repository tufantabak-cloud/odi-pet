import { FlowEvent, TaskRow } from '../types';
import { getEventSortDate } from './normalize-events';
import { toDateKey } from './recurring-events';

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

/** 'YYYY-MM-DD' tarih anahtarına gün ekler/çıkarır, sonucu yine 'YYYY-MM-DD' döner */
function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

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
      const startDateKey: string = (curr as any).due_date || '';
      let endMs: number | null = null;
      let endDateKey: string | null = null;
      if (next) {
        endMs = getEventSortDate(next);
        endDateKey = (next as any).due_date || null;
      } else {
        const freqDays = curr.pet_care_tasks?.frequency_days || 0;
        if (freqDays > 0) {
          endMs = startMs + freqDays * 24 * 60 * 60 * 1000;
          endDateKey = startDateKey ? addDaysToDateKey(startDateKey, freqDays) : null;
        }
      }
      if (endMs === null || !startDateKey || !endDateKey) continue; // koruma süresi bilinmiyor — çubuk gösterilmez

      const dayMs = 24 * 60 * 60 * 1000;
      const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / dayMs));
      const totalMs = Math.max(endMs - startMs, dayMs);
      const percent = Math.max(0, Math.min(100, Math.round(((endMs - nowMs) / totalMs) * 100)));

      if (nowMs >= endMs) curr.coverage = { status: 'expired', daysRemaining: 0, percent: 0, startDateKey, endDateKey };
      else if (endMs - nowMs <= warnMs) curr.coverage = { status: 'expiring', daysRemaining, percent, startDateKey, endDateKey };
      else curr.coverage = { status: 'protected', daysRemaining, percent, startDateKey, endDateKey };
    }
  });
}

export interface CoverageInterval {
  startDateKey: string;
  endDateKey: string;
  /**
   * Bu koruma penceresini üreten gerçek kayıt (uygulama günü). Aralık
   * içindeki boş günlere tıklanınca YENİ kayıt açmak yerine bu kaydın
   * kendisi düzenlemeye açılmalı — koruma "bir kayda ait" olduğu için.
   */
  sourceEvent: FlowEvent;
}

/**
 * computeCoverage tarafından işaretlenmiş event'lerden, timeline grid'inde
 * "koruma sürüyor" olarak boyanacak tarih aralıklarını çıkarır. Uygulama
 * gününün kendisi zaten kendi kartıyla gösteriliyor; bu aralıklar yalnızca
 * arasındaki (kayıtsız) günleri boyamak için kullanılır.
 */
export function buildCoverageIntervals(events: FlowEvent[]): CoverageInterval[] {
  return events
    .filter((e): e is FlowEvent & { coverage: NonNullable<FlowEvent['coverage']> } => !!e.coverage)
    .map(e => ({ startDateKey: e.coverage.startDateKey, endDateKey: e.coverage.endDateKey, sourceEvent: e }));
}

/**
 * Son geçerlilik tarihini hesaplar ve dd.mm.yy formatında döndürür.
 */
export function computeExpiryDateLabel(rowEvents: FlowEvent[], frequencyDays: number = 0): string | null {
  if (!rowEvents || rowEvents.length === 0) return null;
  const lastDoneWithCoverage = [...rowEvents]
    .reverse()
    .find(e => (e.status === 'done' || e.computedStatus === 'done') && e.coverage?.endDateKey);
  if (lastDoneWithCoverage?.coverage?.endDateKey) {
    const [y, m, d] = lastDoneWithCoverage.coverage.endDateKey.split('-');
    return `${d}.${m}.${y.slice(2)}`;
  }

  // Fallback for recurring events with due_date and frequencyDays > 0
  const eventWithDate = [...rowEvents].reverse().find(e => (e as any).due_date);
  if (eventWithDate && frequencyDays > 0) {
    const dueDateStr = (eventWithDate as any).due_date;
    if (typeof dueDateStr === 'string' && dueDateStr.includes('-')) {
      const parts = dueDateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}.${m}.${y.slice(2)}`;
      }
    }
  }

  return null;
}
