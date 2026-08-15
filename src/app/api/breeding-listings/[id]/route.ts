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

  const body = await req.json()
  const { title, purpose = 'breeding', preferred_date_start, preferred_date_end, notes, requirements, photo_url, estrus_notification_enabled, experience_level = 'beginner' } = body

  const { data: pet } = await supabase
    .from('pets')
    .select('is_neutered')
    .eq('id', id)
    .single()

  let currentAdvisories: any[] = [];

  if (purpose === 'breeding') {
    if (pet?.is_neutered) {
      return NextResponse.json({ error: 'NEUTERED_PET', message: 'Kısırlaştırılmış petler için üreme ilanı açılamaz.' }, { status: 400 })
    }

    const { evaluateBreedingEligibility } = await import('@/services/breeding/evaluateBreedingEligibility')
    const eligibility = await evaluateBreedingEligibility(id)
    currentAdvisories = eligibility.advisories;
    
    if (eligibility.status !== 'eligible') {
      return NextResponse.json({
        error: "Pet henüz üreme ilanı açmaya uygun değil.",
        code: "BREEDING_ELIGIBILITY_REQUIRED",
        eligibility_status: eligibility.status,
        blocking_reasons: eligibility.blockingReasons,
        advisories: eligibility.advisories
      }, { status: 409 })
    }
  }

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

  // ── FORENSIC DÜZELTME: mass-assignment engeli ──────────────────────────
  // `.update(body)` önceden ham body'yi doğrudan Supabase'e geçiriyordu.
  // Bu, `pet_id`/`user_id` gibi authorization alanlarının client tarafından
  // değiştirilip ilanın başka bir pet'e/kullanıcıya bağlanmasına izin
  // veriyordu (RLS yalnızca `user_id = auth.uid()` şartını kontrol ediyor,
  // `pet_id` sütununu kısıtlamıyor). Şimdi yalnızca gerçek, ilan-alanı
  // sütunları whitelist edilerek güncelleniyor; `id`, `pet_id`, `user_id`
  // asla body'den alınmaz.
  const ALLOWED_PATCH_FIELDS = [
    'title',
    'purpose',
    'preferred_date_start',
    'preferred_date_end',
    'notes',
    'requirements',
    'status',
    'photo_url',
    'estrus_notification_enabled',
    'experience_level',
  ] as const

  const updatePayload: Record<string, unknown> = {}
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updatePayload[field] = body[field]
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek geçerli bir alan bulunamadı.' }, { status: 400 })
  }

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
            action_url: '/owner/social?tab=eslestirme'
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
    .update(updatePayload)
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
          action_url: '/owner/social?tab=eslestirme'
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
