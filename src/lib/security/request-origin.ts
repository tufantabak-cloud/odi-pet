export type SameOriginValidation =
  | { valid: true }
  | { valid: false; reason: 'missing' | 'malformed' | 'mismatch' }

export function validateSameOriginHeaders(headers: Headers): SameOriginValidation {
  const source = headers.get('origin') ?? headers.get('referer')
  const host = headers.get('host')

  if (!source || !host) {
    return { valid: false, reason: 'missing' }
  }

  try {
    const sourceUrl = new URL(source)
    if (sourceUrl.host !== host) {
      return { valid: false, reason: 'mismatch' }
    }
  } catch {
    return { valid: false, reason: 'malformed' }
  }

  return { valid: true }
}
