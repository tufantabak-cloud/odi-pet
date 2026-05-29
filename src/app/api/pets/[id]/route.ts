import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'
import { generateVaccinationPlan } from '@/features/pets/vaccination-algorithm'

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key) as string | null
  return v?.trim() || null
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const fd = await req.formData()
  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: pet, error: fetchError } = await supabase
    .from('pets')
    .select('id, avatar_url, birth_date, species')
    .eq('id', id)
    .single()

  if (fetchError || !pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

  // Check if user is an owner in pet_owners
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Avatar Upload
  let avatarUrl = pet.avatar_url
  const avatarFile = fd.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('pet-avatars')
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: false })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }
  }

  const payload: any = {}
  if (fd.has('name')) payload.name = str(fd, 'name')
  if (fd.has('breed')) payload.breed = str(fd, 'breed')
  if (avatarUrl !== pet.avatar_url) payload.avatar_url = avatarUrl
  if (fd.has('birth_date')) payload.birth_date = str(fd, 'birth_date')
  if (fd.has('gender')) payload.gender = str(fd, 'gender')
  if (fd.has('color')) payload.color = str(fd, 'color')
  if (fd.has('microchip_no')) payload.microchip_no = str(fd, 'microchip_no')
  if (fd.has('passport_no')) payload.passport_no = str(fd, 'passport_no')
  if (fd.has('tattoo_no')) payload.tattoo_no = str(fd, 'tattoo_no')
  if (fd.has('pedigree_sire')) payload.pedigree_sire = str(fd, 'pedigree_sire')
  if (fd.has('pedigree_dam')) payload.pedigree_dam = str(fd, 'pedigree_dam')
  if (fd.has('vet_name')) payload.vet_name = str(fd, 'vet_name')
  if (fd.has('vet_phone')) payload.vet_phone = str(fd, 'vet_phone')
  if (fd.has('city')) payload.city = str(fd, 'city')
  if (fd.has('district')) payload.district = str(fd, 'district')
  if (fd.has('lifestyle')) payload.lifestyle = str(fd, 'lifestyle')
  if (fd.has('size')) payload.size = str(fd, 'size')

  const { error: updateError } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // ─── Regenerate Vaccination Plan if birth_date changed ────────────────
  const newBirthDate = payload.birth_date
  if (newBirthDate && newBirthDate !== pet.birth_date) {
    // Delete existing vaccination plans (simplistic check by title keywords)
    // In a real app, we'd have a 'type' or 'is_auto' flag.
    await supabase
      .from('care_plans')
      .delete()
      .eq('pet_id', id)
      .or('title.ilike.%Karma%,title.ilike.%Kuduz%,title.ilike.%Corona%,title.ilike.%Lösemi%')

    const plans = generateVaccinationPlan(newBirthDate, pet.species)
    if (plans.length > 0) {
      const carePlansPayload = plans.map(p => ({
        pet_id: id,
        title: p.title,
        description: p.description,
        due_date: p.due_date
      }))
      await supabase.from('care_plans').insert(carePlansPayload)
    }
  }

  revalidatePath('/owner/dashboard')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()



  // Verify ownership via pet_owners table
  const { data: ownerRecord, error: ownerError } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()



  if (!ownerRecord || ownerRecord.role !== 'owner') {
    return NextResponse.json({ error: 'Sadece asıl sahip evcil hayvanı silebilir.' }, { status: 403 })
  }

  // First delete from pet_owners to avoid RLS issues on the pets table
  await supabase.from('pet_owners').delete().eq('pet_id', id)

  // Delete the pet itself (RLS: auth.uid() = owner_id)
  const { error, count } = await supabase
    .from('pets')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('owner_id', user.id)



  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check if any rows were actually deleted (RLS can silently block)
  if (count === 0) {
    console.error('[API/Pets/DELETE] RLS blocked delete or pet not found. Pet:', id, 'User:', user.id)
    return NextResponse.json(
      { error: 'Bu evcil hayvan silinemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }

  revalidatePath('/owner/dashboard')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  revalidatePath('/owner/profile')

  return NextResponse.json({ success: true })
}
