import {
  AgendaWriteHandler,
  PlanMatchResult,
  NextDueResult,
  PlanRecord,
  WriteContext,
  WriteResult
} from '../types';

export interface GrowthWriteInput {
  pet_id: string;
  weight_kg?: number;
  height_cm?: number;
  recorded_at: string;
  notes?: string;
}

export class GrowthWriteHandler implements AgendaWriteHandler<GrowthWriteInput> {
  readonly category = 'saglik';

  validateInput(input: GrowthWriteInput): void {
    if (!input.pet_id) throw new Error('GROWTH_WRITE_ERROR: pet_id is required');
    if (!input.recorded_at) throw new Error('GROWTH_WRITE_ERROR: recorded_at is required');
    if (input.weight_kg === undefined && input.height_cm === undefined) {
      throw new Error('GROWTH_WRITE_ERROR: weight_kg or height_cm is required');
    }
  }

  getStableIdentity(input: GrowthWriteInput): string {
    return `saglik:kilo_${input.pet_id}`;
  }

  async findMatchingPlans(_input: GrowthWriteInput, _activePlans: PlanRecord[]): Promise<PlanMatchResult> {
    return { status: 'none' };
  }

  async calculateNextDue(_input: GrowthWriteInput, _matchedPlan: PlanRecord | null): Promise<NextDueResult> {
    return { status: 'unresolved', reason: 'growth_measurements_do_not_recur_automatically' };
  }

  async persistIndependentRecord(input: GrowthWriteInput, context: WriteContext): Promise<WriteResult> {
    const { supabase, petId, userId } = context;

    const { data: rec, error } = await supabase
      .from('growth_records')
      .insert({
        pet_id: petId,
        user_id: userId,
        weight_kg: input.weight_kg || null,
        height_cm: input.height_cm || null,
        recorded_at: input.recorded_at.split('T')[0],
        notes: input.notes || null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      recordId: rec.id,
      source: 'growth_records',
      linkedPlanId: null,
      completedOccurrencePlanId: null,
      advancedMainPlanId: null,
      nextDueAt: null
    };
  }

  async persistLinkedRecord(
    input: GrowthWriteInput,
    _match: unknown,
    _nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult> {
    return this.persistIndependentRecord(input, context);
  }
}
