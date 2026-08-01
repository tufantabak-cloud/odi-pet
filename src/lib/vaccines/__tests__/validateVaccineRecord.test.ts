import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { validateVaccineRecord } from '../validateVaccineRecord'
import { createVaccineRecord } from '../createVaccineRecord'

describe('Sprint Y.2 — validateVaccineRecord Engine', () => {
  it('passes validation for a clean, valid vaccine record', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_code: 'RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-05-10',
      next_due_at: '2027-05-10',
      lot_number: 'LOT-9988',
      brand_free_text: 'Nobivac',
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails validation when pet_id is missing', () => {
    const result = validateVaccineRecord({
      pet_id: '',
      vaccine_code: 'RABIES',
      vaccine_name: 'Kuduz Aşısı',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_PET_ID' }),
      ])
    )
  })

  it('fails validation when both vaccine_code and vaccine_name are missing', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_code: '',
      vaccine_name: '   ',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_VACCINE_IDENTIFIER' }),
      ])
    )
  })

  it('fails validation for a future administered_at date', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: futureDate,
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FUTURE_ADMINISTERED_DATE' }),
      ])
    )
  })

  it('fails validation when next_due_at is before administered_at', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_name: 'Karma Aşı',
      administered_at: '2026-05-10',
      next_due_at: '2026-01-01',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NEXT_DUE_BEFORE_ADMINISTERED' }),
      ])
    )
  })

  it('fails validation when valid_until is before administered_at', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_name: 'Karma Aşı',
      administered_at: '2026-05-10',
      valid_until: '2025-12-31',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'VALID_UNTIL_BEFORE_ADMINISTERED' }),
      ])
    )
  })

  it('generates non-fatal warnings for missing optional details', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_name: 'Karma Aşı',
      administered_at: '2026-05-10',
      // Missing lot_number, brand, and valid_until
    })

    expect(result.valid).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_LOT_NUMBER' }),
        expect.objectContaining({ code: 'MISSING_BRAND_INFO' }),
        expect.objectContaining({ code: 'MISSING_EXPIRY_INFO' }),
      ])
    )
  })

  it('generates warning when confidence_level requires normalization', () => {
    const result = validateVaccineRecord({
      pet_id: 'pet-123',
      vaccine_name: 'Karma Aşı',
      confidence_level: 'ocr',
    })

    expect(result.valid).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CONFIDENCE_NORMALIZED' }),
      ])
    )
  })

  it('createVaccineRecord blocks database insert when validation fails', async () => {
    const mockInsert = vi.fn()
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    const supabase = { from: mockFrom } as unknown as SupabaseClient<Database>

    const response = await createVaccineRecord(supabase, {
      pet_id: 'pet-123',
      vaccine_name: 'Karma Aşı',
      administered_at: '2026-05-10',
      next_due_at: '2025-01-01', // Invalid date order
    })

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error).toContain('Sonraki doz tarihi uygulama tarihinden önce olamaz.')
      expect(response.code).toBe('NEXT_DUE_BEFORE_ADMINISTERED')
    }

    // Database should NOT have been called
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
