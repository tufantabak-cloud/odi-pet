import { PetAgendaEvent } from './types';

export interface SummarySelection {
  todayCompleted: PetAgendaEvent[];
  todayPlanned: PetAgendaEvent[];
  overdue: PetAgendaEvent[];
  nextUpcoming: PetAgendaEvent[];
}

export function selectSummaryEvents(events: PetAgendaEvent[], todayStr: string): SummarySelection {
  const todayCompleted: PetAgendaEvent[] = [];
  const todayPlanned: PetAgendaEvent[] = [];
  const overdue: PetAgendaEvent[] = [];
  const upcomingCandidates: PetAgendaEvent[] = [];

  events.forEach(event => {
    // Exclude cancelled events
    if (event.displayStatus === 'cancelled' || event.sourceStatus === 'cancelled') return;

    if (event.dateKey === todayStr) {
      if (event.displayStatus === 'completed') {
        todayCompleted.push(event);
      } else {
        todayPlanned.push(event);
      }
    } else if (event.dateKey < todayStr && event.displayStatus === 'overdue' && event.isActionable) {
      overdue.push(event);
    } else if (event.dateKey > todayStr && (event.displayStatus === 'upcoming' || event.displayStatus === 'today')) {
      upcomingCandidates.push(event);
    }
  });

  // Pick en yakın sıradaki 1 anlamlı olay (grouped by category/subCategory)
  const seenSub = new Set<string>();
  const nextUpcoming: PetAgendaEvent[] = [];

  upcomingCandidates
    .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
    .forEach(evt => {
      if (!seenSub.has(evt.stableIdentity)) {
        seenSub.add(evt.stableIdentity);
        nextUpcoming.push(evt);
      }
    });

  return {
    todayCompleted,
    todayPlanned,
    overdue,
    nextUpcoming
  };
}

export function selectTimelineEvents(events: PetAgendaEvent[], rangeStartStr: string, rangeEndStr: string): PetAgendaEvent[] {
  return events.filter(e => {
    if (e.displayStatus === 'cancelled' || e.sourceStatus === 'cancelled') return false;
    return e.dateKey >= rangeStartStr && e.dateKey <= rangeEndStr;
  }).sort((a, b) => new Date(a.scheduledAt || a.dateKey).getTime() - new Date(b.scheduledAt || b.dateKey).getTime());
}
