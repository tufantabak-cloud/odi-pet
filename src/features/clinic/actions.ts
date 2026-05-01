'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
) {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createServerSupabaseClient()

  // Klinik üyeliği var mı kontrol et
  const { data: memberships } = await supabase
    .from('clinic_memberships')
    .select('clinic_id')
    .eq('profile_id', user.id)

  const clinicId = memberships?.[0]?.clinic_id
  if (!clinicId) throw new Error('Klinik üyeliği bulunamadı')

  // Sadece kendi kliniğine ait randevu güncellenebilir (ek güvenlik)
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)

  if (error) throw new Error(error.message)

  revalidatePath('/clinic/dashboard')
  revalidatePath('/clinic/appointments')
}

export async function addCarePlan(formData: FormData) {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships')
    .select('clinic_id')
    .eq('profile_id', user.id)

  const clinicId = memberships?.[0]?.clinic_id
  if (!clinicId) throw new Error('Klinik bulunamadı')

  await supabase.from('care_plans').insert({
    pet_id: formData.get('pet_id') as string,
    clinic_id: clinicId,
    title: formData.get('title') as string,
    description: formData.get('description') as string | null,
    due_date: formData.get('due_date') as string | null,
  })

  revalidatePath('/clinic/dashboard')
}
