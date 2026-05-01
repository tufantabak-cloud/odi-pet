'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function bookAppointment(formData: FormData) {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createServerSupabaseClient()

  const petId = formData.get('pet_id') as string
  const clinicId = formData.get('clinic_id') as string
  const scheduledAt = formData.get('scheduled_at') as string
  const ownerReason = formData.get('owner_reason') as string

  // Önce bu pet gerçekten bu owner'a ait mi kontrol et (RLS zaten yapar ama explicity yapalım)
  const { data: pet } = await supabase
    .from('pets')
    .select('id')
    .eq('id', petId)
    .eq('owner_id', user.id)
    .single()

  if (!pet) throw new Error('Bu pet size ait değil')

  const { error } = await supabase.from('appointments').insert({
    pet_id: petId,
    clinic_id: clinicId,
    scheduled_at: scheduledAt,
    owner_reason: ownerReason || null,
    status: 'pending',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/owner/pets')
  revalidatePath('/owner/appointments')
  redirect('/owner/appointments')
}
