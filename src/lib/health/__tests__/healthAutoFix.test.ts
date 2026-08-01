import { describe, it, expect } from 'vitest'
import { auditHealthData, type AuditInputData } from '../auditHealthData'
import { planHealthAutoFix } from '../healthAutoFix'

describe('Sprint Y.4 — Health Auto-Fix Engine (Dry-Run First)', () => {
  it('1. executable is always false (dry-run safety rule)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', name: 'Odi', species: 'dog', is_active: true, owner_id: 'user-1' }],
      notifications: [{ id: 'notif-1', pet_id: 'pet-1', plan_id: 'missing-plan', type: 'overdue' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult, { dryRun: true })

    expect(plan.executable).toBe(false)
  })

  it('2. generates DELETE_NOTIFICATION action for DUPLICATE_NOTIFICATION_INSERT', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'overdue', due_date: '2026-01-01' }],
      notifications: [
        { id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
        { id: 'notif-dup', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
      ],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const fix = plan.fixes.find(f => f.actionType === 'DELETE_NOTIFICATION')
    expect(fix).toBeDefined()
    expect(fix?.targetId).toBe('notif-dup')
    expect(fix?.targetTable).toBe('notifications')
  })

  it('3. generates NORMALIZE_CONFIDENCE action for NON_CANONICAL_CONFIDENCE_LEVEL', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-1', confidence_level: 'manual' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const fix = plan.fixes.find(f => f.actionType === 'NORMALIZE_CONFIDENCE')
    expect(fix).toBeDefined()
    expect(fix?.targetId).toBe('rec-1')
    expect(fix?.proposedChanges).toEqual({ confidence_level: 'user_reported' })
  })

  it('4. generates CLEANUP_ORPHAN_NOTIFICATION action for INVALID_PLAN_REFERENCE', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      notifications: [{ id: 'notif-orphan', pet_id: 'pet-1', plan_id: 'non-existent-plan', type: 'overdue' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const fix = plan.fixes.find(f => f.actionType === 'CLEANUP_ORPHAN_NOTIFICATION')
    expect(fix).toBeDefined()
    expect(fix?.targetId).toBe('notif-orphan')
  })

  it('5. generates FLAG_DUPLICATE_PLAN action for DUPLICATE_COMPLETED_PLAN', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [
        { id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', status: 'completed', due_date: '2025-01-01' },
        { id: 'plan-dup', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', status: 'completed', due_date: '2026-01-01' },
      ],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const fix = plan.fixes.find(f => f.actionType === 'FLAG_DUPLICATE_PLAN')
    expect(fix).toBeDefined()
    expect(fix?.targetId).toBe('plan-dup')
  })

  it('6. generates FLAG_DUPLICATE_VACCINE action for DUPLICATE_VACCINE_RECORD', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [
        { id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2026-05-10' },
        { id: 'rec-dup', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2026-05-10' },
      ],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const fix = plan.fixes.find(f => f.actionType === 'FLAG_DUPLICATE_VACCINE')
    expect(fix).toBeDefined()
    expect(fix?.targetId).toBe('rec-dup')
  })

  it('7. skips PET_WITHOUT_OWNER for manual intervention', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-no-owner', name: 'NoOwner', is_active: true, owner_id: null }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'PET_WITHOUT_OWNER')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('MANUAL_OWNERSHIP_ASSIGNMENT_REQUIRED')
  })

  it('8. skips ACTIVE_PLAN_ON_INACTIVE_PET for manual review', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-inactive', name: 'Inactive', is_active: false, owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-inactive', vaccine_code: 'DOG_CDV', status: 'pending', due_date: '2026-08-01' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'ACTIVE_PLAN_ON_INACTIVE_PET')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('INACTIVE_PET_REVIEW_REQUIRED')
  })

  it('9. skips MISSING_LEGAL_REQUIRED_PLAN for manual consent', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-dog', name: 'Dog', species: 'dog', owner_id: 'user-1' }],
      pet_memberships: [{ pet_id: 'pet-dog', profile_id: 'user-1' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'MISSING_LEGAL_REQUIRED_PLAN')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('LEGAL_PROTOCOL_CONSENT_REQUIRED')
  })

  it('10. skips ORPHAN_VACCINE_RECORD for manual audit', () => {
    const data: AuditInputData = {
      pets: [],
      vaccine_records: [{ id: 'rec-orphan', pet_id: 'missing-pet', vaccine_code: 'DOG_RABIES' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'ORPHAN_VACCINE_RECORD')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('MEDICAL_RECORD_AUDIT_REQUIRED')
  })

  it('11. skips VACCINE_INVALID_DATE_ORDER for manual date resolution', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-1', administered_at: '2026-05-10', next_due_at: '2025-01-01' }],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'VACCINE_INVALID_DATE_ORDER')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('CHRONOLOGICAL_DATE_RESOLUTION_REQUIRED')
  })

  it('12. skips OVERDUE_PLAN_MISSING_NOTIFICATION for orchestration dispatch', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-overdue', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'overdue', due_date: '2026-01-01' }],
      notifications: [],
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    const skipped = plan.skipped.find(s => s.code === 'OVERDUE_PLAN_MISSING_NOTIFICATION')
    expect(skipped).toBeDefined()
    expect(skipped?.reason).toBe('NOTIFICATION_ENGINE_DISPATCH_REQUIRED')
  })

  it('13. correctly calculates fixable and manual summary metrics', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-no-owner', owner_id: null }], // Manual (1)
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-no-owner', confidence_level: 'ocr' }], // Fixable (1)
    }
    const auditResult = auditHealthData(data)
    const plan = planHealthAutoFix(auditResult)

    expect(plan.summary.fixable).toBe(1)
    expect(plan.summary.manual).toBe(1)
    expect(plan.fixes).toHaveLength(1)
    expect(plan.skipped).toHaveLength(1)
  })
})
