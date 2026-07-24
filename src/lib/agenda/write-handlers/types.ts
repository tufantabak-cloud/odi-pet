export type PlanMatchResult =
  | { status: 'none' }
  | {
      status: 'exact';
      candidate: PlanMatchCandidate;
      reason: string;
    }
  | {
      status: 'multiple';
      candidates: PlanMatchCandidate[];
      reason: string;
    };

export type PlanMatchCandidate = {
  planId: string;
  mainPlanId: string;
  occurrenceScheduledAt: string;
  category: string;
  subCategory: string;
  stableIdentity: string;
  distanceMinutes: number;
  repeatRule: string | null;
  displayDate: string;
  rawPlan: any;
};

export type NextDueResult =
  | {
      status: 'resolved';
      nextDueAt: string;
      source: string;
    }
  | { status: 'series_complete' }
  | {
      status: 'unresolved';
      reason: string;
    };

export interface WriteContext {
  supabase: any;
  petId: string;
  userId: string;
  timeZone: string;
  idempotencyKey?: string;
}

export interface WriteResult {
  recordId: string;
  source: string;
  linkedPlanId: string | null;
  completedOccurrencePlanId: string | null;
  advancedMainPlanId: string | null;
  nextDueAt: string | null;
}

export interface PlanRecord {
  id: string;
  pet_id: string;
  category: string;
  sub_type: string;
  scheduled_at: string;
  repeat_rule: string | null;
  status: string;
  parent_plan_id: string | null;
  occurrence_scheduled_at: string | null;
  extra_data?: any;
}

export interface AgendaWriteHandler<TInput = any> {
  category: string;

  validateInput(input: TInput): Promise<void> | void;

  getStableIdentity(input: TInput): string;

  findMatchingPlans(
    input: TInput,
    activePlans: PlanRecord[]
  ): Promise<PlanMatchResult>;

  calculateNextDue(
    input: TInput,
    matchedPlan: PlanRecord | null
  ): Promise<NextDueResult>;

  persistIndependentRecord(
    input: TInput,
    context: WriteContext
  ): Promise<WriteResult>;

  persistLinkedRecord(
    input: TInput,
    match: PlanMatchCandidate,
    nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult>;
}
