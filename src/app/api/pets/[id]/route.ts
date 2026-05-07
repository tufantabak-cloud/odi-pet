import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
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

  const payload: any = {
    name: str(fd, 'name'),
    breed: str(fd, 'breed'),
    avatar_url: avatarUrl,
    birth_date: str(fd, 'birth_date'),
    gender: str(fd, 'gender'),
    color: str(fd, 'color'),
    microchip_no: str(fd, 'microchip_no'),
    passport_no: str(fd, 'passport_no'),
    tattoo_no: str(fd, 'tattoo_no'),
    pedigree_sire: str(fd, 'pedigree_sire'),
    pedigree_dam: str(fd, 'pedigree_dam'),
    vet_name: str(fd, 'vet_name'),
    vet_phone: str(fd, 'vet_phone'),
    city: str(fd, 'city'),
    district: str(fd, 'district'),
  }

  // Remove nulls to avoid overwriting with null if not provided (optional, depending on requirements)
  // For now, we assume all fields in the form are submitted.

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
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord || ownerRecord.role !== 'owner') {
    return NextResponse.json({ error: 'Sadece asıl sahip evcil hayvanı silebilir.' }, { status: 403 })
  }

  const { error } = await supabase.from('pets').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/pets')

  return NextResponse.json({ success: true })
}
