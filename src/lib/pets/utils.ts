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
  
  // Total months difference
  const totalMonths = (today.getFullYear() - born.getFullYear()) * 12 + (today.getMonth() - born.getMonth())
  
  // If the birth date is in the future (invalid but possible data)
  if (totalMonths < 0) return { text: '0 ay', label: 'Yavru' }

  const ageYears = Math.floor(totalMonths / 12)
  const ageMonths = totalMonths % 12

  // Label based on years
  let label = 'Yavru'
  if (ageYears >= 12) {
    label = 'Yaşlı (12+)'
  } else if (ageYears >= 7) {
    label = 'Yaşlı'
  } else if (ageYears >= 1) {
    label = 'Yetişkin'
  } else {
    label = 'Yavru'
  }

  // Text representation
  let text = ''
  if (ageYears < 1) {
    text = `${totalMonths} ay`
  } else {
    text = `${ageYears} yıl`
    if (ageMonths > 0) {
      // Optional: Could add months here if desired, but keeping original logic
      // text += ` ${ageMonths} ay`
    }
  }

  return { text, label }
}
