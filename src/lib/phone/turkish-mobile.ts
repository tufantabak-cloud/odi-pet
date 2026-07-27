const TURKISH_MOBILE_LOCAL_DIGITS = /^5\d{9}$/

function getLocalMobileDigits(input: string): string {
  const digits = input.replace(/\D/g, '')

  if (digits.startsWith('0090')) return digits.slice(4)
  if (digits.startsWith('90')) return digits.slice(2)
  if (digits.startsWith('0')) return digits.slice(1)

  return digits
}

export function formatTurkishMobileInput(input: string): string {
  const localDigits = getLocalMobileDigits(input).slice(0, 10)
  if (!localDigits) return ''

  const groups = [
    localDigits.slice(0, 3),
    localDigits.slice(3, 6),
    localDigits.slice(6, 8),
    localDigits.slice(8, 10),
  ].filter(Boolean)

  return `0${groups.join(' ')}`
}

export function normalizeTurkishMobilePhone(input: string): string | null {
  const localDigits = getLocalMobileDigits(input)
  return TURKISH_MOBILE_LOCAL_DIGITS.test(localDigits)
    ? `+90${localDigits}`
    : null
}

export function isTurkishMobilePhone(input: string): boolean {
  return normalizeTurkishMobilePhone(input) !== null
}
