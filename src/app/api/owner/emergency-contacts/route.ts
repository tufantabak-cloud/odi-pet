import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { formatTurkishMobileInput } from '@/lib/phone/turkish-mobile'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()

  // 1. Profil bilgilerini çek
  const { data: prof } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_contact2_name, emergency_contact2_phone, emergency_contact2_relation')
    .eq('id', user.id)
    .maybeSingle()

  // 2. Mevcut petlerin SOS kişilerini tara
  const { data: pets } = await supabase
    .from('pets')
    .select('sos_contacts')
    .eq('owner_id', user.id)

  const ownerFullName = `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim()

  let c1Name = prof?.emergency_contact_name || ownerFullName || ''
  let c1Phone = prof?.emergency_contact_phone || prof?.phone || ''
  let c1Relation = 'Sahibi'

  let c2Name = prof?.emergency_contact2_name || ''
  let c2Phone = prof?.emergency_contact2_phone || ''
  let c2Relation = prof?.emergency_contact2_relation || ''

  if (pets && pets.length > 0) {
    for (const p of pets) {
      if (Array.isArray(p.sos_contacts) && p.sos_contacts.length > 0) {
        const p1 = p.sos_contacts[0]
        const p2 = p.sos_contacts[1]

        if (p1) {
          if (!c1Name && p1.name) c1Name = p1.name.trim()
          if (!c1Phone && p1.phone) c1Phone = p1.phone
        }

        if (p2) {
          if (!c2Name && p2.name) c2Name = p2.name.trim()
          if (!c2Phone && p2.phone) c2Phone = p2.phone
          if (!c2Relation && p2.relation) c2Relation = p2.relation
        }
      }
    }
  }

  return NextResponse.json({
    c1: {
      name: c1Name,
      phone: c1Phone ? formatTurkishMobileInput(c1Phone) : '',
      relation: 'Sahibi',
    },
    c2: {
      name: c2Name,
      phone: c2Phone ? formatTurkishMobileInput(c2Phone) : '',
      relation: c2Relation,
    },
  })
}
