import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
import { generateVaccinationPlan } from '@/features/pets/vaccination-algorithm'

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key) as string | null
  return v?.trim() || null
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    console.error('[API/Pets] No session user — 401')
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor. Lütfen tekrar giriş yapın.' }, { status: 401 })
  }

  const fd = await req.formData()
  const supabase = await createServerSupabaseClient()

  // ─── Profiles kaydının var olduğundan emin ol ─────────────────
  await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  const species = str(fd, 'species')
  if (!species || !['Kedi', 'Köpek'].includes(species)) {
    return NextResponse.json({ error: 'Geçersiz tür.' }, { status: 400 })
  }

  const name = str(fd, 'name')
  if (!name) return NextResponse.json({ error: 'Can dostunun adı belirtilmelidir.' }, { status: 400 })

  const breed = str(fd, 'breed')
  if (!breed) return NextResponse.json({ error: 'Irk seçimi zorunludur.' }, { status: 400 })

  // ─── Avatar Yükleme (opsiyonel) ────────────────────────────────
  let avatarUrl: string | null = null
  const avatarFile = fd.get('avatar') as File | null

  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('pet-avatars')
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: false })

    if (uploadError) {
      console.error('[API/Pets] Avatar upload error:', uploadError)
      // Fotoğraf hatası kaydı durdurmaz — devam et
    } else {
      const { data: urlData } = supabase.storage
        .from('pet-avatars')
        .getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }
  }

  const payload = {
    owner_id:      user.id,
    name,
    species,
    breed,
    avatar_url:    avatarUrl,
    birth_date:    str(fd, 'birth_date') || null,
    gender:        str(fd, 'gender')     || null,
    color:         str(fd, 'color')      || null,
    microchip_no:  str(fd, 'microchip_no')  || null,
    passport_no:   str(fd, 'passport_no')   || null,
    tattoo_no:     str(fd, 'tattoo_no')     || null,
    pedigree_sire: str(fd, 'pedigree_sire') || null,
    pedigree_dam:  str(fd, 'pedigree_dam')  || null,
    vet_name:      str(fd, 'vet_name')      || null,
    vet_phone:     str(fd, 'vet_phone')     || null,
    city:          str(fd, 'city')          || null,
    district:      str(fd, 'district')      || null,
  }

  console.log('[API/Pets] INSERT payload:', JSON.stringify({ ...payload, avatar_url: avatarUrl ? '✓ uploaded' : null }))

  const { data, error } = await supabase
    .from('pets')
    .insert(payload)
    .select('id, name')
    .single()

  if (error) {
    console.error('[API/Pets] INSERT error:', JSON.stringify(error))
    return NextResponse.json(
      { error: `Kayıt hatası: ${error.message} (kodu: ${error.code})` },
      { status: 500 }
    )
  }

  console.log('[API/Pets] INSERT success:', data)

  // ─── Add Owner to pet_owners table ───────────────────────────
  await supabase
    .from('pet_owners')
    .insert({ pet_id: data.id, profile_id: user.id, role: 'owner' })

  // ─── Generate Vaccination Plan ────────────────────────────────
  const birthDate = str(fd, 'birth_date')
  if (birthDate) {
    const plans = generateVaccinationPlan(birthDate, species)
    if (plans.length > 0) {
      const carePlansPayload = plans.map(p => ({
        pet_id: data.id,
        title: p.title,
        description: p.description,
        due_date: p.due_date
      }))
      
      const { error: planError } = await supabase
        .from('care_plans')
        .insert(carePlansPayload)
      
      if (planError) console.error('[API/Pets] Care plan generation error:', planError)
    }
  }

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/pets')
  return NextResponse.json({ success: true, pet: data })
}
