import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json()
  const { status } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Geçersiz statü.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: application, error: fetchError } = await supabase
    .from('breeding_applications')
    .select('*, breeding_listings(title, pet_id)')
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 })
  }

  if (application.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error: updateError } = await supabase
    .from('breeding_applications')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const listingTitle = Array.isArray(application.breeding_listings) 
    ? application.breeding_listings[0]?.title 
    : application.breeding_listings?.title

  if (status === 'approved') {
    await supabase.from('notification_jobs').insert({
      user_id: application.applicant_user_id,
      pet_id: application.applicant_pet_id,
      job_type: 'application_approved',
      payload: { 
        listing_title: listingTitle || 'İlanınız'
      },
      scheduled_for: new Date().toISOString()
    })

    // Write timeline entry for applicant pet
    await supabase.from('pet_journal_entries').insert({
      pet_id: application.applicant_pet_id,
      user_id: application.applicant_user_id,
      entry_type: 'note',
      note: `Eşleştirme Başvurusu Onaylandı ✅\n"${listingTitle || 'İlan'}" başvurunuz kabul edildi.`,
      data: {}
    })

    // Write timeline entry for listing owner pet
    const listingPetId = Array.isArray(application.breeding_listings)
      ? application.breeding_listings[0]?.pet_id
      : application.breeding_listings?.pet_id

    if (listingPetId) {
      await supabase.from('pet_journal_entries').insert({
        pet_id: listingPetId,
        user_id: user.id,
        entry_type: 'note',
        note: `Eşleştirme Başvurusu Onaylandı ✅\nİlanınıza gelen bir başvuruyu kabul ettiniz.`,
        data: {}
      })
    }
  } else if (status === 'rejected') {
    await supabase.from('notification_jobs').insert({
      user_id: application.applicant_user_id,
      pet_id: application.applicant_pet_id,
      job_type: 'application_rejected',
      payload: { 
        listing_title: listingTitle || 'İlanınız'
      },
      scheduled_for: new Date().toISOString()
    })
  }

  return NextResponse.json({ success: true })
}
