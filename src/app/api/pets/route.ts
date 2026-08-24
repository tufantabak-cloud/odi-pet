import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'
import { generateVaccinationPlan } from '@/features/pets/vaccination-algorithm'
import { logOnboardingEvent } from '@/lib/agents/dataQualityAgent'
import { createVaccineNotifications } from '@/lib/notifications/createVaccineNotifications'
import { createPetWithCompatibility } from '@/lib/pets/create-pet-with-compatibility'

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key) as string | null
  return v?.trim() || null
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, sos_contacts')
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pets: data })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    console.error('[API/Pets] No session user — 401')
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor. Lütfen tekrar giriş yapın.' }, { status: 401 })
  }

  const fd = await req.formData()
  const supabase = await createServerSupabaseClient()
  const uploadedPaths: string[] = []

  // Diagnostic Log

  // ─── Profiles kaydının var olduğundan emin ol ─────────────────
  await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  const species = str(fd, 'species')
  if (!species || !['cat', 'dog'].includes(species)) {
    console.error('[API/Pets/POST] Rejected due to invalid species:', species)
    await logOnboardingEvent(user.id, 'pet_species_selected', 'validation_rejected', { error: `Geçersiz tür: ${species}` })
    return NextResponse.json({ error: `Geçersiz tür: ${species || 'belirtilmemiş'}.` }, { status: 400 })
  }
  await logOnboardingEvent(user.id, 'pet_species_selected')

  const name = str(fd, 'name')
  if (!name) {
    await logOnboardingEvent(user.id, 'pet_name_entered', 'validation_rejected', { error: 'İsim eksik' })
    return NextResponse.json({ error: 'Can dostunun adı belirtilmelidir.' }, { status: 400 })
  }
  await logOnboardingEvent(user.id, 'pet_name_entered')

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
    } else {
      uploadedPaths.push(path)
      const { data: urlData } = supabase.storage
        .from('pet-avatars')
        .getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }
  }

  // ─── Kapak Fotoğrafı Yükleme (opsiyonel) ─────────────────────
  let coverUrl: string | null = null
  const coverFile = (fd.get('cover') || fd.get('cover_url')) as File | string | null

  if (coverFile && typeof coverFile === 'object' && coverFile.size > 0) {
    const ext = coverFile.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}_cover.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('pet-avatars')
      .upload(path, coverFile, { contentType: coverFile.type, upsert: false })

    if (uploadError) {
      console.error('[API/Pets] Cover upload error:', uploadError)
    } else {
      uploadedPaths.push(path)
      const { data: urlData } = supabase.storage
        .from('pet-avatars')
        .getPublicUrl(path)
      coverUrl = urlData.publicUrl
    }
  }

  const payload = {
    name,
    species,
    breed,
    avatar_url:    avatarUrl,
    cover_url:     coverUrl,
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
    city:                   str(fd, 'city')                   || null,
    district:               str(fd, 'district')               || null,
    registration_city:      str(fd, 'registration_city')      || null,
    registration_district:  str(fd, 'registration_district')  || null,
    agriculture_directorate: str(fd, 'agriculture_directorate') || null,
    is_neutered:            str(fd, 'is_neutered') === 'true',
    lifestyle:              str(fd, 'lifestyle')              || null,
    target_weight_kg:       str(fd, 'target_weight_kg') || str(fd, 'target_weight') ? parseFloat((str(fd, 'target_weight_kg') || str(fd, 'target_weight'))!.replace(',', '.')) : null,
  }


  const {
    data: rpcData,
    error,
    usedLegacyFallback,
  } = await createPetWithCompatibility(supabase, user.id, payload)

  if (error) {
    console.error('[API/Pets] INSERT error:', JSON.stringify(error))
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from('pet-avatars')
        .remove(uploadedPaths)
      if (cleanupError) {
        console.error('[API/Pets] Upload cleanup error:', cleanupError)
      }
    }
    return NextResponse.json(
      { error: `Kayıt hatası: ${(error as any)?.message || (error instanceof Error ? error.message : String(error))} (kodu: ${(error as any)?.code || 'Bilinmiyor'})` },
      { status: 500 }
    )
  }

  const data =
    typeof rpcData === 'object'
    && rpcData !== null
    && 'id' in rpcData
    && 'name' in rpcData
    && typeof rpcData.id === 'string'
    && typeof rpcData.name === 'string'
      ? { id: rpcData.id, name: rpcData.name }
      : null

  if (!data) {
    console.error('[API/Pets] RPC returned an invalid pet payload')
    return NextResponse.json(
      { error: 'Kayıt oluşturuldu ancak yanıt doğrulanamadı.' },
      { status: 500 }
    )
  }

  if (usedLegacyFallback) {
    console.warn('[API/Pets] Pet created through the remote-schema compatibility path.')
  }

  // ─── Katman 1: İlk Kilo ve Boy Kaydının Alınması ────────────────
  const weightVal = str(fd, 'weight') || str(fd, 'weight_kg')
  const heightVal = str(fd, 'height') || str(fd, 'height_cm')
  if ((weightVal && !isNaN(parseFloat(weightVal))) || (heightVal && !isNaN(parseFloat(heightVal)))) {
    const { error: weightError } = await supabase
      .from('weight_logs')
      .insert({ 
        pet_id: data.id, 
        weight_kg: weightVal ? parseFloat(weightVal) : null, 
        height_cm: heightVal ? parseFloat(heightVal) : null,
        measured_at: new Date().toISOString()
      })
    if (weightError) console.error('[API/Pets] Weight/Height log error:', weightError)
  }

  // ─── Generate Vaccination Plan (Sadece Yavrular İçin) ─────────
  const birthDate = str(fd, 'birth_date')
  if (birthDate) {
    const born = new Date(birthDate)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    
    // Sadece 6 aydan küçük yavrular için otomatik plan üret
    if (ageInMonths < 6) {
      const isOutdoor = str(fd, 'lifestyle') === 'outdoor'
      const generatedTasks = await generateVaccinationPlan(birthDate, species, supabase, { isOutdoor })
      if (generatedTasks.length > 0) {
        const plansPayload = generatedTasks.map(t => ({
          user_id: user.id,
          pet_id: data.id,
          category: t.category,
          sub_type: t.sub_type,
          scheduled_at: t.scheduled_at,
          extra_data: t.extra_data
        }))

        const { data: insertedPlans, error: planError } = await supabase
          .from('plans')
          .insert(plansPayload)
          .select()

        if (planError) {
          console.error('[API/Pets] Plan generation error:', planError)
        } else {
          const { count: notifCount, error: notifError } = await createVaccineNotifications(
            user.id,
            data.id,
            insertedPlans ?? [],
            supabase
          )
          if (notifError) console.error('[API/Pets] Notifications insert error:', notifError)
        }
      }
    }
  }

  // ─── Otomatik Kilo & Boy Hatırlatıcısı (1 ay sonrası) ──────────────
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const { error: autoPlanError } = await supabase
    .from('plans')
    .insert({
      user_id: user.id,
      pet_id: data.id,
      category: 'saglik',
      sub_type: 'Kilo & Boy Ölçümü',
      scheduled_at: nextMonth.toISOString(),
      status: 'active',
      extra_data: { source: 'system', auto_generated: true }
    });
  
  if (autoPlanError) console.error('[API/Pets] Auto plan error:', autoPlanError);

  // ─── Her bir pet için Bonus Pro Kredisi (+90 Gün veya Admin Ayarlı) ──
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server')
    const adminSupabase = createAdminSupabaseClient()
    let perPetDays = 90
    const { data: settingsRow } = await adminSupabase
      .from('system_settings')
      .select('value')
      .eq('key', 'membership_rules')
      .maybeSingle()

    if (settingsRow?.value?.per_pet_credit_days !== undefined) {
      perPetDays = Number(settingsRow.value.per_pet_credit_days)
    }

    if (perPetDays > 0) {
      await adminSupabase.rpc('grant_membership_credit', {
        p_profile_id: user.id,
        p_days: perPetDays,
        p_reason: 'pet_added',
        p_idempotency_key: `pet_added:${data.id}`,
        p_metadata: { pet_id: data.id, days: perPetDays }
      })
    }
  } catch (creditErr) {
    console.error('[API/Pets] Per pet credit grant error:', creditErr)
  }

  // 🚀 Referral Qualification Check 🚀
  // Kullanıcının beklemede (pending) referansı varsa, pet eklediği için artık yeterli olabilir.
  try {
    const { checkPendingReferrals } = await import('@/lib/referral/checkPendingReferrals')
    await checkPendingReferrals(user.id)
  } catch (refErr) {
    console.error('[API/Pets] checkPendingReferrals error:', refErr)
  }

  revalidatePath('/owner/dashboard')
  revalidateTag(`dashboard-${user.id}`, 'default')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  return NextResponse.json({ success: true, pet: data })
}
