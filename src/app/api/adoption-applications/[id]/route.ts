import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

const patchSchema = z.object({
  status: z.enum(['approved', 'rejected'])
})

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()
  
  const body = await req.json()
  const result = patchSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const { status } = result.data

  // İlan sahibi kontrolü
  const { data: application, error: fetchError } = await supabase
    .from('adoption_applications')
    .select(`
      id,
      applicant_id,
      pet_adoptions (
        pet_id,
        user_id,
        pet_owners (
          profile_id
        )
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 })
  }

  // Sahip doğrulaması
  const adoptions = application.pet_adoptions as any
  const listingOwnerId = Array.isArray(adoptions) 
    ? adoptions[0]?.user_id 
    : adoptions?.user_id

  const petId = Array.isArray(adoptions) 
    ? adoptions[0]?.pet_id 
    : adoptions?.pet_id

  let isOwner = false
  if (listingOwnerId === user.id) {
    isOwner = true
  } else {
    // Check pet_owners array
    const owners = Array.isArray(adoptions) 
      ? adoptions[0]?.pet_owners 
      : adoptions?.pet_owners
      
    if (Array.isArray(owners)) {
      isOwner = owners.some((o: any) => o.profile_id === user.id)
    } else if (owners && typeof owners === 'object') {
      isOwner = owners.profile_id === user.id
    }
  }

  if (!isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error: updateError } = await supabase
    .from('adoption_applications')
    .update({ status })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Bildirim başvurana (try/catch)
  try {
    await supabase.from('notification_jobs').insert({
      user_id: application.applicant_id,
      pet_id: petId,
      job_type: status === 'approved' ? 'adoption_approved' : 'adoption_rejected',
      payload: {
        title: status === 'approved' ? 'Başvurunuz Onaylandı! 🎉' : 'Başvurunuz Değerlendirildi'
      },
      scheduled_for: new Date().toISOString()
    })
  } catch (err) {
    console.error('Notification error', err)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // applicant_id = user.id ve status = 'pending' kontrolü
  const { data: application, error: fetchError } = await supabase
    .from('adoption_applications')
    .select('id, applicant_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 })
  }

  if (application.applicant_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (application.status !== 'pending') {
    return NextResponse.json({ error: 'Sadece bekleyen başvurular iptal edilebilir.' }, { status: 400 })
  }

  // Soft delete (status = 'cancelled')
  const { error: updateError } = await supabase
    .from('adoption_applications')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
