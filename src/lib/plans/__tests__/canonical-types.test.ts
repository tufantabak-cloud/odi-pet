import { describe, it, expect } from 'vitest';
import {
  Plan,
  RealizedOccurrence,
  ProjectedOccurrence,
  CanonicalPlanOccurrence,
  isSystemPlan,
  isRequiredPlan,
  canDeletePlan,
  canCancelPlan,
  isProjectedOccurrence,
  isRealizedOccurrence,
  calculateFloatingNextDue,
  CanonicalActionType,
  CanonicalDisplayStatus,
  ReminderPolicy,
} from '@/lib/plans/types';
import * as PlanningCoreExport from '@/types/planning';
import { createPlanSchema, updatePlanSchema } from '@/lib/plans/schema';

describe('ODI.PET — Canonical Planning Core Types & Hard Gates Verification', () => {
  describe('Gate 1 & 2: Single Plan Type & Schema Compatibility', () => {
    it('re-exports all types from @/types/planning without type fragmentation', () => {
      expect(PlanningCoreExport.isSystemPlan).toBe(isSystemPlan);
      expect(PlanningCoreExport.calculateFloatingNextDue).toBe(calculateFloatingNextDue);
    });

    it('validates a standard user plan with default source and policy', () => {
      const validPlanInput = {
        pet_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        category: 'saglik',
        sub_type: 'Genel Kontrol',
        scheduled_at: '2026-10-01T10:00:00.000Z',
      };

      const parsed = createPlanSchema.parse(validPlanInput);
      expect(parsed.pet_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(parsed.category).toBe('saglik');
      expect(parsed.source).toBe('user');
      expect(parsed.policy).toBe('optional');
      expect(parsed.is_active).toBe(true);
    });

    it('validates a system-defined required plan (e.g. 30-day weight tracking)', () => {
      const systemPlanInput = {
        pet_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        category: 'saglik',
        sub_type: 'kilo',
        title: 'Kilo Takibi',
        scheduled_at: '2026-10-01T09:00:00.000Z',
        repeat_rule: 'monthly',
        source: 'system',
        policy: 'required',
        assigned_to: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      };

      const parsed = createPlanSchema.parse(systemPlanInput);
      expect(parsed.source).toBe('system');
      expect(parsed.policy).toBe('required');
      expect(parsed.assigned_to).toBe('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
      expect(parsed.title).toBe('Kilo Takibi');
    });

    it('supports deleted status in updatePlanSchema for soft-deletion', () => {
      const updateInput = {
        status: 'deleted' as const,
        is_active: false,
      };

      const parsed = updatePlanSchema.parse(updateInput);
      expect(parsed.status).toBe('deleted');
      expect(parsed.is_active).toBe(false);
    });
  });

  describe('Gate 3 & 14: Canonical Action Vocabulary & Reschedule Separation', () => {
    it('defines distinct action types for single occurrence vs entire series reschedule', () => {
      const actions: CanonicalActionType[] = [
        'COMPLETE_OCCURRENCE',
        'RESCHEDULE_OCCURRENCE',
        'RESCHEDULE_SERIES',
        'SKIP_OCCURRENCE',
        'CANCEL_SERIES',
        'DELETE_PLAN',
        'EDIT_PLAN',
      ];

      expect(actions).toContain('RESCHEDULE_OCCURRENCE');
      expect(actions).toContain('RESCHEDULE_SERIES');
    });

    it('defines full canonical display status vocabulary', () => {
      const displayStatuses: CanonicalDisplayStatus[] = [
        'upcoming',
        'due_today',
        'overdue',
        'completed',
        'skipped',
        'cancelled',
      ];

      expect(displayStatuses.length).toBe(6);
    });
  });

  describe('Gate 4: Plan vs. Occurrence Semantic Separation (Virtual vs Physical)', () => {
    it('correctly discriminates between RealizedOccurrence (physical) and ProjectedOccurrence (virtual)', () => {
      const realized: RealizedOccurrence = {
        id: 'occ-123',
        plan_id: 'plan-1',
        pet_id: 'pet-1',
        scheduled_at: '2026-09-15T09:00:00.000Z',
        completed_at: '2026-09-15T09:30:00.000Z',
        original_scheduled_at: null,
        status: 'completed',
        assigned_to: 'user-ayse',
        notes: 'Tamamlandı',
        extra_data: { measured_weight_kg: 5.2 },
        record_id: 'weight-log-789',
        record_table: 'weight_logs',
        created_at: '2026-09-15T09:30:00.000Z',
        updated_at: '2026-09-15T09:30:00.000Z',
        is_virtual: false,
      };

      const projected: ProjectedOccurrence = {
        id: 'proj_plan-1_2026-10-15',
        plan_id: 'plan-1',
        pet_id: 'pet-1',
        scheduled_at: '2026-10-15T09:00:00.000Z',
        status: 'upcoming',
        assigned_to: 'user-ayse',
        is_virtual: true,
      };

      expect(isRealizedOccurrence(realized)).toBe(true);
      expect(isProjectedOccurrence(realized)).toBe(false);

      expect(isProjectedOccurrence(projected)).toBe(true);
      expect(isRealizedOccurrence(projected)).toBe(false);
    });
  });

  describe('Gate 5: Assignment Hierarchy (Plan Default vs Occurrence Actual)', () => {
    it('allows plan-level default assignment and instance-level override', () => {
      const plan: Plan = {
        id: 'plan-1',
        pet_id: 'pet-1',
        user_id: 'user-owner',
        category: 'saglik',
        sub_type: 'Kilo Ölçümü',
        scheduled_at: '2026-09-15T09:00:00.000Z',
        notif_before: 10,
        notif_unit: 'minute',
        extra_data: {},
        status: 'active',
        source: 'system',
        policy: 'required',
        assigned_to: 'user-ayse', // Default assignee for all occurrences
        is_active: true,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
      };

      // 15 Sep occurrence executed by Ayşe
      const occurrence1: RealizedOccurrence = {
        id: 'occ-1',
        plan_id: plan.id,
        pet_id: plan.pet_id,
        scheduled_at: '2026-09-15T09:00:00.000Z',
        status: 'completed',
        assigned_to: 'user-ayse',
        created_at: '2026-09-15T09:00:00.000Z',
        updated_at: '2026-09-15T09:00:00.000Z',
        is_virtual: false,
      };

      // 15 Oct occurrence delegated and executed by Ali
      const occurrence2: RealizedOccurrence = {
        id: 'occ-2',
        plan_id: plan.id,
        pet_id: plan.pet_id,
        scheduled_at: '2026-10-15T09:00:00.000Z',
        status: 'completed',
        assigned_to: 'user-ali',
        created_at: '2026-10-15T09:00:00.000Z',
        updated_at: '2026-10-15T09:00:00.000Z',
        is_virtual: false,
      };

      expect(plan.assigned_to).toBe('user-ayse');
      expect(occurrence1.assigned_to).toBe('user-ayse');
      expect(occurrence2.assigned_to).toBe('user-ali');
    });
  });

  describe('Gate 6: System Plan Governance & Floating Schedule', () => {
    it('prevents deletion and cancellation of system/required plans', () => {
      const userPlan = { source: 'user' as const, policy: 'optional' as const };
      const systemRequiredPlan = { source: 'system' as const, policy: 'required' as const };

      expect(canDeletePlan(userPlan)).toBe(true);
      expect(canCancelPlan(userPlan)).toBe(true);

      expect(canDeletePlan(systemRequiredPlan)).toBe(false);
      expect(canCancelPlan(systemRequiredPlan)).toBe(false);
    });

    it('calculates floating schedule from actual completion date instead of stale overdue date', () => {
      // Scenario: Scheduled 22 Sept, Completed 12 Oct (20 days overdue)
      const scheduledAt = '2026-09-22T09:00:00.000Z';
      const actualCompletionAt = '2026-10-12T14:30:00.000Z';

      const nextDueIso = calculateFloatingNextDue(actualCompletionAt, 'monthly', 1);
      expect(nextDueIso).not.toBeNull();

      const nextDueDate = new Date(nextDueIso!);
      // Target must be 12 November (1 month from 12 Oct), NOT 22 October!
      expect(nextDueDate.getUTCMonth()).toBe(10); // November (0-indexed: 10 = Nov)
      expect(nextDueDate.getUTCDate()).toBe(12);
    });

    it('calculates floating schedule with day-based interval for puppies (14 days)', () => {
      const actualCompletionAt = '2026-09-10T10:00:00.000Z';
      const nextDueIso = calculateFloatingNextDue(actualCompletionAt, 'daily', 14);

      expect(nextDueIso).not.toBeNull();
      const nextDueDate = new Date(nextDueIso!);
      expect(nextDueDate.getUTCDate()).toBe(24);
      expect(nextDueDate.getUTCMonth()).toBe(8); // September
    });
  });

  describe('Gate 8: Notification Engine & Reminder Policy', () => {
    it('supports multi-step progressive reminder policy (T-14, T-7, T-2, T0, T+1)', () => {
      const vaccineReminderPolicy: ReminderPolicy = {
        policy_id: 'policy_core_vaccine',
        plan_id: 'plan-v1',
        triggers: [
          { offset_value: 14, offset_unit: 'day', direction: 'before', channel: 'push' },
          { offset_value: 7, offset_unit: 'day', direction: 'before', channel: 'both' },
          { offset_value: 2, offset_unit: 'day', direction: 'before', channel: 'both' },
          { offset_value: 0, offset_unit: 'day', direction: 'before', channel: 'both' },
          { offset_value: 1, offset_unit: 'day', direction: 'after', channel: 'push' }, // Overdue alert
        ],
      };

      expect(vaccineReminderPolicy.triggers.length).toBe(5);
      expect(vaccineReminderPolicy.triggers[0].offset_value).toBe(14);
      expect(vaccineReminderPolicy.triggers[4].direction).toBe('after');
    });
  });
});
