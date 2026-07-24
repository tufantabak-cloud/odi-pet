export type AgendaLifecycleType =
  | 'plan'
  | 'completed_occurrence'
  | 'medical_record'
  | 'measurement'
  | 'appointment'
  | 'nutrition_log'
  | 'legacy';

export type AgendaDisplayStatus =
  | 'upcoming'
  | 'today'
  | 'overdue'
  | 'completed'
  | 'ongoing'
  | 'expired'
  | 'cancelled';

export type AgendaActionType = 'view' | 'complete' | 'postpone' | 'edit' | 'delete';

export type AgendaTargetSource =
  | 'plan'
  | 'vaccine_record'
  | 'parasite_record'
  | 'medication_legacy'
  | 'growth_record'
  | 'appointment'
  | 'nutrition_log'
  | 'health_schedule';

export interface AgendaActionDescriptor {
  type: AgendaActionType;
  targetSource: AgendaTargetSource;
  targetId: string;
  enabled: boolean;
  disabledReason?: string;
}

export interface AgendaDisplayMetadata {
  title: string;
  note?: string | null;
  vaccineCode?: string | null;
  parasiteType?: string | null;
  dosageString?: string | null;
  frequencyLabel?: string;
  frequencyDays?: number;
  extraData?: Record<string, any>;
}

export interface PetAgendaEvent {
  eventId: string;
  source: 'plans' | 'vaccine_records_v2' | 'parasite_records' | 'health_medications' | 'growth_records' | 'nutrition_logs' | 'appointments' | 'health_schedules';
  sourceRecordId: string;
  category: string;
  subCategory: string;
  stableIdentity: string;
  occurrenceIdentity: string | null;
  fallbackIdentity: string | null;
  mainPlanId: string | null;
  parentPlanId: string | null;
  scheduledAt: string | null;            // TIMESTAMPTZ ISO string
  occurrenceScheduledAt: string | null;  // TIMESTAMPTZ ISO string
  actualAt: string | null;               // TIMESTAMPTZ ISO string
  nextDueAt: string | null;              // TIMESTAMPTZ ISO string
  dateKey: string;                       // YYYY-MM-DD in Europe/Istanbul
  sourceStatus: string;                  // Raw DB status
  lifecycleType: AgendaLifecycleType;
  displayStatus: AgendaDisplayStatus;
  status: AgendaDisplayStatus;           // Deprecated compatibility alias for displayStatus
  repeatRule: string | null;
  isVirtual: boolean;
  isActionable: boolean;
  displayMetadata: AgendaDisplayMetadata;
  actionDescriptors: AgendaActionDescriptor[];
}

export type AgendaMatchResult =
  | { status: 'none' }
  | { status: 'exact'; eventId: string; reason: string }
  | { status: 'multiple'; eventIds: string[]; reason: string };

export interface AgendaIdentity {
  category: string;
  baseIdentity: string;
  occurrenceIdentity: string | null;
  fallbackIdentity: string | null;
}

export interface AgendaNormalizationContext {
  todayStr: string; // YYYY-MM-DD in Europe/Istanbul
  timeZone: string; // 'Europe/Istanbul'
  linkedPlanIds: Set<string>;
}

export interface AgendaDateRange {
  rangeStartStr: string; // YYYY-MM-DD
  rangeEndStr: string;   // YYYY-MM-DD
}

export interface AgendaReadHandler<TPlan = any, TRecord = any> {
  category: string;

  normalizePlan(
    plan: TPlan,
    context: AgendaNormalizationContext
  ): PetAgendaEvent;

  normalizeActualRecord(
    record: TRecord,
    context: AgendaNormalizationContext
  ): PetAgendaEvent;

  projectOccurrences(
    mainPlan: TPlan,
    range: AgendaDateRange,
    context: AgendaNormalizationContext
  ): PetAgendaEvent[];

  getIdentity(
    input: TPlan | TRecord,
    context: AgendaNormalizationContext
  ): AgendaIdentity;

  getFallbackMatchCandidates(
    record: TRecord,
    events: PetAgendaEvent[],
    context: AgendaNormalizationContext
  ): AgendaMatchResult;

  getAllowedActions(event: PetAgendaEvent): AgendaActionType[];
  getActionDescriptors(event: PetAgendaEvent): AgendaActionDescriptor[];
  getDisplayMetadata(event: PetAgendaEvent): AgendaDisplayMetadata;
}

/** Safely normalizes DATE-only fields (YYYY-MM-DD) to Europe/Istanbul dateKey without UTC drift */
export function deriveDateKey(dateInput: string | null | undefined, timeZone = 'Europe/Istanbul'): string {
  if (!dateInput) return '';
  const trimmed = dateInput.trim();
  // If YYYY-MM-DD pattern
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed.split('T')[0] || '';
    return d.toLocaleDateString('en-CA', { timeZone });
  } catch {
    return trimmed.split('T')[0] || '';
  }
}
