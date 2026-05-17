import { describe, it, expect } from 'vitest'
import { computeInsuranceEligibility, type InsuranceInput } from './eligibility-engine'

// ---------------------------------------------------------------------------
// Shared factory for a "perfect" pet profile
// ---------------------------------------------------------------------------

const perfectProfile: InsuranceInput = {
  preventiveComplianceScore: 95,
  incidentCount: 0,
  chronicConditionCount: 0,
  careConsistencyScore: 90,
  householdReliabilityScore: 85,
  hasRabiesVaccine: true,
  ageKnown: true,
  profileComplete: true,
  recentCriticalIncident: false,
  incidentCountLast6Months: 0,
  missingVaccineHistory: false,
  petName: 'Odi',
  species: 'dog',
}

// ---------------------------------------------------------------------------
// Segment assignment
// ---------------------------------------------------------------------------

describe('Insurance Engine - Segment Assignment', () => {
  it('should return HIGH_ELIGIBILITY for a perfect, healthy pet', () => {
    // New formula: 95*0.45 + 90*0.30 + 85*0.25 = 42.75+27+21.25 = 91 → HIGH_ELIGIBILITY
    const result = computeInsuranceEligibility(perfectProfile)
    expect(result.insuranceScore).toBeGreaterThanOrEqual(80)
    expect(result.segment).toBe('HIGH_ELIGIBILITY')
  })

  it('should reach max score of 100 for a mathematically perfect profile', () => {
    const maxResult = computeInsuranceEligibility({
      ...perfectProfile,
      preventiveComplianceScore: 100,
      careConsistencyScore: 100,
      householdReliabilityScore: 100,
    })
    // Max possible = 45 + 30 + 25 = 100
    expect(maxResult.insuranceScore).toBe(100)
    expect(maxResult.segment).toBe('HIGH_ELIGIBILITY')
  })

  it('should return HIGH_RISK when 3+ incidents in last 6 months (hard rule)', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      incidentCountLast6Months: 3,
    })
    expect(result.segment).toBe('HIGH_RISK')
    expect(result.insuranceScore).toBeLessThanOrEqual(40)
    expect(result.hardFlags).toContain('Son 6 ayda 3+ olay')
  })

  it('should return HIGH_RISK when 3+ chronic conditions (hard rule)', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      chronicConditionCount: 3,
    })
    expect(result.segment).toBe('HIGH_RISK')
    expect(result.hardFlags).toContain('3+ kronik hastalık')
  })

  it('should return REVIEW_NEEDED when rabies vaccine is missing', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      hasRabiesVaccine: false,
    })
    expect(result.segment).toBe('REVIEW_NEEDED')
    expect(result.hardFlags).toContain('Kuduz aşısı eksik')
    expect(result.insuranceScore).toBeLessThanOrEqual(72)
  })

  it('should return REVIEW_NEEDED when age is unknown', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      ageKnown: false,
    })
    expect(result.segment).toBe('REVIEW_NEEDED')
    expect(result.hardFlags).toContain('Yaş bilgisi bilinmiyor')
  })

  it('should return REVIEW_NEEDED when profile is incomplete', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      profileComplete: false,
    })
    expect(result.segment).toBe('REVIEW_NEEDED')
    expect(result.hardFlags).toContain('Profil tamamlanmamış')
  })

  it('should return REVIEW_NEEDED after a recent critical incident', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      recentCriticalIncident: true,
    })
    expect(result.segment).toBe('REVIEW_NEEDED')
    expect(result.hardFlags).toContain('Son 30 günde kritik olay')
  })

  it('should return HIGH_RISK via formula when score < 55 with no hard rules', () => {
    // Low scores + chronic conditions but below the hard-rule threshold of 3
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      preventiveComplianceScore: 10,
      careConsistencyScore: 10,
      householdReliabilityScore: 10,
      incidentCount: 5,
      chronicConditionCount: 2,
    })
    expect(result.segment).toBe('HIGH_RISK')
  })
})

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

describe('Insurance Engine - Score Calculation', () => {
  it('score should be clamped to 0 for extremely risky pets', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      preventiveComplianceScore: 0,
      careConsistencyScore: 0,
      householdReliabilityScore: 0,
      incidentCount: 20,
      chronicConditionCount: 10,
    })
    expect(result.insuranceScore).toBe(0)
  })

  it('score should be clamped to max 100', () => {
    const result = computeInsuranceEligibility(perfectProfile)
    expect(result.insuranceScore).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// Positive signals
// ---------------------------------------------------------------------------

describe('Insurance Engine - Positive Signals', () => {
  it('should list "Koruyucu bakım geçmişi mükemmel" when preventiveScore >= 80', () => {
    const result = computeInsuranceEligibility({ ...perfectProfile, preventiveComplianceScore: 85 })
    expect(result.positives).toContain('Koruyucu bakım geçmişi mükemmel')
  })

  it('should list "Koruyucu bakım geçmişi yeterli" when preventiveScore is 50–79', () => {
    const result = computeInsuranceEligibility({ ...perfectProfile, preventiveComplianceScore: 65 })
    expect(result.positives).toContain('Koruyucu bakım geçmişi yeterli')
  })

  it('should list "Kayıtlı hastalık/kaza geçmişi yok" for zero incidents', () => {
    const result = computeInsuranceEligibility({ ...perfectProfile, incidentCount: 0 })
    expect(result.positives).toContain('Kayıtlı hastalık/kaza geçmişi yok')
  })

  it('should list "Kuduz aşısı güncel" when rabies vaccine present', () => {
    const result = computeInsuranceEligibility(perfectProfile)
    expect(result.positives).toContain('Kuduz aşısı güncel')
  })
})

// ---------------------------------------------------------------------------
// Next actions
// ---------------------------------------------------------------------------

describe('Insurance Engine - Next Actions', () => {
  it('should suggest recording rabies vaccine when missing', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      hasRabiesVaccine: false,
    })
    expect(result.nextActions).toContain('Kuduz aşısını kayıt altına alın')
  })

  it('should suggest completing the profile when incomplete', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      profileComplete: false,
    })
    expect(result.nextActions).toContain('Pet profilini tamamlayın')
  })

  it('should suggest uploading past vaccines when history is missing', () => {
    const result = computeInsuranceEligibility({
      ...perfectProfile,
      missingVaccineHistory: true,
    })
    expect(result.nextActions).toContain('Geçmiş aşı kayıtlarını yükleyin')
  })
})
