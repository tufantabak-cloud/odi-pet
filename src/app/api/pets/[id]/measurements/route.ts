import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const measurementSchema = z.object({
  measurement_type: z.string().min(1, 'Measurement type is required'),
  value: z.number(),
  unit: z.string().min(1, 'Unit is required'),
  measured_at: z.string().optional(),
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
    .from('health_measurements')
    .select('*')
    .eq('pet_id', id)
    .order('measured_at', { ascending: false })

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
  const result = measurementSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: measurement, error } = await supabase
    .from('health_measurements')
    .insert({
      pet_id: id,
      measurement_type: result.data.measurement_type,
      value: result.data.value,
      unit: result.data.unit,
      measured_at: result.data.measured_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, measurement })
}
