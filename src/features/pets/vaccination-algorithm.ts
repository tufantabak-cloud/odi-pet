import { SupabaseClient } from '@supabase/supabase-js'

export interface VaccinationTask {
  title: string
  description: string
  due_date: string
}

export async function generateVaccinationPlan(
  birthDateStr: string,
  species: string,
  supabase: SupabaseClient
): Promise<VaccinationTask[]> {
  const birthDate = new Date(birthDateStr)
  if (isNaN(birthDate.getTime())) return []

  const { data: protocols, error } = await supabase
    .from('vaccine_protocols')
    .select('*')
    .eq('species', species)
    .eq('is_active', true)

  if (error || !protocols) {
    console.error('[vaccination-algorithm] Fetch error:', error)
    return []
  }

  const plans: VaccinationTask[] = []

  for (const protocol of protocols) {
    let lastDoseDate = new Date(birthDate)

    const doses = protocol.doses || []
    for (const dose of doses) {
      const dueDate = new Date()

      if (dose.trigger === 'birth') {
        dueDate.setTime(birthDate.getTime() + (dose.days_offset * 24 * 60 * 60 * 1000))
        lastDoseDate = new Date(dueDate)
      } else if (dose.trigger === 'prev_dose') {
        dueDate.setTime(lastDoseDate.getTime() + (dose.days_offset * 24 * 60 * 60 * 1000))
        lastDoseDate = new Date(dueDate)
      } else {
        continue // Unknown trigger, skip
      }

      plans.push({
        title: `${protocol.protocol_name} - ${dose.label}`,
        description: protocol.notes || '',
        due_date: dueDate.toISOString(),
      })
    }
  }

  return plans
}
