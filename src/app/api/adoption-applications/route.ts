import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const postSchema = z.object({
  listing_id: z.string().uuid(),
  message: z.string().min(10).max(1000).optional(),
  kvkk_consent: z.literal(true, {
    message: 'KVKK onayı zorunludur.'
  })
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const result = postSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const { listing_id, message, kvkk_consent } = result.data

  // Kendi ilanına başvuru engeli
  const { data: listing } = await supabase
    .from('pet_adoptions')
    .select('pet_id, user_id')
    .eq('id', listing_id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 })
  }

  const { data: isOwner } = await supabase
    .from('pet_owners')
    .select('id')
    .eq('pet_id', listing.pet_id)
    .eq('profile_id', user.id)
    .single()

  if (isOwner) {
    return NextResponse.json({ error: 'Kendi ilanınıza başvuramazsınız.' }, { status: 403 })
  }

  // Mükerrer başvuru engeli
  const { data: existingApp } = await supabase
    .from('adoption_applications')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('applicant_id', user.id)
    .in('status', ['pending', 'approved'])
    .single()

  if (existingApp) {
    return NextResponse.json({ error: 'Bu ilana zaten aktif bir başvurunuz var.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('adoption_applications')
    .insert({
      listing_id,
      applicant_id: user.id,
      message: message || null,
      kvkk_consent,
      kvkk_consent_at: new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bildirim (try/catch içinde)
  try {
    // İlan sahibi notification_jobs tablosuna ekle
    await supabase.from('notification_jobs').insert({
      user_id: listing.user_id,
      pet_id: listing.pet_id,
      job_type: 'adoption_application',
      payload: { 
        title: 'Yeni Sahiplenme Başvurusu 🐾',
        message: 'Sahiplenme ilanınıza yeni bir başvuru var!'
      },
      scheduled_for: new Date().toISOString()
    })
  } catch (err) {
    console.error('Notification error', err)
  }

  return NextResponse.json({ success: true, application: data })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const listingId = searchParams.get('listing_id')

  const supabase = await createServerSupabaseClient()

  if (listingId) {
    const { data: listing } = await supabase
      .from('pet_adoptions')
      .select('user_id, pet_id')
      .eq('id', listingId)
      .single()

    if (!listing) return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })

    let isOwner = false
    if (listing.user_id === user.id) {
      isOwner = true
    } else {
      const { data: ownerData } = await supabase
        .from('pet_owners')
        .select('id')
        .eq('pet_id', listing.pet_id)
        .eq('profile_id', user.id)
        .single()
      if (ownerData) isOwner = true
    }

    if (!isOwner) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })

    const { data: apps, error } = await supabase
      .from('adoption_applications')
      .select('id, listing_id, status, message, created_at, applicant_id')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const applicantIds = Array.from(new Set((apps || []).map(a => a.applicant_id).filter(Boolean)))
    let profilesMap: Record<string, any> = {}
    if (applicantIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .in('id', applicantIds)

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      }
    }

    const applications = (apps || []).map(a => ({
      ...a,
      profiles: profilesMap[a.applicant_id] || null
    }))

    return NextResponse.json({ applications })

  } else {
    // Mevcut davranış: applicant_id = user.id
    const { data, error } = await supabase
      .from('adoption_applications')
      .select(`
        id,
        listing_id,
        status,
        created_at,
        pet_adoptions!inner(
          id,
          pet_id,
          pets!inner(
            name,
            avatar_url,
            species
          )
        )
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ applications: data })
  }
}
