'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCustomTemplate(data: {
  species: 'dog' | 'cat'
  vaccine_name: string
  category: string
  dose_count: number
  first_dose_week: number
  dose_interval_days: number[] | null
  has_annual_booster: boolean
  recurrence_days: number | null
  vaccine_code?: string
  is_active?: boolean
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const code = data.vaccine_code || `CUSTOM_${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  // Delete existing user template with same code if overriding
  await supabase.from('vaccine_templates')
    .delete()
    .eq('profile_id', user.id)
    .eq('vaccine_code', code)
    .eq('species', data.species)

  const { error } = await supabase.from('vaccine_templates').insert({
    profile_id: user.id,
    species: data.species,
    vaccine_code: code,
    vaccine_name: data.vaccine_name,
    category: data.category,
    mandatory_level: 'optional',
    dose_count: data.dose_count,
    first_dose_week: data.first_dose_week,
    dose_interval_days: data.dose_count > 1 
      ? (Array.isArray(data.dose_interval_days) ? data.dose_interval_days.slice(0, data.dose_count - 1) : [data.dose_interval_days])
      : null,
    has_annual_booster: data.has_annual_booster,
    recurrence_days: data.recurrence_days,
    is_active: data.is_active !== undefined ? data.is_active : true,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/owner/profile/custom-vaccines')
  revalidatePath('/owner/pets/[id]/vaccines', 'page')
}

export async function deleteCustomTemplate(templateId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('vaccine_templates').delete().eq('id', templateId)
  if (error) throw new Error(error.message)
  revalidatePath('/owner/profile/custom-vaccines')
  revalidatePath('/owner/pets/[id]/vaccines', 'page')
}
