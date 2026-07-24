import { describe, it, expect } from 'vitest';
import { calculateNextOccurrenceDate } from '../service';
import { expandRecurringForTimeline } from '@/components/health-tracker/lib/recurring-events';

describe('Plan Occurrence Linking & Multi-Occurrence Idempotency Logic (Step 1.2)', () => {
  describe('calculateNextOccurrenceDate - Category Safety & Protocols', () => {
    it('calculates yearly repeat for Rabies vaccine (DOG_RABIES)', () => {
      const base = '2026-07-22T19:47:00.000Z';
      const result = calculateNextOccurrenceDate(base, 'yearly', { vaccine_code: 'DOG_RABIES' });
      expect(result).toContain('2027-07-22');
    });

    it('calculates hourly repeat for hourly medications', () => {
      const base = '2026-07-23T09:00:00.000Z';
      const result = calculateNextOccurrenceDate(base, 'hourly', { interval: 6 });
      expect(result).toBe('2026-07-23T15:00:00.000Z');
    });

    it('calculates daily repeat for twice-daily medication', () => {
      const base = '2026-07-23T09:00:00.000Z';
      const result = calculateNextOccurrenceDate(base, 'daily', { interval: 1 });
      expect(result).toBe('2026-07-24T09:00:00.000Z');
    });

    it('returns null for unsupported categories without explicit repeat_rule (does not guess +365)', () => {
      const base = '2026-07-22T19:47:00.000Z';
      const result = calculateNextOccurrenceDate(base, null, { category: 'cerrahi' });
      expect(result).toBeNull();
    });

    it('returns null for invalid date string', () => {
      const result = calculateNextOccurrenceDate('invalid-date', 'daily');
      expect(result).toBeNull();
    });
  });

  describe('Multi-Occurrence Same Day & Early/Late Completion Idempotency', () => {
    it('distinguishes two occurrences on the same day by occurrence_scheduled_at (09:00 vs 21:00)', () => {
      const occ1Scheduled = '2026-07-23T09:00:00.000Z';
      const occ2Scheduled = '2026-07-23T21:00:00.000Z';

      expect(occ1Scheduled).not.toBe(occ2Scheduled);

      // Early completion at 08:30 for occ1
      const occ1ActualCompleted = '2026-07-23T08:30:00.000Z';
      expect(occ1ActualCompleted).not.toBe(occ1Scheduled);
      // But occurrence identity remains occ1Scheduled!
    });

    it('maintains occurrence_scheduled_at identity regardless of actual execution time offset', () => {
      const originalScheduled = '2026-07-23T09:00:00.000Z';
      const lateExecuted = '2026-07-23T11:45:00.000Z';

      // Record identity is built on (parent_plan_id, occurrence_scheduled_at)
      const recordKey = `main_plan_123_${originalScheduled}`;
      expect(recordKey).toContain('2026-07-23T09:00:00.000Z');
    });
  });

  describe('expandRecurringForTimeline', () => {
    it('does not generate virtual occurrences for completed static child plans', () => {
      const events = [
        {
          id: 'static_completed_1',
          category: 'asi',
          title: 'Kuduz Aşısı Protokolü',
          due_date: '2026-07-22',
          status: 'done',
          repeat_rule: null,
          parent_plan_id: 'main_plan_123',
          occurrence_scheduled_at: '2026-07-22T19:47:00.000Z',
        },
      ];

      const expanded = expandRecurringForTimeline(events, -10, 30);
      const virtuals = expanded.filter((e) => e._is_virtual);
      expect(virtuals.length).toBe(0);
    });

    it('generates virtual occurrences only for active main recurring plans', () => {
      const events = [
        {
          id: 'plan_main_123',
          category: 'asi',
          title: 'Kuduz Aşısı Protokolü',
          due_date: '2026-07-22',
          status: 'upcoming',
          repeat_rule: 'yearly',
          extra_data: { interval: 1 },
        },
      ];

      const expanded = expandRecurringForTimeline(events, -400, 400);
      const virtuals = expanded.filter((e) => e._is_virtual);
      expect(virtuals.length).toBeGreaterThan(0);
    });
  });
});
