import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Database } from '@/lib/database.types'
import {
  hasPetCapability,
  ownershipRpcSucceeded,
} from '@/lib/pets/access'
import { formatSupabaseError } from '@/lib/utils/error-handler'
import { deletePetStorageFiles } from '@/lib/storage/cleanup'

type PetUpdate = Database['public']['Tables']['pets']['Update']

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key) as string | null
  return v?.trim() || undefined
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
    .select('id, avatar_url, birth_date, species, lifestyle')
    .eq('id', id)
    .single()

  if (fetchError || !pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

  const canEdit = await hasPetCapability(
    supabase,
    id,
    'can_edit_pet_profile'
  )
  if (!canEdit) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

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

  // Cover Upload
  let coverUrl = (pet as any).cover_url
  const coverFile = fd.get('cover') as File | null
  if (coverFile && coverFile.size > 0) {
    const ext = coverFile.name.split('.').pop() || 'jpg'
    const path = `covers/${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('pet-avatars')
      .upload(path, coverFile, { contentType: coverFile.type, upsert: false })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(path)
      coverUrl = urlData.publicUrl
    }
  } else if (fd.has('cover_url')) {
    coverUrl = str(fd, 'cover_url')
  }

  const payload: any = {}
  
  const cover_position = fd.get('cover_position') as string | null
  if (cover_position) payload.cover_position = cover_position

  const coverScale = fd.get('cover_scale') as string | null
  if (coverScale) payload.cover_scale = parseFloat(coverScale)

  if (fd.has('name')) payload.name = str(fd, 'name')
  if (fd.has('breed')) payload.breed = str(fd, 'breed')
  if (avatarUrl !== pet.avatar_url) payload.avatar_url = avatarUrl ?? undefined
  if (coverUrl !== (pet as any).cover_url) payload.cover_url = coverUrl ?? undefined
  if (fd.has('birth_date')) payload.birth_date = str(fd, 'birth_date')
  if (fd.has('birth_date_precision')) payload.birth_date_precision = str(fd, 'birth_date_precision')
  if (fd.has('gender')) payload.gender = str(fd, 'gender')
  if (fd.has('color')) payload.color = str(fd, 'color')
  if (fd.has('microchip_no')) payload.microchip_no = str(fd, 'microchip_no')
  if (fd.has('passport_no')) payload.passport_no = str(fd, 'passport_no')
  if (fd.has('tattoo_no')) payload.tattoo_no = str(fd, 'tattoo_no')
  if (fd.has('pedigree_sire')) payload.pedigree_sire = str(fd, 'pedigree_sire')
  if (fd.has('pedigree_dam')) payload.pedigree_dam = str(fd, 'pedigree_dam')
  if (fd.has('vet_name')) payload.vet_name = str(fd, 'vet_name')
  if (fd.has('vet_company')) payload.vet_company = str(fd, 'vet_company')
  if (fd.has('vet_phone')) payload.vet_phone = str(fd, 'vet_phone')
  if (fd.has('vet_email')) payload.vet_email = str(fd, 'vet_email')
  if (fd.has('city')) payload.city = str(fd, 'city')
  if (fd.has('district')) payload.district = str(fd, 'district')
  if (fd.has('registration_city')) payload.registration_city = str(fd, 'registration_city')
  if (fd.has('registration_district')) payload.registration_district = str(fd, 'registration_district')
  if (fd.has('agriculture_directorate')) payload.agriculture_directorate = str(fd, 'agriculture_directorate')
  if (fd.has('lifestyle')) payload.lifestyle = str(fd, 'lifestyle')
  if (fd.has('size')) payload.size = str(fd, 'size')

  const { error: updateError } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Save weight and height if provided
  const weight_kg = fd.get('weight_kg') as string | null
  const height_cm = fd.get('height_cm') as string | null
  if (weight_kg) {
    const { error: growthError } = await supabase
      .from('weight_logs')
      .insert({
        pet_id: id,
        weight_kg: Number(weight_kg.replace(',', '.')),
        height_cm: height_cm ? Number(height_cm.replace(',', '.')) : null
      })
    if (growthError) {
      console.error('Error updating weight/height:', growthError)
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

  // 1. Verify authorization using canonical capability model
  const canDelete = await hasPetCapability(supabase, id, 'can_delete_pet')
  if (!canDelete) {
    return NextResponse.json(
      { error: 'Sadece asıl sahip evcil hayvanı silebilir.' },
      { status: 403 }
    )
  }

  // 2. Call canonical RPC to delete pet and memberships
  let deleteSucceeded = false
  const { data, error: rpcError } = await supabase.rpc(
    'delete_pet_with_memberships',
    { p_pet_id: id }
  )

  if (!rpcError && ownershipRpcSucceeded(data)) {
    deleteSucceeded = true
  } else if (!rpcError && data && typeof data === 'object' && 'ok' in data && data.ok === false) {
    return NextResponse.json(
      { error: 'Sadece asıl sahip evcil hayvanı silebilir.' },
      { status: 403 }
    )
  }

  // 3. Fallback DB deletion if RPC failed (e.g. FK constraint or DB RPC issue)
  if (!deleteSucceeded) {
    try {
      // Clean up records that might block FK deletion
      await supabase.from('smart_scanner_records').delete().eq('pet_id', id)
      await supabase.from('pet_memberships').delete().eq('pet_id', id)
      await supabase.from('pet_owners').delete().eq('pet_id', id)
      await supabase.from('pet_members').delete().eq('pet_id', id)

      const { error: directDeleteError } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)

      if (directDeleteError) {
        let adminClient
        try {
          adminClient = createAdminSupabaseClient()
        } catch {}

        if (adminClient) {
          await adminClient.from('smart_scanner_records').delete().eq('pet_id', id)
          await adminClient.from('pet_memberships').delete().eq('pet_id', id)
          await adminClient.from('pet_owners').delete().eq('pet_id', id)
          await adminClient.from('pet_members').delete().eq('pet_id', id)
          const { error: adminDeleteErr } = await adminClient.from('pets').delete().eq('id', id)
          if (adminDeleteErr) {
            const { message } = formatSupabaseError(adminDeleteErr)
            return NextResponse.json({ error: message }, { status: 500 })
          }
        } else {
          const { message } = formatSupabaseError(directDeleteError)
          return NextResponse.json({ error: message }, { status: 500 })
        }
      }
    } catch (fallbackErr: any) {
      console.error('[API/Pets/DELETE] Fallback deletion failed:', fallbackErr)
      return NextResponse.json(
        { error: fallbackErr.message || 'Evcil hayvan profilini silerken bir hata oluştu.' },
        { status: 500 }
      )
    }
  }

  // 4. Cleanup physical storage binary files
  await deletePetStorageFiles(supabase, id).catch((err) => {
    console.error('Storage cleanup failed on pet delete:', err)
  })

  revalidatePath('/owner/dashboard')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  revalidatePath('/owner/profile')

  return NextResponse.json({ success: true })
}
