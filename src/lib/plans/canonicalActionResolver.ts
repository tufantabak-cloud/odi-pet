export type CanonicalPlanActionType = 'complete' | 'postpone' | 'edit' | 'delete';

export interface CanonicalPlanActionConfig {
  id: CanonicalPlanActionType;
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export type CompletionMode = 'parasite_protocol' | 'completion_details' | 'simple';

export interface CanonicalPlanContext {
  planId: string;
  plan?: any;
  occurrence?: any;
  category?: string;
  subType?: string;
  status?: string;
  scheduledAt?: string | null;
  petId?: string;
  title?: string;
  isSystemRequired?: boolean;
  sourceTable?: string;
}

export interface ResolvedPlanActions {
  actions: CanonicalPlanActionConfig[];
  editRoute: string | null;
  completionMode: CompletionMode;
  canComplete: boolean;
  canPostpone: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isCompleted: boolean;
  isParasite: boolean;
  isVaccine: boolean;
  displayTitle: string;
  displayDate: string;
  category: string;
  sourceTable: string;
}

/**
 * Normalizes raw plan ID by stripping prefixes such as 'plan_' or 'mock-'.
 */
export function normalizePlanId(id: string | number): string {
  if (!id) return '';
  const str = String(id);
  if (str.startsWith('plan_')) return str.replace('plan_', '');
  return str;
}

/**
 * Resolves the canonical user interaction actions for a plan, occurrence or task context.
 * Pure resolver: NO direct API calls or mutations.
 */
export function resolvePlanActions(context: CanonicalPlanContext): ResolvedPlanActions {
  const plan = context.plan || {};
  const occurrence = context.occurrence || {};

  const rawStatus = (context.status || occurrence.status || plan.status || 'active').toLowerCase();
  const isCompleted = rawStatus === 'completed' || rawStatus === 'done';
  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'deleted';

  // Category determination
  const category = (
    context.category ||
    plan.category ||
    occurrence.category ||
    (plan.extra_data?.record_type) ||
    'saglik'
  ).toLowerCase();

  const subType = (context.subType || plan.sub_type || '').toLowerCase();
  const title = (
    context.title ||
    occurrence.title ||
    plan.title ||
    plan.name ||
    plan.extra_data?.title ||
    'Görev'
  );

  const isParasite = category === 'parazit' || subType.includes('parazit') || title.toLowerCase().includes('parazit');
  const isVaccine = category === 'asi' || subType.includes('asi') || title.toLowerCase().includes('aşı') || title.toLowerCase().includes('asi');

  // Completion mode
  let completionMode: CompletionMode = 'simple';
  if (isParasite) {
    completionMode = 'parasite_protocol';
  } else if (isVaccine || category === 'saglik' || category === 'kontrol') {
    completionMode = 'completion_details';
  } else {
    completionMode = 'simple';
  }

  // System required flag
  const isSystemRequired = context.isSystemRequired ?? plan.is_system_required ?? false;

  // Actions availability
  const canComplete = !isCompleted && !isCancelled;
  const canPostpone = !isCompleted && !isCancelled;
  const canEdit = !isCompleted;
  const canDelete = !isSystemRequired;

  const actions: CanonicalPlanActionConfig[] = [];

  if (canComplete) {
    actions.push({
      id: 'complete',
      label: 'Tamamlandı',
      icon: 'CheckCircle2',
      variant: 'primary',
    });
  }

  if (canPostpone) {
    actions.push({
      id: 'postpone',
      label: 'Ertele',
      icon: 'Clock',
      variant: 'secondary',
    });
  }

  if (canEdit) {
    actions.push({
      id: 'edit',
      label: 'Düzenle',
      icon: 'Pencil',
      variant: 'secondary',
    });
  }

  if (canDelete) {
    actions.push({
      id: 'delete',
      label: 'Sil',
      icon: 'Trash2',
      variant: 'danger',
    });
  }

  // Edit route resolution
  const realId = normalizePlanId(context.planId || plan.id);
  const petId = context.petId || plan.pet_id;
  const editRoute = realId ? `/owner/plan-yap/edit/${realId}${petId ? `?pet_id=${petId}` : ''}` : null;

  // Display Date
  const rawDate = context.scheduledAt || occurrence.scheduled_at || plan.scheduled_at || plan.due_date || '';
  let displayDate = '';
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        displayDate = String(rawDate).split('T')[0];
      }
    } catch {
      displayDate = String(rawDate).split('T')[0];
    }
  }

  // Determine actual source table
  let sourceTable = 'plans';
  if (context.sourceTable) {
    sourceTable = context.sourceTable;
  } else if (plan._source) {
    sourceTable = plan._source;
  } else if (occurrence._source) {
    sourceTable = occurrence._source;
  } else if (plan._plan_id || plan.cadence !== undefined || plan.type !== undefined) {
    sourceTable = 'plans';
  } else if (plan.id && !String(plan.id).startsWith('plan_')) {
    // If it's a legacy schedule or external record without plan attributes
    sourceTable = 'health_schedules';
  }

  // Pure health_schedules entries (not linked to a plan) cannot be easily edited via /plans 
  // Disable edit for them to be safe, until we migrate fully
  if (sourceTable === 'health_schedules' && canEdit) {
    const editIndex = actions.findIndex(a => a.id === 'edit');
    if (editIndex !== -1) {
      actions.splice(editIndex, 1);
    }
  }

  return {
    actions,
    editRoute,
    completionMode,
    canComplete,
    canPostpone,
    canEdit: actions.some(a => a.id === 'edit'),
    canDelete,
    isCompleted,
    isParasite,
    isVaccine,
    displayTitle: title,
    displayDate,
    category,
    sourceTable,
  };
}
