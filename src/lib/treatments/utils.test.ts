import { describe, it, expect } from 'vitest'
import {
  buildMedicationSchedule,
  shouldCreatePayment,
  resolveDiseaseLabel,
  type Medication,
} from './utils'

// ---------------------------------------------------------------------------
// buildMedicationSchedule
// ---------------------------------------------------------------------------

describe('Treatment Utils - buildMedicationSchedule', () => {
  const baseMed: Medication = {
    name: 'Augmentin',
    frequency: '2',
    days: '5',
    dose: '1 Tablet',
    trackEnd: false,
  }

  it('should generate one entry per day for the given duration', () => {
    const result = buildMedicationSchedule(baseMed, 'pet-uuid', '2026-01-01')
    expect(result).toHaveLength(5)
    expect(result[0].due_date).toBe('2026-01-01')
    expect(result[4].due_date).toBe('2026-01-05')
  })

  it('every entry should have plan_type "medication" and source "treatment_medication"', () => {
    const result = buildMedicationSchedule(baseMed, 'pet-uuid', '2026-01-01')
    result.forEach(e => {
      expect(e.plan_type).toBe('medication')
      expect(e.source).toBe('treatment_medication')
      expect(e.status).toBe('upcoming')
    })
  })

  it('title should include medication name and dose', () => {
    const result = buildMedicationSchedule(baseMed, 'pet-uuid', '2026-01-01')
    expect(result[0].title).toContain('Augmentin')
    expect(result[0].title).toContain('1 Tablet')
  })

  it('should append a "stock check" entry when trackEnd is true', () => {
    const med: Medication = { ...baseMed, trackEnd: true }
    const result = buildMedicationSchedule(med, 'pet-uuid', '2026-01-01')
    // 5 daily + 1 end-of-stock = 6 entries
    expect(result).toHaveLength(6)
    const endEntry = result[5]
    expect(endEntry.plan_type).toBe('checkup')
    expect(endEntry.source).toBe('treatment_med_end')
    expect(endEntry.due_date).toBe('2026-01-05')
    expect(endEntry.title).toContain('Augmentin')
    expect(endEntry.title).toContain('Bitiyor')
  })

  it('should NOT append a stock-check entry when trackEnd is false', () => {
    const result = buildMedicationSchedule(baseMed, 'pet-uuid', '2026-01-01')
    expect(result.find(e => e.plan_type === 'checkup')).toBeUndefined()
  })

  it('should generate exactly 1 entry for a 1-day duration', () => {
    const med: Medication = { ...baseMed, days: '1' }
    const result = buildMedicationSchedule(med, 'pet-uuid', '2026-06-15')
    expect(result).toHaveLength(1)
    expect(result[0].due_date).toBe('2026-06-15')
  })
})

// ---------------------------------------------------------------------------
// shouldCreatePayment
// ---------------------------------------------------------------------------

describe('Treatment Utils - shouldCreatePayment', () => {
  const base = {
    status: 'Tamamlandı',
    cost: '250',
    paymentStatus: 'Ödendi',
    editingTreatment: null,
  }

  it('should return true for a new completed & paid treatment', () => {
    expect(shouldCreatePayment(base)).toBe(true)
  })

  it('should return false when status is not "Tamamlandı"', () => {
    expect(shouldCreatePayment({ ...base, status: 'Devam Ediyor' })).toBe(false)
  })

  it('should return false when cost is 0', () => {
    expect(shouldCreatePayment({ ...base, cost: '0' })).toBe(false)
  })

  it('should return false when cost is empty string', () => {
    expect(shouldCreatePayment({ ...base, cost: '' })).toBe(false)
  })

  it('should return false when paymentStatus is "Borçlu"', () => {
    expect(shouldCreatePayment({ ...base, paymentStatus: 'Borçlu' })).toBe(false)
  })

  it('should return false when editing an already-completed treatment (duplicate guard)', () => {
    expect(
      shouldCreatePayment({
        ...base,
        editingTreatment: { status: 'Tamamlandı' },
      })
    ).toBe(false)
  })

  it('should return true when editing and status changes TO "Tamamlandı"', () => {
    expect(
      shouldCreatePayment({
        ...base,
        editingTreatment: { status: 'Devam Ediyor' },
      })
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// resolveDiseaseLabel
// ---------------------------------------------------------------------------

describe('Treatment Utils - resolveDiseaseLabel', () => {
  it('should return the selected disease name for a standard choice', () => {
    expect(resolveDiseaseLabel('Kulak Enfeksiyonu (Otitis)', '')).toBe(
      'Kulak Enfeksiyonu (Otitis)'
    )
  })

  it('should return the custom disease name when "Diğer" is selected', () => {
    expect(resolveDiseaseLabel('Diğer', 'Piroplasmosis')).toBe('Piroplasmosis')
  })

  it('should trim whitespace from custom disease name', () => {
    expect(resolveDiseaseLabel('Diğer', '  Özel Hastalık  ')).toBe('Özel Hastalık')
  })
})
