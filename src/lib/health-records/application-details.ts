import { z } from 'zod'

export const administrationPlaceSchema = z.enum([
  'home',
  'veterinary_clinic',
  'agriculture_directorate',
  'municipality',
  'other',
])

const optionalText = z.string().trim().max(500).nullable().optional()
const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Geçersiz tarih')
  .nullable()
  .optional()

export const applicationDetailsSchema = z
  .object({
    brand: optionalText,
    product_name: optionalText,
    lot_number: optionalText,
    product_expiry_at: optionalDate,
    administration_place: administrationPlaceSchema.nullable().optional(),
    institution_name: optionalText,
    provider_name: optionalText,
    amount: z.number().finite().min(0).max(10_000_000).nullable().optional(),
    currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
    product_notes: optionalText,
    reaction_observed: optionalText,
    document_storage_path: optionalText,
    administration_route: optionalText,
    application_method: optionalText,
    applied_dose: optionalText,
    active_ingredient: optionalText,
    protection_duration_days: z.number().int().positive().max(3650).nullable().optional(),
  })
  .strict()

export type ApplicationDetails = z.infer<typeof applicationDetailsSchema>

export const EMPTY_APPLICATION_DETAILS: ApplicationDetails = {
  currency: 'TRY',
}

export function hasApplicationDetails(value: ApplicationDetails | null | undefined): boolean {
  if (!value) return false

  return Object.entries(value).some(([key, fieldValue]) => {
    if (key === 'currency') return false
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
  })
}

