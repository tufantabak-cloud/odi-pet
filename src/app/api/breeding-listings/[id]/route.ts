import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pet } = await supabase
    .from('pets')
    .select('is_neutered')
    .eq('id', id)
    .single()

  if (pet?.is_neutered) {
    return NextResponse.json({ error: 'NEUTERED_PET', message: 'Kısırlaştırılmış petler için üreme ilanı açılamaz.' }, { status: 400 })
  }

  const body = await req.json()
  const { title, purpose = 'breeding', preferred_date_start, preferred_date_end, notes, requirements, photo_url, estrus_notification_enabled, experience_level = 'beginner' } = body

  if (!title) {
    return NextResponse.json({ error: 'Title zorunludur' }, { status: 400 })
  }

  // Aktif ilan kontrolü
  const { data: existingListing } = await supabase
    .from('breeding_listings')
    .select('id')
    .eq('pet_id', id)
    .eq('status', 'active')
    .single()

  if (existingListing) {
    return NextResponse.json(
      { error: 'Bu pet için zaten aktif bir eşleştirme ilanı var.' },
      { status: 400 }
    )
  }

  const { data: listing, error } = await supabase
    .from('breeding_listings')
    .insert({
      pet_id: id,
      user_id: user.id,
      title,
      purpose,
      preferred_date_start,
      preferred_date_end,
      notes,
      requirements,
      status: 'active',
      photo_url: photo_url || null,
      estrus_notification_enabled: !!estrus_notification_enabled,
      experience_level
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ listing })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  
  if (body.status === 'closed') {
    const { data: listing } = await supabase
      .from('breeding_listings')
      .select('id, title')
      .eq('pet_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (listing) {
      const { data: pendingApps } = await supabase
        .from('breeding_applications')
        .select('id, applicant_user_id, applicant_pet_id')
        .eq('listing_id', listing.id)
        .eq('status', 'pending')

      if (pendingApps && pendingApps.length > 0) {
        const jobs = pendingApps.map(app => ({
          user_id: app.applicant_user_id,
          pet_id: app.applicant_pet_id,
          job_type: 'listing_cancelled',
          payload: {
            title: 'İlan Kapatıldı',
            body: `Başvurduğunuz "${listing.title}" ilanı ilan sahibi tarafından kapatıldı.`,
            action_url: '/owner/social'
          },
          scheduled_for: new Date().toISOString()
        }))

        await supabase.from('notification_jobs').insert(jobs)

        await supabase
          .from('breeding_applications')
          .update({ status: 'cancelled' })
          .eq('listing_id', listing.id)
          .eq('status', 'pending')
      }
    }
  }

  const { error } = await supabase
    .from('breeding_listings')
    .update(body)
    .eq('pet_id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: listing } = await supabase
    .from('breeding_listings')
    .select('id, title')
    .eq('pet_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (listing) {
    const { data: pendingApps } = await supabase
      .from('breeding_applications')
      .select('id, applicant_user_id, applicant_pet_id')
      .eq('listing_id', listing.id)
      .eq('status', 'pending')

    if (pendingApps && pendingApps.length > 0) {
      const jobs = pendingApps.map(app => ({
        user_id: app.applicant_user_id,
        pet_id: app.applicant_pet_id,
        job_type: 'listing_cancelled',
        payload: {
          title: 'İlan Kapatıldı',
          body: `Başvurduğunuz "${listing.title}" ilanı ilan sahibi tarafından kapatıldı.`,
          action_url: '/owner/social'
        },
        scheduled_for: new Date().toISOString()
      }))

      await supabase.from('notification_jobs').insert(jobs)

      await supabase
        .from('breeding_applications')
        .update({ status: 'cancelled' })
        .eq('listing_id', listing.id)
        .eq('status', 'pending')
    }
  }

  const { error } = await supabase
    .from('breeding_listings')
    .delete()
    .eq('pet_id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
