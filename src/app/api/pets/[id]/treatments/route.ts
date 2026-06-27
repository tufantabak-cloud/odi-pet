import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const treatmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  plan_id: z.string().uuid().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('health_treatments')
    .select('*')
    .eq('pet_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = treatmentSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: treatment, error } = await supabase
    .from('health_treatments')
    .insert({
      pet_id: id,
      title: result.data.title,
      description: result.data.description,
      start_date: result.data.start_date || new Date().toISOString(),
      end_date: result.data.end_date,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (result.data.plan_id) {
    // Update the associated care plan
    const { data: plan } = await supabase
      .from('care_plans')
      .select('extra_data')
      .eq('id', result.data.plan_id)
      .single()

    const newExtraData = {
      ...(plan?.extra_data && typeof plan.extra_data === 'object' ? plan.extra_data : {}),
      treatment_id: treatment.id
    }

    await supabase
      .from('care_plans')
      .update({ status: 'completed', extra_data: newExtraData })
      .eq('id', result.data.plan_id)
  }

  return NextResponse.json({ success: true, treatment })
}
