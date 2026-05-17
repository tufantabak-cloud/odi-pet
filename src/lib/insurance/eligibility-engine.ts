// ──────────────────────────────────────────────────────────
// Insurance Eligibility Rule Engine
// Segment: HIGH_ELIGIBILITY | REVIEW_NEEDED | HIGH_RISK
// ──────────────────────────────────────────────────────────

export type InsuranceSegment = 'HIGH_ELIGIBILITY' | 'REVIEW_NEEDED' | 'HIGH_RISK'

export interface InsuranceInput {
  // Core health metrics
  preventiveComplianceScore: number   // 0–100
  incidentCount: number               // diseases/injuries
  chronicConditionCount: number       // is_chronic = true records
  careConsistencyScore: number        // 0–100 (daily score avg)
  householdReliabilityScore: number   // 0–100 from predictive engine

  // Hard-rule inputs
  hasRabiesVaccine: boolean
  ageKnown: boolean
  profileComplete: boolean            // name + species + breed + birth_date
  recentCriticalIncident: boolean     // severe incident <30d
  incidentCountLast6Months: number
  missingVaccineHistory: boolean

  // Pet context
  petName: string
  species: string
}

export interface InsuranceResult {
  insuranceScore: number
  segment: InsuranceSegment
  reasons: string[]
  hardFlags: string[]
  positives: string[]
  nextActions: string[]
}

// ── Formula weights ──────────────────────────────────────
export function computeInsuranceEligibility(input: InsuranceInput): InsuranceResult {
  const reasons: string[] = []
  const positives: string[] = []
  const hardFlags: string[] = []
  const nextActions: string[] = []

  // ── Step 1: Base score ──────────────────────────────
  // Weights sum to 1.0: high-compliance pets can genuinely reach HIGH_ELIGIBILITY (score >= 80)
  let score =
    (input.preventiveComplianceScore * 0.45) +
    (input.careConsistencyScore       * 0.30) +
    (input.householdReliabilityScore  * 0.25)

  // Deductions
  score -= input.incidentCount         * 8
  score -= input.chronicConditionCount * 15

  // Clamp 0–100
  score = Math.max(0, Math.min(100, Math.round(score)))

  // ── Step 2: Positive signals ────────────────────────
  if (input.preventiveComplianceScore >= 80) {
    positives.push('Koruyucu bakım geçmişi mükemmel')
  } else if (input.preventiveComplianceScore >= 50) {
    positives.push('Koruyucu bakım geçmişi yeterli')
  }
  if (input.hasRabiesVaccine)   positives.push('Kuduz aşısı güncel')
  if (input.incidentCount === 0) positives.push('Kayıtlı hastalık/kaza geçmişi yok')
  if (input.incidentCount <= 1 && input.incidentCount > 0) positives.push('Düşük olay geçmişi')
  if (input.careConsistencyScore >= 75) positives.push('Bakım tutarlılığı yüksek')
  if (input.householdReliabilityScore >= 70) positives.push('Ev bakım ekibi güvenilir')

  // ── Step 3: Negative reasons ────────────────────────
  if (!input.hasRabiesVaccine)   reasons.push('Kuduz aşısı eksik veya belirsiz')
  if (input.missingVaccineHistory) reasons.push('Aşı geçmişi yetersiz')
  if (input.incidentCount >= 3)  reasons.push('Sık tekrarlayan olay geçmişi')
  if (input.chronicConditionCount >= 1) reasons.push(`${input.chronicConditionCount} kronik sağlık durumu mevcut`)
  if (input.careConsistencyScore < 40) reasons.push('Bakım tutarsızlığı tespit edildi')
  if (input.recentCriticalIncident)    reasons.push('Son 30 günde kritik bir olay yaşandı')
  if (!input.profileComplete)   reasons.push('Profil eksik (ırk, doğum tarihi, cins)')

  // ── Step 4: Next actions ────────────────────────────
  if (!input.hasRabiesVaccine)   nextActions.push('Kuduz aşısını kayıt altına alın')
  if (!input.profileComplete)    nextActions.push('Pet profilini tamamlayın')
  if (input.missingVaccineHistory) nextActions.push('Geçmiş aşı kayıtlarını yükleyin')
  if (input.careConsistencyScore < 60) nextActions.push('Günlük bakım rutinini güçlendirin')
  if (input.chronicConditionCount > 0) nextActions.push('Kronik durumlar için vet raporu yükleyin')

  // ── Step 5: Hard-rule overrides ─────────────────────
  let segment: InsuranceSegment

  // AUTO HIGH_RISK
  if (input.incidentCountLast6Months >= 3 || input.chronicConditionCount >= 3) {
    hardFlags.push(
      ...[
        input.incidentCountLast6Months >= 3 ? 'Son 6 ayda 3+ olay' : '',
        input.chronicConditionCount >= 3    ? '3+ kronik hastalık' : '',
      ].filter(Boolean)
    )
    segment = 'HIGH_RISK'
    score = Math.min(score, 40)

  // FORCED REVIEW
  } else if (
    !input.hasRabiesVaccine ||
    !input.ageKnown ||
    !input.profileComplete ||
    input.recentCriticalIncident
  ) {
    if (!input.hasRabiesVaccine) hardFlags.push('Kuduz aşısı eksik')
    if (!input.ageKnown)         hardFlags.push('Yaş bilgisi bilinmiyor')
    if (!input.profileComplete)  hardFlags.push('Profil tamamlanmamış')
    if (input.recentCriticalIncident) hardFlags.push('Son 30 günde kritik olay')
    segment = 'REVIEW_NEEDED'
    score = Math.min(score, 72)

  // Formula-driven
  } else {
    segment = score >= 80 ? 'HIGH_ELIGIBILITY' : score >= 55 ? 'REVIEW_NEEDED' : 'HIGH_RISK'
  }

  return { insuranceScore: score, segment, reasons, hardFlags, positives, nextActions }
}
