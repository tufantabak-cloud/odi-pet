import { z } from 'zod'
import { isValidMicrochipNo, isValidPassportNo, BarcodeScanResult } from './barcode-scanner'
import {
  CoverExtraction,
  Page5Extraction,
  Page6Extraction,
  Page7Extraction,
} from './vision-gateway'

export const CONFIDENCE_THRESHOLD = 0.70

export type OCRDecisionStatus = 'MATCH' | 'CONFLICT' | 'UNKNOWN'

export interface FieldValidation {
  status: OCRDecisionStatus
  value: any
  message?: string
}

export interface CrossPageValidationResult {
  status: OCRDecisionStatus
  isValid: boolean
  canCommit: boolean
  conflicts: string[]
  warnings: string[]
  unifiedData: {
    name?: string
    species?: 'cat' | 'dog'
    breed?: string
    gender?: 'male' | 'female'
    birth_date?: string
    color?: string
    microchip_no?: string
    passport_no?: string
    implant_date?: string
    implant_location?: string
    vaccination_name?: string
    vaccination_date?: string
    valid_until?: string
    vet_name?: string
  }
}

// Zod schemas for rigorous server-side verification
export const PassportCoverSchema = z.object({
  passport_no: z.string().optional().nullable(),
  microchip_no: z.string().optional().nullable(),
})

export const Page5Schema = z.object({
  name: z.string().min(1, 'Hayvan adı zorunludur'),
  species: z.enum(['cat', 'dog'], {
    message: 'Tür yalnızca kedi (cat) veya köpek (dog) olabilir',
  }),
  breed: z.string().min(1, 'Irk bilgisi zorunludur'),
  gender: z.enum(['male', 'female']).optional().nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Doğum tarihi YYYY-MM-DD formatında olmalıdır').optional().nullable(),
  color: z.string().optional().nullable(),
})

export const Page6Schema = z.object({
  microchip_no: z.string().regex(/^\d{15}$/, 'Mikroçip numarası 15 haneli sayı olmalıdır').optional().nullable(),
  implant_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  implant_location: z.string().optional().nullable(),
})

export const Page7Schema = z.object({
  vaccination_name: z.string().optional().nullable(),
  vaccination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  veterinarian_name: z.string().optional().nullable(),
})

/**
 * Validates cross-page consistency across Cover, Page 5, Page 6, Page 7 and any scanned barcodes.
 * Enforces:
 * - Passport number consistency
 * - Microchip number consistency (Cover vs Page 6 vs Barcode)
 * - Species/Breed consistency
 * - Chronological date consistency (birth_date <= implant_date <= today)
 */
export function validateCrossPage(params: {
  cover?: CoverExtraction | null
  page_5?: Page5Extraction | null
  page_6?: Page6Extraction | null
  page_7?: Page7Extraction | null
  barcode?: BarcodeScanResult | null
  confidence?: number | null
}): CrossPageValidationResult {
  const { cover, page_5, page_6, page_7, barcode, confidence } = params
  const conflicts: string[] = []
  const warnings: string[] = []

  // 1. Resolve Microchip No & Cross-Page Match
  const microchipCandidates: { source: string; value: string }[] = []
  if (barcode?.isMicrochip && barcode.text) {
    microchipCandidates.push({ source: 'Barkod', value: barcode.text })
  }
  if (cover?.microchip_no) {
    microchipCandidates.push({ source: 'Kapak', value: cover.microchip_no.replace(/\s+/g, '') })
  }
  if (page_6?.microchip_no) {
    microchipCandidates.push({ source: 'Sayfa 6', value: page_6.microchip_no.replace(/\s+/g, '') })
  }

  let unifiedMicrochip: string | undefined = undefined
  if (microchipCandidates.length > 0) {
    const first = microchipCandidates[0].value
    const mismatch = microchipCandidates.find(c => c.value !== first)
    if (mismatch) {
      conflicts.push(
        `Mikroçip numarası sayfalar arasında çelişiyor: ${microchipCandidates[0].source} (${first}) ile ${mismatch.source} (${mismatch.value}) uyuşmuyor.`
      )
    } else {
      if (isValidMicrochipNo(first)) {
        unifiedMicrochip = first
      } else {
        warnings.push(`Algılanan mikroçip (${first}) standart 15 haneli formatta değil.`)
      }
    }
  }

  // 2. Resolve Passport No
  const passportCandidates: { source: string; value: string }[] = []
  if (barcode?.isPassportNo && barcode.text) {
    passportCandidates.push({ source: 'Barkod', value: barcode.text })
  }
  if (cover?.passport_no) {
    passportCandidates.push({ source: 'Kapak', value: cover.passport_no.trim() })
  }

  let unifiedPassportNo: string | undefined = undefined
  if (passportCandidates.length > 0) {
    const first = passportCandidates[0].value
    const mismatch = passportCandidates.find(c => c.value !== first)
    if (mismatch) {
      conflicts.push(
        `Pasaport numarası çelişiyor: ${passportCandidates[0].source} (${first}) ile ${mismatch.source} (${mismatch.value}) uyuşmuyor.`
      )
    } else {
      if (isValidPassportNo(first)) {
        unifiedPassportNo = first
      } else {
        warnings.push(`Pasaport numarası (${first}) standart formatla tam eşleşmiyor.`)
      }
    }
  }

  // 3. Page 5 Domain Rules
  const name = page_5?.name?.trim()
  const species = page_5?.species
  const breed = page_5?.breed?.trim()
  const gender = page_5?.gender
  const birthDateStr = page_5?.birth_date?.trim()
  const color = page_5?.color?.trim()

  if (!name) {
    warnings.push('Hayvan adı henüz okunamadı.')
  }
  if (!species || (species !== 'cat' && species !== 'dog')) {
    conflicts.push('Geçerli bir evcil hayvan türü (kedi veya köpek) tespit edilemedi.')
  }
  if (!breed) {
    warnings.push('Irk bilgisi henüz okunamadı.')
  }

  // 4. Chronological Date Consistency
  const now = new Date()
  let birthDate: Date | null = null

  if (birthDateStr) {
    const bDate = new Date(birthDateStr)
    if (isNaN(bDate.getTime())) {
      warnings.push('Doğum tarihi formatı anlaşılamadı.')
    } else if (bDate > now) {
      conflicts.push('Doğum tarihi bugünden ileri bir tarih olamaz.')
    } else {
      birthDate = bDate
    }
  }

  const implantDateStr = page_6?.implant_date?.trim()
  if (implantDateStr && birthDate) {
    const iDate = new Date(implantDateStr)
    if (!isNaN(iDate.getTime())) {
      if (iDate < birthDate) {
        conflicts.push('Mikroçip uygulama tarihi doğum tarihinden önce olamaz.')
      }
      if (iDate > now) {
        conflicts.push('Mikroçip uygulama tarihi gelecekte bir tarih olamaz.')
      }
    }
  }

  const vaccineDateStr = page_7?.vaccination_date?.trim()
  if (vaccineDateStr && birthDate) {
    const vDate = new Date(vaccineDateStr)
    if (!isNaN(vDate.getTime())) {
      if (vDate < birthDate) {
        conflicts.push('Aşı tarihi evcil hayvanın doğum tarihinden önce olamaz.')
      }
    }
  }

  // 5. Final Decision Calculation
  let status: OCRDecisionStatus = 'UNKNOWN'
  if (conflicts.length > 0) {
    status = 'CONFLICT'
  } else if (confidence !== undefined && confidence !== null && confidence < CONFIDENCE_THRESHOLD) {
    status = 'UNKNOWN'
    warnings.push(`AI okuma güven skoru (%${Math.round(confidence * 100)}) teyit eşiğinin altında kaldı. Lütfen bilgileri gözden geçiriniz.`)
  } else if (name && species && breed) {
    status = 'MATCH'
  } else {
    status = 'UNKNOWN'
  }

  const canCommit = status === 'MATCH' && conflicts.length === 0

  return {
    status,
    isValid: conflicts.length === 0,
    canCommit,
    conflicts,
    warnings,
    unifiedData: {
      name: name || undefined,
      species: (species === 'cat' || species === 'dog') ? species : undefined,
      breed: breed || undefined,
      gender: gender || undefined,
      birth_date: birthDateStr || undefined,
      color: color || undefined,
      microchip_no: unifiedMicrochip,
      passport_no: unifiedPassportNo,
      implant_date: implantDateStr || undefined,
      implant_location: page_6?.implant_location?.trim() || undefined,
      vaccination_name: page_7?.vaccination_name?.trim() || undefined,
      vaccination_date: vaccineDateStr || undefined,
      valid_until: page_7?.valid_until?.trim() || undefined,
      vet_name: page_7?.veterinarian_name?.trim() || undefined,
    },
  }
}
