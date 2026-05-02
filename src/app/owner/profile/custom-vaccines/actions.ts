'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCustomTemplate(data: {
  species: 'dog' | 'cat'
  vaccine_name: string
  category: string
  interval_days: number | null
  recurrence_type: string
  min_age_weeks: number
}) {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  // Generate a unique code for the user
  const code = `CUSTOM_${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  const { error } = await supabase.from('vaccine_templates').insert({
    profile_id: user.id,
    species: data.species,
    vaccine_code: code,
    vaccine_name: data.vaccine_name,
    category: data.category,
    interval_days: data.interval_days,
    recurrence_type: data.recurrence_type,
    min_age_weeks: data.min_age_weeks,
    mandatory_level: 'optional',
    dose_number: 1,
    protects_against: []
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
