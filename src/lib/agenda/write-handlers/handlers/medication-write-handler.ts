import {
  AgendaWriteHandler,
  PlanMatchResult,
  PlanMatchCandidate,
  NextDueResult,
  PlanRecord,
  WriteContext,
  WriteResult
} from '../types';

export class MedicationWriteHandler implements AgendaWriteHandler {
  readonly category = 'ilac';

  validateInput(input: any): void {
    if (!input || !input.pet_id) throw new Error('MEDICATION_WRITE_UNSUPPORTED: pet_id is required');
  }

  getStableIdentity(input: any): string {
    return `ilac:${input.medication_name || 'custom'}`;
  }

  async findMatchingPlans(): Promise<PlanMatchResult> {
    return { status: 'none' };
  }

  async calculateNextDue(): Promise<NextDueResult> {
    return { status: 'unresolved', reason: 'medication_write_unsupported' };
  }

  async persistIndependentRecord(input: any, context: WriteContext): Promise<WriteResult> {
    const { supabase, petId } = context;

    const { data: record, error } = await supabase
      .from('health_medications')
      .insert({
        pet_id: petId,
        medication_name: input.medication_name || 'İsimsiz İlaç',
        dose: input.dose || null,
        usage_duration: input.usage_duration || null,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return {
      recordId: record.id,
      source: 'health_medications',
      linkedPlanId: null,
      completedOccurrencePlanId: null,
      advancedMainPlanId: null,
      nextDueAt: null
    };
  }

  async persistLinkedRecord(
    input: any,
    match: PlanMatchCandidate,
    nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult> {
    throw new Error('MEDICATION_WRITE_UNSUPPORTED: Linked records not fully implemented yet');
  }
}
