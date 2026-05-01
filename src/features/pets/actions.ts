'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key) as string | null
  return v?.trim() || null
}

export async function addPet(formData: FormData) {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('pets').insert({
    owner_id:      user.id,
    name:          str(formData, 'name')!,
    species:       str(formData, 'species')!,
    breed:         str(formData, 'breed'),
    birth_date:    str(formData, 'birth_date'),
    gender:        str(formData, 'gender'),
    color:         str(formData, 'color'),
    microchip_no:  str(formData, 'microchip_no'),
    passport_no:   str(formData, 'passport_no'),
    tattoo_no:     str(formData, 'tattoo_no'),
    pedigree_sire: str(formData, 'pedigree_sire'),
    pedigree_dam:  str(formData, 'pedigree_dam'),
    vet_name:      str(formData, 'vet_name'),
    vet_phone:     str(formData, 'vet_phone'),
  })

  if (error) console.error('Pet eklenirken hata:', error)

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/pets')
  redirect('/owner/pets')
}
