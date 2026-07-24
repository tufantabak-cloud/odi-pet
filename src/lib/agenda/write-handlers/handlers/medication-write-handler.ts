import {
  AgendaWriteHandler,
  PlanMatchResult,
  NextDueResult,
  PlanRecord,
  WriteContext,
  WriteResult
} from '../types';

export class MedicationWriteHandler implements AgendaWriteHandler {
  readonly category = 'ilac';

  validateInput(): void {
    throw new Error('MEDICATION_WRITE_UNSUPPORTED: Atomic plan matching for medication records is explicitly unsupported in this sprint');
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

  async persistIndependentRecord(): Promise<WriteResult> {
    throw new Error('MEDICATION_WRITE_UNSUPPORTED: Medication write operation is unsupported in this sprint');
  }

  async persistLinkedRecord(): Promise<WriteResult> {
    throw new Error('MEDICATION_WRITE_UNSUPPORTED: Medication write operation is unsupported in this sprint');
  }
}
