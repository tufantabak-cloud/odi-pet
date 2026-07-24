import { deriveDateKey } from '@/lib/agenda/types';

export interface NutritionTimelineEvent {
  id: string; // Unique event key: 'nutrition-assignment:{id}:started', 'nutrition-assignment:{id}:ended', 'nutrition-plan:{id}', or 'nutrition-plan:{parentId}:occ:{dateKey}'
  pet_id: string;
  source: 'nutrition_assignment' | 'nutrition_plan';
  eventType: 'assignment_started' | 'assignment_ended' | 'reminder_plan';
  title: string;
  dateKey: string;
  sortDate: number;
  status: 'started' | 'ended' | 'active' | 'completed' | 'cancelled';
  linkHref: string;
  notes?: string | null;
  extraData?: any;
}

/**
 * Normalizes nutrition-related events for Timeline display:
 * 1. pet_food_assignments start events (nutrition-assignment:{assignmentId}:started)
 * 2. pet_food_assignments end events (nutrition-assignment:{assignmentId}:ended)
 * 3. plans with category = 'beslenme' (Rule 2 IDs):
 *    - One-time plan -> nutrition-plan:{plan.id}
 *    - Real child occurrence -> nutrition-plan:{occurrence.id}
 *    - Virtual occurrence -> nutrition-plan:{parent.id}:occ:{dateKey}
 *
 * Rules:
 * - Individual daily feeding_logs are NOT returned (prevents cluttering the timeline).
 * - Weight logs are NOT duplicated here (handled by weight_logs handlers).
 * - Every event has a canonical unique id to prevent duplicate rendering.
 * - Clicking any event navigates to canonical `/owner/pets/${petId}/nutrition`.
 */
export function buildNutritionTimelineEvents(params: {
  petId: string;
  assignments?: any[];
  plans?: any[];
  timeZone?: string;
}): NutritionTimelineEvent[] {
  const { petId, assignments = [], plans = [], timeZone = 'Europe/Istanbul' } = params;
  const events: NutritionTimelineEvent[] = [];
  const seenIds = new Set<string>();

  // 1. Food Assignments (started / ended)
  assignments.forEach((assign: any) => {
    if (!assign || !assign.id) return;

    const brandName = assign.food_product_family?.brand?.display_name || assign.brand_name || '';
    const productName = assign.food_product_family?.official_name || assign.product_name || 'Mama';
    const foodTitle = [brandName, productName].filter(Boolean).join(' ');

    // Started Event
    if (assign.started_at) {
      const startedId = `nutrition-assignment:${assign.id}:started`;
      if (!seenIds.has(startedId)) {
        seenIds.add(startedId);
        const dateKey = deriveDateKey(assign.started_at, timeZone);
        const sortDate = new Date(assign.started_at).getTime();
        events.push({
          id: startedId,
          pet_id: petId,
          source: 'nutrition_assignment',
          eventType: 'assignment_started',
          title: `Mamaya Başlandı: ${foodTitle}`,
          dateKey,
          sortDate,
          status: 'started',
          linkHref: `/owner/pets/${petId}/nutrition`,
          notes: assign.daily_target_grams ? `Günlük hedef: ${assign.daily_target_grams}g` : null,
          extraData: assign,
        });
      }
    }

    // Ended Event
    if (assign.ended_at) {
      const endedId = `nutrition-assignment:${assign.id}:ended`;
      if (!seenIds.has(endedId)) {
        seenIds.add(endedId);
        const dateKey = deriveDateKey(assign.ended_at, timeZone);
        const sortDate = new Date(assign.ended_at).getTime();
        events.push({
          id: endedId,
          pet_id: petId,
          source: 'nutrition_assignment',
          eventType: 'assignment_ended',
          title: `Mama Kullanımı Sonlandırıldı: ${foodTitle}`,
          dateKey,
          sortDate,
          status: 'ended',
          linkHref: `/owner/pets/${petId}/nutrition`,
          notes: assign.end_reason ? `Neden: ${assign.end_reason}` : null,
          extraData: assign,
        });
      }
    }
  });

  // 2. Nutrition Plans (plans.category === 'beslenme')
  plans.forEach((plan: any) => {
    if (!plan || (!plan.id && !plan._plan_id)) return;
    if (plan.category !== 'beslenme' && plan._plan_category !== 'beslenme') return;
    if (plan.status === 'cancelled') return;

    const scheduledAt = plan.scheduled_at || plan.due_date || plan.created_at;
    const dateKey = deriveDateKey(scheduledAt, timeZone);

    // Rule 2: Derive canonical unique event identity
    let eventId: string;
    if (plan._is_virtual) {
      const parentId = plan.parent_plan_id || plan._plan_id || plan.id;
      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : dateKey;
      eventId = `nutrition-plan:${parentId}:occ:${scheduledIso}`;
    } else if (plan.parent_plan_id) {
      // Real child occurrence record
      eventId = `nutrition-plan:${plan.id}`;
    } else {
      // One-time or parent plan record
      eventId = `nutrition-plan:${plan.id}`;
    }

    if (!seenIds.has(eventId)) {
      seenIds.add(eventId);
      const sortDate = new Date(scheduledAt).getTime();
      const planTitle = plan.sub_type || plan.title || plan.extra_data?.title || 'Beslenme Hatırlatıcı';

      events.push({
        id: eventId,
        pet_id: petId,
        source: 'nutrition_plan',
        eventType: 'reminder_plan',
        title: planTitle,
        dateKey,
        sortDate,
        status: plan.status === 'completed' || plan.status === 'done' ? 'completed' : 'active',
        linkHref: `/owner/pets/${petId}/nutrition`,
        notes: plan.note || plan.notes || null,
        extraData: plan,
      });
    }
  });

  return events.sort((a, b) => a.sortDate - b.sortDate);
}
