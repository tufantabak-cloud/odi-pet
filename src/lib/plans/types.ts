/**
 * ODI.PET — CANONICAL PLANNING CORE TYPE DEFINITIONS
 * ===================================================
 * Single Canonical Source of Truth for all Planning Core entities:
 * - Plans (Definitions)
 * - Occurrences (Realized vs. Projected)
 * - Status & Action finite state engines
 * - Source & Policy governance
 * - Reminder policy & notification contracts
 * - Assignment hierarchy (Plan default vs. Occurrence actual)
 */

export type PlanCategory =
  | 'saglik'
  | 'asi'
  | 'parazit'
  | 'bakim'
  | 'beslenme'
  | 'hijyen'
  | 'aktivite'
  | 'kontrol';

/**
 * Raw Database Status in `public.plans` table.
 */
export type PlanStatus =
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'deleted';

/**
 * Origin of the plan definition.
 */
export type PlanSource =
  | 'user'       // Created manually by user/pet-owner
  | 'system'     // Automated core health tracking by Odi.Pet system (e.g. weight tracking)
  | 'protocol'   // Medical vaccination/parasite protocol
  | 'clinical'   // Prescribed or scheduled by veterinary clinic
  | 'ai';        // Suggested by AI assistant and confirmed by user

/**
 * Enforcement policy for the plan definition.
 */
export type PlanPolicy =
  | 'optional'    // Nice-to-have routine, user can freely delete or stop
  | 'recommended' // Health guideline, dismissal shows gentle confirmation
  | 'required';   // Core health requirement (e.g. 30-day weight check), cannot be deleted/cancelled

/**
 * Recurrence unit for repetitive plans.
 */
export type RepeatRule =
  | 'hour'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'none';

export type NotifUnit = 'minute' | 'hour' | 'day';

/**
 * Canonical Display Status across UI (Takvim, Pet Timeline, Dashboard, Plan Cards).
 * Derived dynamically from scheduled_at, completed_at, and current time.
 */
export type CanonicalDisplayStatus =
  | 'upcoming'   // Scheduled in the future (scheduled_at > today)
  | 'due_today'  // Due today (scheduled_at == today, completed_at is null)
  | 'overdue'    // Past target date without realization (scheduled_at < today, completed_at is null)
  | 'completed'  // Successfully realized
  | 'skipped'    // Intentionally skipped for this occurrence
  | 'cancelled'; // Plan or series has been cancelled

/**
 * Canonical Action Commands executed on plans and occurrences.
 */
export type CanonicalActionType =
  | 'COMPLETE_OCCURRENCE'   // Realize specific occurrence (and optionally create domain record)
  | 'RESCHEDULE_OCCURRENCE' // Reschedule single occurrence without drifting the entire recurring series
  | 'RESCHEDULE_SERIES'     // Change the base schedule/anchor of the entire recurring series
  | 'SKIP_OCCURRENCE'       // Skip single occurrence with audit log in plan_occurrences
  | 'CANCEL_SERIES'         // Cancel recurring series (prohibited on policy='required')
  | 'DELETE_PLAN'           // Soft-delete plan definition (prohibited on source='system' / policy='required')
  | 'EDIT_PLAN';            // Modify plan definition metadata

/**
 * Single Canonical Plan Definition Interface (SSOT).
 * Stored physically in `public.plans` table.
 */
export interface Plan {
  id: string;
  pet_id: string;
  user_id: string;
  category: PlanCategory;
  sub_type: string;
  title?: string | null;
  scheduled_at: string;                   // Next due or anchor timestamp (ISO string)
  occurrence_scheduled_at?: string | null;// Deprecated legacy child field
  completed_at?: string | null;           // Set when one-time plan completes
  repeat_rule?: RepeatRule | null;
  ends_at?: string | null;
  notif_before: number;
  notif_unit: NotifUnit;
  note?: string | null;
  extra_data: Record<string, any>;
  status: PlanStatus;
  source?: PlanSource;
  policy?: PlanPolicy;
  assigned_to?: string | null;            // Default assignee for all occurrences in this plan
  is_active?: boolean;                    // Soft-delete indicator (true = active, false = soft-deleted)
  parent_plan_id?: string | null;         // Deprecated legacy field
  created_at: string;
  updated_at: string;
}

/**
 * Physical realization in `public.plan_occurrences` table.
 * Immutable historical record of what actually occurred or was explicitly skipped.
 */
export interface RealizedOccurrence {
  id: string;
  plan_id: string;
  pet_id: string;
  scheduled_at: string;                   // The target timestamp this instance was scheduled for
  completed_at?: string | null;           // Actual execution timestamp (floating schedule anchor)
  original_scheduled_at?: string | null;  // Set if this single occurrence was rescheduled from a prior date
  status: 'completed' | 'skipped' | 'cancelled' | 'open';
  assigned_to?: string | null;            // Actual assignee who executed or is assigned to this specific instance
  notes?: string | null;
  extra_data?: Record<string, any>;
  record_id?: string | null;              // Foreign key to canonical domain SSOT (e.g. weight_logs.id)
  record_table?: string | null;           // Table name of canonical record ('weight_logs', 'vaccine_records_v2')
  created_at: string;
  updated_at: string;
  is_virtual: false;
}

/**
 * In-memory virtual occurrence projected into future dates.
 * NOT stored physically in the database to prevent DB bloat and ghost reminders.
 */
export interface ProjectedOccurrence {
  id: string;                             // Stable virtual ID: `proj_${plan_id}_${dateKey}`
  plan_id: string;
  pet_id: string;
  scheduled_at: string;
  status: 'upcoming' | 'due_today' | 'overdue';
  assigned_to?: string | null;            // Inherited default assignee from Plan.assigned_to
  extra_data?: Record<string, any>;
  is_virtual: true;
}

/**
 * Canonical Occurrence union representing either an immutable past event or a calculated future event.
 */
export type CanonicalPlanOccurrence = RealizedOccurrence | ProjectedOccurrence;

/**
 * Multi-step reminder policy specification.
 * Supports standard progressive alerts (e.g. T-14, T-7, T-2, T0, T+1) without producing duplicate records.
 */
export interface ReminderTrigger {
  offset_value: number;                   // e.g. 14, 7, 2, 0, -1
  offset_unit: 'minute' | 'hour' | 'day';
  direction: 'before' | 'after';          // 'before' scheduled_at, or 'after' overdue
  channel?: 'push' | 'in_app' | 'both';
}

export interface ReminderPolicy {
  policy_id: string;
  plan_id?: string;
  triggers: ReminderTrigger[];
}

export interface NotificationJob {
  id: string;
  plan_id: string;
  fire_at: string;
  sent: boolean;
  created_at: string;
  updated_at: string;
}

/* ==========================================================================
 * CANONICAL DOMAIN GUARDS & UTILITIES (Pure Business Logic)
 * ========================================================================== */

/**
 * Checks if a plan is defined by the system (e.g. 30-day weight check).
 */
export function isSystemPlan(plan: { source?: PlanSource | string | null }): boolean {
  return plan.source === 'system';
}

/**
 * Checks if a plan is required by Odi.Pet health governance.
 */
export function isRequiredPlan(plan: { policy?: PlanPolicy | string | null }): boolean {
  return plan.policy === 'required';
}

/**
 * Guards plan deletion. System plans and required plans CANNOT be deleted.
 */
export function canDeletePlan(plan: { source?: PlanSource | string | null; policy?: PlanPolicy | string | null }): boolean {
  if (isSystemPlan(plan) || isRequiredPlan(plan)) {
    return false;
  }
  return true;
}

/**
 * Guards plan cancellation. Required plans CANNOT be cancelled.
 */
export function canCancelPlan(plan: { policy?: PlanPolicy | string | null }): boolean {
  if (isRequiredPlan(plan)) {
    return false;
  }
  return true;
}

/**
 * Type guard for virtual occurrences.
 */
export function isProjectedOccurrence(occ: CanonicalPlanOccurrence): occ is ProjectedOccurrence {
  return occ.is_virtual === true;
}

/**
 * Type guard for physical realized occurrences.
 */
export function isRealizedOccurrence(occ: CanonicalPlanOccurrence): occ is RealizedOccurrence {
  return occ.is_virtual === false;
}

/**
 * Calculates the next floating due date from actual completion date.
 * Rule: Next due is anchored to when the user ACTUALLY executed the event, not the old overdue date.
 */
export function calculateFloatingNextDue(
  actualCompletionDate: string | Date,
  repeatRule: RepeatRule | string | null | undefined,
  interval: number = 1
): string | null {
  if (!repeatRule || repeatRule === 'none') return null;

  const baseDate = new Date(actualCompletionDate);
  if (isNaN(baseDate.getTime())) return null;

  const next = new Date(baseDate);
  const step = Math.max(1, interval);

  switch (repeatRule) {
    case 'hour':
    case 'hourly':
      next.setHours(next.getHours() + step);
      break;
    case 'daily':
      next.setDate(next.getDate() + step);
      break;
    case 'weekly':
      next.setDate(next.getDate() + step * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + step);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + step);
      break;
    default:
      return null;
  }

  return next.toISOString();
}
