import { z } from 'zod'

export const lostReportSessionIdSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)

export const lostReportLocationSchema = z.discriminatedUnion('isManual', [
  z.object({
    isManual: z.literal(true),
    address: z.string().trim().min(5).max(500),
  }),
  z.object({
    isManual: z.literal(false),
    lat: z.number().finite().min(35.8089).max(42.1081),
    lng: z.number().finite().min(25.6638).max(44.8224),
    address: z.string().trim().min(5).max(500).optional(),
  }),
])

const lostReportPhotoSchema = z.union([
  z.object({
    skipped: z.literal(true),
  }),
  z.object({
    photoUrl: z.string().url(),
    path: z.string().min(1).max(500).optional(),
  }),
])

export const lostReportPublishPayloadSchema = z.object({
  petId: z.string().uuid(),
  location: lostReportLocationSchema,
  contactPhone: z.string().min(10).max(24),
  photo: lostReportPhotoSchema.optional(),
  lastSeenAt: z.string().datetime().optional(),
})

export function normalizeTurkishPhone(input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (digits.length === 10 && digits.startsWith('5')) {
    return `+90${digits}`
  }

  if (digits.length === 11 && digits.startsWith('05')) {
    return `+90${digits.slice(1)}`
  }

  if (digits.length === 12 && digits.startsWith('905')) {
    return `+${digits}`
  }

  return null
}

export function getLostReportLocationText(
  location: z.infer<typeof lostReportLocationSchema>
): string {
  if (location.isManual) return location.address
  if (location.address) return location.address
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
}
