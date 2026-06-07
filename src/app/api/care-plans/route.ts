import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const body = await req.json().catch(() => null)

  // FormData'dan da gelebilir
  let petId: string | null = null
  let title: string | null = null
  let dueDate: string | null = null
  let description: string | null = null

  if (body) {
    petId = body.pet_id
    title = body.title
    dueDate = body.due_date
    description = body.description
  } else {
    const fd = await req.formData()
    petId = fd.get('pet_id') as string
    title = fd.get('title') as string
    dueDate = fd.get('due_date') as string
    description = fd.get('description') as string | null
  }

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user.id)
  const clinicId = memberships?.[0]?.clinic_id

  if (!clinicId) return NextResponse.json({ error: 'No clinic membership' }, { status: 403 })

  const { error } = await supabase.from('care_plans').insert({
    pet_id: petId,
    clinic_id: clinicId,
    title,
    description: description || null,
    due_date: dueDate,
  })

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath('/clinic/care-plans')
  revalidatePath('/clinic/pets')

  return NextResponse.redirect(req.headers.get('referer') ?? '/clinic/care-plans', 303)
}
