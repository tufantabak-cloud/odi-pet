import { describe, it, expect } from 'vitest'
import { auditHealthData, type AuditInputData } from '../auditHealthData'

describe('Sprint Y.3 — Health Data Integrity Audit Engine', () => {
  it('1. Passes audit cleanly for a fully consistent dataset', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', name: 'Odi', species: 'dog', is_active: true, owner_id: 'user-1' }],
      pet_memberships: [{ pet_id: 'pet-1', profile_id: 'user-1', role: 'primary_owner' }],
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', administered_at: '2025-05-10', next_due_at: '2026-05-10', confidence_level: 'verified' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'completed', due_date: '2026-05-10' }],
      notifications: [{ id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' }],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.statistics.petsScanned).toBe(1)
    expect(result.statistics.vaccineRecords).toBe(1)
    expect(result.statistics.plans).toBe(1)
    expect(result.statistics.notifications).toBe(1)
  })

  it('2. Detects pet without owner or membership (PET_WITHOUT_OWNER)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-orphan', name: 'OrphanPet', is_active: true, owner_id: null }],
      pet_memberships: [],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PET_WITHOUT_OWNER' }),
      ])
    )
  })

  it('3. Warns on active plan on an inactive pet (ACTIVE_PLAN_ON_INACTIVE_PET)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-inactive', name: 'Inactive', is_active: false, owner_id: 'user-1' }],
      pet_memberships: [{ pet_id: 'pet-inactive', profile_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-inactive', vaccine_code: 'DOG_CDV', status: 'pending', due_date: '2026-08-01' }],
    }

    const result = auditHealthData(data)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ACTIVE_PLAN_ON_INACTIVE_PET' }),
      ])
    )
  })

  it('4. Detects orphan vaccine record referencing missing pet_id (ORPHAN_VACCINE_RECORD)', () => {
    const data: AuditInputData = {
      pets: [],
      vaccine_records: [{ id: 'rec-orphan', pet_id: 'non-existent-pet', vaccine_code: 'DOG_RABIES' }],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ORPHAN_VACCINE_RECORD' }),
      ])
    )
  })

  it('5. Warns on non-canonical confidence_level (NON_CANONICAL_CONFIDENCE_LEVEL)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-1', confidence_level: 'manual' }],
    }

    const result = auditHealthData(data)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NON_CANONICAL_CONFIDENCE_LEVEL' }),
      ])
    )
  })

  it('6. Detects invalid vaccine date order (VACCINE_INVALID_DATE_ORDER)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [{ id: 'rec-1', pet_id: 'pet-1', administered_at: '2026-05-10', next_due_at: '2025-01-01' }],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'VACCINE_INVALID_DATE_ORDER' }),
      ])
    )
  })

  it('7. Warns on duplicate vaccine records on same date (DUPLICATE_VACCINE_RECORD)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccine_records: [
        { id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2026-05-10' },
        { id: 'rec-2', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2026-05-10' },
      ],
    }

    const result = auditHealthData(data)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_VACCINE_RECORD' }),
      ])
    )
  })

  it('8. Warns on overdue plan without notification (OVERDUE_PLAN_MISSING_NOTIFICATION)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-overdue', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'overdue', due_date: '2026-01-01' }],
      notifications: [],
    }

    const result = auditHealthData(data)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'OVERDUE_PLAN_MISSING_NOTIFICATION' }),
      ])
    )
  })

  it('9. Warns on missing legal required Rabies plan for dog/cat (MISSING_LEGAL_REQUIRED_PLAN)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-dog', name: 'Karabaş', species: 'dog', owner_id: 'user-1' }],
      pet_memberships: [{ pet_id: 'pet-dog', profile_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-dog', vaccine_code: 'DOG_CDV', status: 'completed', due_date: '2026-05-10' }],
    }

    const result = auditHealthData(data)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_LEGAL_REQUIRED_PLAN' }),
      ])
    )
  })

  it('10. Detects orphan notification referencing non-existent plan (INVALID_PLAN_REFERENCE)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      notifications: [{ id: 'notif-orphan', pet_id: 'pet-1', plan_id: 'missing-plan-id', type: 'overdue' }],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_PLAN_REFERENCE' }),
      ])
    )
  })

  it('11. Detects duplicate notification insert for same plan and type (DUPLICATE_NOTIFICATION_INSERT)', () => {
    const data: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'overdue', due_date: '2026-01-01' }],
      notifications: [
        { id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
        { id: 'notif-2', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
      ],
    }

    const result = auditHealthData(data)
    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_NOTIFICATION_INSERT' }),
      ])
    )
  })
})
