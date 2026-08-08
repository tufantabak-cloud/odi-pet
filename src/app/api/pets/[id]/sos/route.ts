import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
import { normalizeTurkishMobilePhone } from '@/lib/phone/turkish-mobile'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { sos_contacts } = await req.json()
  if (!Array.isArray(sos_contacts)) {
    return NextResponse.json({ error: 'Acil durum kişileri geçersiz.' }, { status: 400 })
  }

  const normalizedContacts = []
  for (let i = 0; i < sos_contacts.length; i++) {
    const contact = sos_contacts[i]
    if (!contact || typeof contact !== 'object') {
      return NextResponse.json({ error: 'Acil durum kişisi geçersiz.' }, { status: 400 })
    }

    const phone = normalizeTurkishMobilePhone(
      typeof contact.phone === 'string' ? contact.phone : '',
    )
    if (!phone) {
      return NextResponse.json(
        { error: 'Telefon numarası 05XX XXX XX XX biçiminde bir cep telefonu olmalıdır.' },
        { status: 400 },
      )
    }

    normalizedContacts.push({
      name: typeof contact.name === 'string' ? contact.name.trim() : '',
      phone,
      relation: i === 0 ? 'Sahibi' : (typeof contact.relation === 'string' ? contact.relation.trim() : ''),
    })
  }

  if (normalizedContacts.length >= 2) {
    const c1 = normalizedContacts[0]
    const c2 = normalizedContacts[1]
    if (
      (c1.phone && c2.phone && c1.phone.replace(/\D/g, '') === c2.phone.replace(/\D/g, '')) &&
      (c1.name && c2.name && c1.name.toLowerCase() === c2.name.toLowerCase())
    ) {
      return NextResponse.json(
        { error: 'Birincil kişi ile Yedek bağlantı kişisi aynı kişi olamaz.' },
        { status: 400 },
      )
    }
  }

  const supabase = await createServerSupabaseClient()

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz: Sadece sahip veya admin SOS ayarlarını değiştirebilir' }, { status: 403 })
  }

  const { error } = await supabase
    .from('pets')
    .update({ sos_contacts: normalizedContacts })
    .eq('id', id)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // 1. ve 2. Acil durum kişisi eklendiğinde, sahibin profil verisiyle otomatik eşle
  const primaryContact = normalizedContacts[0]
  const secondaryContact = normalizedContacts[1]

  if (primaryContact?.phone || secondaryContact?.phone) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_contact2_name, emergency_contact2_phone, emergency_contact2_relation')
        .eq('id', user.id)
        .maybeSingle()

      const updates: Record<string, any> = {}
      if (primaryContact?.phone) {
        if (!prof?.phone) updates.phone = primaryContact.phone
        if (!prof?.emergency_contact_phone) {
          updates.emergency_contact_name = primaryContact.name
          updates.emergency_contact_phone = primaryContact.phone
          updates.emergency_contact_relation = primaryContact.relation
        }
      }
      if (secondaryContact?.phone) {
        if (!prof?.emergency_contact2_phone) {
          updates.emergency_contact2_name = secondaryContact.name
          updates.emergency_contact2_phone = secondaryContact.phone
          updates.emergency_contact2_relation = secondaryContact.relation
        }
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', user.id)
      }
    } catch (e) {
      console.error('Failed to sync emergency contacts to owner profile:', e)
    }
  }

  // Acil durum kişisi başarıyla eklendiğinde onboarding adımını true olarak işaretle
  try {
    await supabase.rpc('update_onboarding_step', {
      p_pet_id: id,
      p_step: 'emergency_contact',
      p_value: true,
    })
  } catch (opErr) {
    console.error('Onboarding step emergency_contact could not be marked:', opErr)
  }

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Acil durum ağı başarıyla güncellendi.' })
}
