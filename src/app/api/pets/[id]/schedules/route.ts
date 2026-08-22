import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.string().default('upcoming'),
  metadata: z.any().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('profile_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('health_schedules')
    .select('*')
    .eq('pet_id', id)
    .eq('plan_type', 'vet_process')
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('profile_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = scheduleSchema.parse(body)

    const { data, error } = await supabase
      .from('health_schedules')
      .insert({
        pet_id: id,
        plan_type: 'vet_process',
        category: 'Klinik Süreç',
        title: validatedData.title,
        due_date: validatedData.due_date,
        status: validatedData.status,
        metadata: validatedData.metadata,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status: 400 })
  }
}
