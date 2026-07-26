const FALLBACK_REDIRECT = '/owner/dashboard'

export function getSafeRelativeRedirect(
  rawValue: string | null | undefined,
  fallback = FALLBACK_REDIRECT
): string {
  if (
    !rawValue
    || !rawValue.startsWith('/')
    || rawValue.startsWith('//')
    || rawValue.includes('\\')
  ) {
    return fallback
  }

  try {
    const base = new URL('https://odi.invalid')
    const candidate = new URL(rawValue, base)

    if (candidate.origin !== base.origin) {
      return fallback
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`
  } catch {
    return fallback
  }
}
