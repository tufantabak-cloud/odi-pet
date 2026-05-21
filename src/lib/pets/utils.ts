/**
 * Calculates the age of a pet based on birth date and returns human-readable text and group label.
 * Grouping follows the project rules:
 * - Yavru: 0 - 1 age
 * - Yetişkin: 1 - 7 age
 * - Yaşlı: 7 - 12 age
 * - Yaşlı (12+): 12+ age
 */
export function calcAge(birthDate: string | null) {
  if (!birthDate) return { text: '—', label: '—' }
  
  const born = new Date(birthDate)
  const today = new Date()
  
  if (isNaN(born.getTime())) {
    return { text: '—', label: '—' }
  }

  // If the birth date is in the future (invalid but possible data)
  if (born > today) {
    return { text: '0 gün', label: 'Yavru' }
  }

  let years = today.getFullYear() - born.getFullYear()
  let months = today.getMonth() - born.getMonth()
  let days = today.getDate() - born.getDate()

  if (days < 0) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    const prevMonthDays = prevMonth.getDate()
    const effectiveBornDay = Math.min(born.getDate(), prevMonthDays)
    days = today.getDate() - effectiveBornDay
    if (days < 0) {
      days += prevMonthDays
    }
    months--
  }

  if (months < 0) {
    months += 12
    years--
  }

  const parts = []
  if (years > 0) parts.push(`${years} yıl`)
  if (months > 0) parts.push(`${months} ay`)
  if (days > 0) parts.push(`${days} gün`)

  const text = parts.join(', ') || '0 gün'

  // Köpek & Kedi yaş gruplandırması:
  // - Yavru: 0 - 1 yaş (yaş < 1 yani years === 0 ise)
  // - Yetişkin: 1 - 7 yaş (1 <= years < 7)
  // - Yaşlı: 7 - 12 yaş (7 <= years < 12)
  // - Yaşlı (12+): 12+ yaş (years >= 12)
  let label = 'Yavru'
  if (years === 0) {
    label = 'Yavru'
  } else if (years >= 1 && years < 7) {
    label = 'Yetişkin'
  } else if (years >= 7 && years < 12) {
    label = 'Yaşlı'
  } else if (years >= 12) {
    label = 'Yaşlı (12+)'
  }

  return { text, label }
}

