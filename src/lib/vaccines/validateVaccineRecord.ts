/**
 * Y.2 — Merkezi Aşı Doğrulama Katmanı (Vaccine Record Validation Engine)
 *
 * Aşı kayıtlarının tutarlı, eksiksiz ve hatasız olmasını sağlar.
 * Kullanıcı, OCR ve API kaynaklı tüm girdiler bu tek doğrulama katmanından geçer.
 */

import { normalizeConfidenceLevel } from './confidenceLevels'

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidateVaccineRecordInput {
  pet_id?: string | null
  vaccine_code?: string | null
  vaccine_name?: string | null
  administered_at?: string | null
  next_due_at?: string | null
  valid_until?: string | null
  lot_number?: string | null
  brand_id?: string | null
  brand_free_text?: string | null
  confidence_level?: string | null
  administration_route?: string | null
}

/**
 * Aşı kaydı oluşturma/güncelleme öncesinde tüm iş kurallarını doğrular.
 * Fatal hatalar `errors` dizisine, bilgilendirme amaçlı uyarılar `warnings` dizisine yazılır.
 */
export function validateVaccineRecord(input: ValidateVaccineRecordInput): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // 1. pet_id kontrolü
  if (!input.pet_id || !input.pet_id.trim()) {
    errors.push({
      field: 'pet_id',
      message: 'Evcil hayvan seçimi zorunludur.',
      code: 'MISSING_PET_ID',
    })
  }

  // 2. vaccine_name veya vaccine_code kontrolü
  const hasCode = Boolean(input.vaccine_code?.trim())
  const hasName = Boolean(input.vaccine_name?.trim())

  if (!hasCode && !hasName) {
    errors.push({
      field: 'vaccine_code',
      message: 'Aşı adı veya protokol kodu zorunludur.',
      code: 'MISSING_VACCINE_IDENTIFIER',
    })
  }

  // 3. Tarih doğrulamaları
  const now = new Date()
  let adminDate: Date | null = null

  if (input.administered_at) {
    adminDate = new Date(input.administered_at)
    if (isNaN(adminDate.getTime())) {
      errors.push({
        field: 'administered_at',
        message: 'Geçersiz uygulama tarihi.',
        code: 'INVALID_ADMINISTERED_DATE',
      })
    } else {
      // Gelecek tarih kontrolü (+24 saat tolerans)
      const futureThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      if (adminDate > futureThreshold) {
        errors.push({
          field: 'administered_at',
          message: 'Uygulama tarihi gelecek bir tarih olamaz.',
          code: 'FUTURE_ADMINISTERED_DATE',
        })
      }
    }
  }

  if (input.next_due_at) {
    const nextDueDate = new Date(input.next_due_at)
    if (isNaN(nextDueDate.getTime())) {
      errors.push({
        field: 'next_due_at',
        message: 'Geçersiz sonraki doz tarihi.',
        code: 'INVALID_NEXT_DUE_DATE',
      })
    } else if (adminDate && !isNaN(adminDate.getTime()) && nextDueDate < adminDate) {
      errors.push({
        field: 'next_due_at',
        message: 'Sonraki doz tarihi uygulama tarihinden önce olamaz.',
        code: 'NEXT_DUE_BEFORE_ADMINISTERED',
      })
    }
  }

  if (input.valid_until) {
    const validUntilDate = new Date(input.valid_until)
    if (isNaN(validUntilDate.getTime())) {
      errors.push({
        field: 'valid_until',
        message: 'Geçersiz geçerlilik sonu tarihi.',
        code: 'INVALID_VALID_UNTIL_DATE',
      })
    } else if (adminDate && !isNaN(adminDate.getTime()) && validUntilDate < adminDate) {
      errors.push({
        field: 'valid_until',
        message: 'Geçerlilik sonu tarihi uygulama tarihinden önce olamaz.',
        code: 'VALID_UNTIL_BEFORE_ADMINISTERED',
      })
    }
  }

  // 4. Confidence level doğrulaması
  if (input.confidence_level) {
    const normalized = normalizeConfidenceLevel(input.confidence_level)
    if (normalized !== input.confidence_level) {
      warnings.push({
        field: 'confidence_level',
        message: `Confidence level '${input.confidence_level}' canonical '${normalized}' değerine normalize edildi.`,
        code: 'CONFIDENCE_NORMALIZED',
      })
    }
  }

  // 5. Uyarılar (Fatal olmayan durumlar)
  if (!input.lot_number?.trim()) {
    warnings.push({
      field: 'lot_number',
      message: 'Seri/lot numarası girilmedi.',
      code: 'MISSING_LOT_NUMBER',
    })
  }

  if (!input.brand_id && !input.brand_free_text?.trim()) {
    warnings.push({
      field: 'brand',
      message: 'Aşı üreticisi/markası belirtilmedi.',
      code: 'MISSING_BRAND_INFO',
    })
  }

  if (!input.valid_until && !input.next_due_at) {
    warnings.push({
      field: 'valid_until',
      message: 'Geçerlilik veya sonraki doz tarihi girilmedi.',
      code: 'MISSING_EXPIRY_INFO',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
