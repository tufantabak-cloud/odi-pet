export interface BarcodeScanResult {
  text: string
  format?: string
  isMicrochip: boolean
  isPassportNo: boolean
}

/**
 * Validates 15-digit standard ISO 11784/11785 microchip number structure.
 * 
 * Rules:
 * A. Exactly 15 decimal digits (^\d{15}$)
 * B. Prefix 000 is invalid (unassigned)
 * C. Prefix 999 is invalid (test/sample transponders)
 * 
 * Terminology / Status:
 * STRUCTURALLY VALID, DOMAIN VALIDATION NOT PROVEN.
 * (Prefixes 001-899 are country-code candidates; 900-998 are manufacturer-code candidates.
 * Full domain validation requires an authoritative external ISO 3166 / ICAR lookup table).
 */
export function isValidMicrochipNo(value: string): boolean {
  if (!value) return false
  const clean = value.replace(/\s+/g, '')
  if (!/^\d{15}$/.test(clean)) return false

  const prefix = clean.substring(0, 3)
  if (prefix === '000' || prefix === '999') {
    return false
  }

  return true
}

/**
 * Validates T.C. Pet Passport number format (e.g. TR-06-123456 or 6-12 alphanumeric characters)
 */
export function isValidPassportNo(value: string): boolean {
  if (!value) return false
  const clean = value.replace(/\s+/g, '').toUpperCase()
  // Matches formats like TR-34-12345, TR3412345, or alphanumeric 6-16 chars
  return /^[A-Z0-9\-_]{6,18}$/.test(clean)
}

/**
 * Classifies raw barcode text
 */
export function classifyBarcodeText(rawText: string): BarcodeScanResult {
  const clean = rawText.trim()
  const isMicrochip = isValidMicrochipNo(clean)
  const isPassportNo = !isMicrochip && isValidPassportNo(clean)

  return {
    text: clean,
    isMicrochip,
    isPassportNo,
  }
}

/**
 * Attempts to decode barcode from an image file or blob on client side.
 * Uses dynamic import for html5-qrcode to prevent SSR breakage.
 */
export async function scanBarcodeFromImage(imageFile: File): Promise<BarcodeScanResult | null> {
  if (typeof window === 'undefined') return null

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    const html5QrCode = new Html5Qrcode('qr-reader-temp-anchor', {
      verbose: false,
      formatsToSupport: [
        0, // QR_CODE
        2, // CODE_39
        3, // CODE_93
        4, // CODE_128
        5, // DATA_MATRIX
        6, // EAN_8
        7, // EAN_13
        8, // ITF
      ],
    })

    const decodedText = await html5QrCode.scanFile(imageFile, false)
    await html5QrCode.clear()

    if (decodedText) {
      return classifyBarcodeText(decodedText)
    }
  } catch {
    // Normal case when image does not contain a decipherable barcode
  }

  return null
}
