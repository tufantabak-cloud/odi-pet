import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: listing } = await supabase
    .from('breeding_listings')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!listing || listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: applications, error } = await supabase
    .from('breeding_applications')
    .select(`
      *,
      pets!applicant_pet_id (
        id, name, species, breed, birth_date, avatar_url, gender
      ),
      profiles!applicant_user_id (
        id, full_name, phone
      )
    `)
    .eq('listing_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch applications error:', error)
    return NextResponse.json({ error: 'Başvurular getirilirken hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({ applications: applications || [] })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json()
  const { applicant_pet_id, message, kvkk_consent } = body

  if (!kvkk_consent) {
    return NextResponse.json({ error: 'KVKK onayı zorunludur.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: listing } = await supabase
    .from('breeding_listings')
    .select('user_id, title')
    .eq('id', id)
    .single()

  if (!listing) return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 })
  if (listing.user_id === user.id) {
    return NextResponse.json({ error: 'Kendi ilanınıza başvuramazsınız.' }, { status: 400 })
  }

  const { data: petOwner } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', applicant_pet_id)
    .eq('profile_id', user.id)
    .single()

  if (!petOwner) {
    return NextResponse.json({ error: 'Seçilen pet size ait değil.' }, { status: 403 })
  }

  const { data: existingApp } = await supabase
    .from('breeding_applications')
    .select('id')
    .eq('listing_id', id)
    .eq('applicant_pet_id', applicant_pet_id)
    .single()

  if (existingApp) {
    return NextResponse.json({ error: 'Bu pet ile zaten başvuru yaptınız.' }, { status: 400 })
  }

  const { error: insertError } = await supabase
    .from('breeding_applications')
    .insert({
      listing_id: id,
      applicant_pet_id,
      applicant_user_id: user.id,
      owner_user_id: listing.user_id,
      message: message || null,
      kvkk_consent: true,
      kvkk_consent_at: new Date().toISOString()
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: applicantPet } = await supabase
    .from('pets')
    .select('name')
    .eq('id', applicant_pet_id)
    .single()

  await supabase.from('notification_jobs').insert({
    user_id: listing.user_id,
    pet_id: applicant_pet_id,
    job_type: 'new_breeding_application',
    payload: { 
      listing_id: id, 
      applicant_pet_name: applicantPet?.name || 'Bir patili dost', 
      listing_title: listing.title 
    },
    scheduled_for: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}
