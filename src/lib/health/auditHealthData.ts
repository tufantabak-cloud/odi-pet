/**
 * Y.3 — Health Data Integrity Audit Engine
 *
 * Üretim veritabanındaki evcil hayvan, aşı kaydı, aşı planı ve bildirim verilerini
 * salt okunur (read-only) taranarak tutarsızlıkları ve veri kalitesi sorunlarını raporlar.
 *
 * Bu modül KESİNLİKLE hiçbir INSERT, UPDATE veya DELETE işlemi yapmaz.
 */

import { CANONICAL_CONFIDENCE_LEVELS } from '../vaccines/confidenceLevels'

export interface AuditIssue {
  id: string
  category: 'vaccination' | 'plan' | 'notification' | 'pet'
  severity: 'error' | 'warning'
  code: string
  message: string
  metadata?: Record<string, unknown>
}

export interface HealthAuditResult {
  passed: boolean
  errors: AuditIssue[]
  warnings: AuditIssue[]
  statistics: {
    petsScanned: number
    vaccineRecords: number
    plans: number
    notifications: number
  }
}

export interface AuditInputData {
  pets?: Array<{
    id: string
    name?: string
    species?: string
    is_active?: boolean
    owner_id?: string | null
  }>
  pet_memberships?: Array<{
    pet_id: string
    profile_id: string
    role?: string
  }>
  vaccine_records?: Array<{
    id: string
    pet_id: string
    vaccine_code?: string
    vaccine_name?: string
    administered_at?: string | null
    next_due_at?: string | null
    confidence_level?: string | null
  }>
  vaccination_plans?: Array<{
    id: string
    pet_id: string
    vaccine_code: string
    status: 'pending' | 'completed' | 'cancelled' | 'overdue' | 'scheduled'
    due_date: string
    is_core?: boolean
    mandatory_level?: 'core' | 'legal_required' | 'optional'
  }>
  notifications?: Array<{
    id: string
    pet_id?: string | null
    plan_id?: string | null
    type: string
    status?: string
  }>
}

/**
 * Verilen evcil hayvan ve sağlık verileri kümesini denetler.
 * Salt okunur (pure function) olarak çalışır.
 */
export function auditHealthData(data: AuditInputData): HealthAuditResult {
  const errors: AuditIssue[] = []
  const warnings: AuditIssue[] = []

  const pets = data.pets ?? []
  const memberships = data.pet_memberships ?? []
  const vaccineRecords = data.vaccine_records ?? []
  const plans = data.vaccination_plans ?? []
  const notifications = data.notifications ?? []

  // Hızlı erişim Set & Map yapıları
  const petIdSet = new Set(pets.map(p => p.id))
  const petOwnersSet = new Set(memberships.map(m => m.pet_id))
  const petInactiveSet = new Set(pets.filter(p => p.is_active === false).map(p => p.id))

  const planIdSet = new Set(plans.map(p => p.id))
  const planByIdMap = new Map(plans.map(p => [p.id, p]))

  // ── 1. PET DENETİMİ ────────────────────────────────────────────────────────
  for (const pet of pets) {
    // 1.1 Owner/Membership var mı?
    if (!pet.owner_id && !petOwnersSet.has(pet.id)) {
      errors.push({
        id: `pet-no-owner-${pet.id}`,
        category: 'pet',
        severity: 'error',
        code: 'PET_WITHOUT_OWNER',
        message: `Pet '${pet.name || pet.id}' (${pet.id}) bir malike (owner/membership) sahip değil.`,
        metadata: { pet_id: pet.id, pet_name: pet.name },
      })
    }
  }

  // 1.2 Inactive pet üzerinde aktif (pending/scheduled) plan var mı?
  for (const plan of plans) {
    if (petInactiveSet.has(plan.pet_id) && (plan.status === 'pending' || plan.status === 'scheduled' || plan.status === 'overdue')) {
      warnings.push({
        id: `plan-inactive-pet-${plan.id}`,
        category: 'pet',
        severity: 'warning',
        code: 'ACTIVE_PLAN_ON_INACTIVE_PET',
        message: `Pasif evcil hayvan (${plan.pet_id}) üzerinde aktif aşı planı (${plan.id}) bulunuyor.`,
        metadata: { plan_id: plan.id, pet_id: plan.pet_id },
      })
    }
  }

  // ── 2. VACCINATION DENETİMİ ────────────────────────────────────────────────
  const seenVaccineDuplicates = new Map<string, string>()

  for (const record of vaccineRecords) {
    // 2.1 Orphan vaccine record (pet_id DB'de yok)
    if (!record.pet_id || !petIdSet.has(record.pet_id)) {
      errors.push({
        id: `vaccine-orphan-${record.id}`,
        category: 'vaccination',
        severity: 'error',
        code: 'ORPHAN_VACCINE_RECORD',
        message: `Aşı kaydı (${record.id}) mevcut olmayan bir pet_id'ye (${record.pet_id}) bağlı.`,
        metadata: { record_id: record.id, pet_id: record.pet_id },
      })
    }

    // 2.2 Confidence level kanonik mi?
    if (record.confidence_level) {
      const isCanonical = (CANONICAL_CONFIDENCE_LEVELS as readonly string[]).includes(record.confidence_level)
      if (!isCanonical) {
        warnings.push({
          id: `vaccine-non-canonical-confidence-${record.id}`,
          category: 'vaccination',
          severity: 'warning',
          code: 'NON_CANONICAL_CONFIDENCE_LEVEL',
          message: `Aşı kaydı (${record.id}) kanonik olmayan confidence_level ('${record.confidence_level}') taşıyor.`,
          metadata: { record_id: record.id, confidence_level: record.confidence_level },
        })
      }
    }

    // 2.3 Invalid date order (next_due < administered_at)
    if (record.administered_at && record.next_due_at) {
      const adminDate = new Date(record.administered_at)
      const nextDueDate = new Date(record.next_due_at)
      if (!isNaN(adminDate.getTime()) && !isNaN(nextDueDate.getTime()) && nextDueDate < adminDate) {
        errors.push({
          id: `vaccine-invalid-date-order-${record.id}`,
          category: 'vaccination',
          severity: 'error',
          code: 'VACCINE_INVALID_DATE_ORDER',
          message: `Aşı kaydında (${record.id}) sonraki doz tarihi (${record.next_due_at}) uygulama tarihinden (${record.administered_at}) öncedir.`,
          metadata: { record_id: record.id, administered_at: record.administered_at, next_due_at: record.next_due_at },
        })
      }
    }

    // 2.4 Duplicate vaccine kayıt kontrolü (aynı pet + aynı vaccine_code + aynı administered_at)
    if (record.pet_id && record.vaccine_code && record.administered_at) {
      const key = `${record.pet_id}:${record.vaccine_code}:${record.administered_at.substring(0, 10)}`
      if (seenVaccineDuplicates.has(key)) {
        warnings.push({
          id: `vaccine-duplicate-${record.id}`,
          category: 'vaccination',
          severity: 'warning',
          code: 'DUPLICATE_VACCINE_RECORD',
          message: `Pet (${record.pet_id}) için aynı tarihte (${record.administered_at}) mükerrer aşı kaydı (${record.vaccine_code}) tespit edildi.`,
          metadata: { record_id: record.id, first_record_id: seenVaccineDuplicates.get(key) },
        })
      } else {
        seenVaccineDuplicates.set(key, record.id)
      }
    }
  }

  // ── 3. PLAN DENETİMİ ───────────────────────────────────────────────────────
  const notifPlanSet = new Set(notifications.map(n => n.plan_id).filter(Boolean) as string[])
  const seenCompletedPlans = new Set<string>()

  // Evcil hayvan bazlı planlar
  const petPlansMap = new Map<string, typeof plans>()
  for (const p of plans) {
    const list = petPlansMap.get(p.pet_id) || []
    list.push(p)
    petPlansMap.set(p.pet_id, list)
  }

  for (const plan of plans) {
    // 3.1 Overdue plan notification var mı?
    if (plan.status === 'overdue') {
      if (!notifPlanSet.has(plan.id)) {
        warnings.push({
          id: `plan-overdue-no-notification-${plan.id}`,
          category: 'plan',
          severity: 'warning',
          code: 'OVERDUE_PLAN_MISSING_NOTIFICATION',
          message: `Günü geçmiş aşı planı (${plan.id}) için bildirim bulunamadı.`,
          metadata: { plan_id: plan.id, pet_id: plan.pet_id },
        })
      }
    }

    // 3.2 Mükerrer tamamlanmış plan kontrolü (aynı pet + aynı vaccine_code)
    if (plan.status === 'completed') {
      const key = `${plan.pet_id}:${plan.vaccine_code}`
      if (seenCompletedPlans.has(key)) {
        warnings.push({
          id: `plan-completed-duplicate-${plan.id}`,
          category: 'plan',
          severity: 'warning',
          code: 'DUPLICATE_COMPLETED_PLAN',
          message: `Pet (${plan.pet_id}) için birden fazla tamamlanmış '${plan.vaccine_code}' planı mevcut.`,
          metadata: { plan_id: plan.id, pet_id: plan.pet_id, vaccine_code: plan.vaccine_code },
        })
      } else {
        seenCompletedPlans.add(key)
      }
    }
  }

  // 3.3 Legal required (Kuduz) plan eksik mi?
  for (const pet of pets) {
    const petPlans = petPlansMap.get(pet.id) || []
    const rabiesCode = pet.species?.toLowerCase() === 'cat' ? 'CAT_RABIES' : 'DOG_RABIES'
    const hasRabiesPlan = petPlans.some(p => p.vaccine_code === rabiesCode || p.vaccine_code === 'RABIES')

    if (!hasRabiesPlan && (pet.species?.toLowerCase() === 'dog' || pet.species?.toLowerCase() === 'cat')) {
      warnings.push({
        id: `plan-missing-rabies-${pet.id}`,
        category: 'plan',
        severity: 'warning',
        code: 'MISSING_LEGAL_REQUIRED_PLAN',
        message: `Evcil hayvan (${pet.name || pet.id}) için zorunlu Kuduz planı (${rabiesCode}) oluşturulmamış.`,
        metadata: { pet_id: pet.id, species: pet.species },
      })
    }
  }

  // ── 4. NOTIFICATION DENETİMİ ───────────────────────────────────────────────
  const seenNotificationKeys = new Set<string>()

  for (const notif of notifications) {
    // 4.1 Orphan notification (gecersiz plan_id veya pet_id)
    if (notif.plan_id && !planIdSet.has(notif.plan_id)) {
      errors.push({
        id: `notification-orphan-plan-${notif.id}`,
        category: 'notification',
        severity: 'error',
        code: 'INVALID_PLAN_REFERENCE',
        message: `Bildirim (${notif.id}) silinmiş veya bulunmayan bir plan_id'ye (${notif.plan_id}) referans veriyor.`,
        metadata: { notification_id: notif.id, plan_id: notif.plan_id },
      })
    }

    if (notif.pet_id && !petIdSet.has(notif.pet_id)) {
      errors.push({
        id: `notification-orphan-pet-${notif.id}`,
        category: 'notification',
        severity: 'error',
        code: 'ORPHAN_NOTIFICATION_PET',
        message: `Bildirim (${notif.id}) mevcut olmayan bir pet_id'ye (${notif.pet_id}) referans veriyor.`,
        metadata: { notification_id: notif.id, pet_id: notif.pet_id },
      })
    }

    // 4.2 Duplicate notification (aynı plan_id + aynı type)
    if (notif.plan_id && notif.type) {
      const key = `${notif.plan_id}:${notif.type}`
      if (seenNotificationKeys.has(key)) {
        errors.push({
          id: `notification-duplicate-${notif.id}`,
          category: 'notification',
          severity: 'error',
          code: 'DUPLICATE_NOTIFICATION_INSERT',
          message: `Aynı plan (${notif.plan_id}) ve tip (${notif.type}) için mükerrer bildirim kaydı (${notif.id}) tespit edildi.`,
          metadata: { notification_id: notif.id, plan_id: notif.plan_id, type: notif.type },
        })
      } else {
        seenNotificationKeys.add(key)
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    statistics: {
      petsScanned: pets.length,
      vaccineRecords: vaccineRecords.length,
      plans: plans.length,
      notifications: notifications.length,
    },
  }
}
