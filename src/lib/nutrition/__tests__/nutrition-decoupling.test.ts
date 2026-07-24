import { describe, it, expect } from 'vitest';
import { buildNutritionTimelineEvents } from '../nutrition-timeline-events';

describe('Nutrition Decoupling & Timeline Normalization Tests', () => {
  const petId = 'test-pet-123';

  it('1. Generates assignment start and end events with unique canonical keys', () => {
    const assignments = [
      {
        id: 'assign-1',
        started_at: '2026-01-01T08:00:00Z',
        ended_at: '2026-06-01T08:00:00Z',
        brand_name: 'Royal Canin',
        product_name: 'Mini Adult',
        daily_target_grams: 120,
      },
    ];

    const events = buildNutritionTimelineEvents({ petId, assignments });

    expect(events.length).toBe(2);
    expect(events[0].id).toBe('nutrition-assignment:assign-1:started');
    expect(events[0].title).toContain('Mamaya Başlandı: Royal Canin Mini Adult');
    expect(events[0].linkHref).toBe(`/owner/pets/${petId}/nutrition`);

    expect(events[1].id).toBe('nutrition-assignment:assign-1:ended');
    expect(events[1].title).toContain('Mama Kullanımı Sonlandırıldı: Royal Canin Mini Adult');
    expect(events[1].linkHref).toBe(`/owner/pets/${petId}/nutrition`);
  });

  it('2. Normalizes plans where category = beslenme with unique key and excludes non-beslenme plans', () => {
    const plans = [
      {
        id: 'plan-1',
        category: 'beslenme',
        sub_type: 'Mama Saati',
        scheduled_at: '2026-07-24T08:00:00Z',
        status: 'active',
      },
      {
        id: 'plan-2',
        category: 'asi', // Non-beslenme plan
        sub_type: 'Kuduz Aşı',
        scheduled_at: '2026-07-24T09:00:00Z',
        status: 'active',
      },
    ];

    const events = buildNutritionTimelineEvents({ petId, plans });

    expect(events.length).toBe(1);
    expect(events[0].id).toBe('nutrition-plan:plan-1');
    expect(events[0].title).toBe('Mama Saati');
    expect(events[0].linkHref).toBe(`/owner/pets/${petId}/nutrition`);
  });

  it('3. Excludes daily feeding_logs from the Timeline event list to prevent cluttering', () => {
    const assignments = [
      {
        id: 'assign-2',
        started_at: '2026-02-01T08:00:00Z',
        brand_name: 'Pro Plan',
        product_name: 'OptiStart',
      },
    ];

    // Simulating feeding logs presence (not passed into buildNutritionTimelineEvents)
    const events = buildNutritionTimelineEvents({ petId, assignments });

    expect(events.length).toBe(1);
    expect(events.some((e) => e.id.includes('feeding_log'))).toBe(false);
  });

  it('4. Ensures strict deduplication so identical assignment/plan events appear only once', () => {
    const assignments = [
      {
        id: 'assign-dup',
        started_at: '2026-03-01T08:00:00Z',
        brand_name: 'N&D',
        product_name: 'Grain Free',
      },
      {
        id: 'assign-dup', // Duplicate assignment
        started_at: '2026-03-01T08:00:00Z',
        brand_name: 'N&D',
        product_name: 'Grain Free',
      },
    ];

    const plans = [
      {
        id: 'plan-dup',
        category: 'beslenme',
        sub_type: 'Su Tazeleme',
        scheduled_at: '2026-07-24T10:00:00Z',
        status: 'active',
      },
      {
        id: 'plan-dup', // Duplicate plan
        category: 'beslenme',
        sub_type: 'Su Tazeleme',
        scheduled_at: '2026-07-24T10:00:00Z',
        status: 'active',
      },
    ];

    const events = buildNutritionTimelineEvents({ petId, assignments, plans });

    expect(events.length).toBe(2);
    expect(events.map((e) => e.id)).toEqual([
      'nutrition-assignment:assign-dup:started',
      'nutrition-plan:plan-dup',
    ]);
  });
});
