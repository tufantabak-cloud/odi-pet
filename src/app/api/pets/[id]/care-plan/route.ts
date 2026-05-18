import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Sahiplik veya aile üyesi kontrolü (RLS halledebilir ama açıkça kontrol etmek iyidir)
  const { data: plan, error } = await supabase
    .from('care_plans')
    .select('plan_data')
    .eq('pet_id', id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan_data: plan?.plan_data || null })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_data } = await request.json()

  const supabase = await createServerSupabaseClient()

  // Upsert care plan
  const { data, error } = await supabase
    .from('care_plans')
    .upsert({ 
      pet_id: id, 
      plan_data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'pet_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
