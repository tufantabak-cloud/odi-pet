import { WriteContext, WriteResult, PlanMatchResult, PlanRecord } from './types';
import { agendaWriteRegistry } from './registry';
import { AgendaPlanInput, AgendaRecordInput } from '../types';

export async function processRecordCreation(
  category: string,
  input: AgendaPlanInput | AgendaRecordInput,
  context: WriteContext,
  selectedPlanId?: string
): Promise<{ result: WriteResult; matchResult: PlanMatchResult }> {
  const handler = agendaWriteRegistry.getHandler(category);
  await handler.validateInput(input);

  // Fetch active plans for this pet
  const { data: plans, error } = await context.supabase
    .from('plans')
    .select('*')
    .eq('pet_id', context.petId)
    .eq('status', 'active');

  if (error) throw error;

  const activePlans = (plans || []) as unknown as PlanRecord[];

  let matchResult: PlanMatchResult;

  if (selectedPlanId) {
    const selectedPlan = activePlans.find(p => p.id === selectedPlanId);
    if (selectedPlan) {
      matchResult = {
        status: 'exact',
        candidate: {
          planId: selectedPlan.id,
          mainPlanId: selectedPlan.parent_plan_id || selectedPlan.id,
          occurrenceScheduledAt: selectedPlan.scheduled_at,
          category: selectedPlan.category,
          subCategory: selectedPlan.sub_type,
          stableIdentity: `${selectedPlan.category}:${selectedPlan.sub_type}`,
          distanceMinutes: 0,
          repeatRule: selectedPlan.repeat_rule,
          displayDate: selectedPlan.scheduled_at.split('T')[0],
          rawPlan: selectedPlan
        },
        reason: 'user_selected_plan'
      };
    } else {
      matchResult = await handler.findMatchingPlans(input, activePlans);
    }
  } else {
    matchResult = await handler.findMatchingPlans(input, activePlans);
  }

  let result: WriteResult;

  if (matchResult.status === 'exact') {
    const nextDue = await handler.calculateNextDue(input, matchResult.candidate.rawPlan);
    result = await handler.persistLinkedRecord(input, matchResult.candidate, nextDue, context);
  } else {
    result = await handler.persistIndependentRecord(input, context);
  }

  return { result, matchResult };
}
