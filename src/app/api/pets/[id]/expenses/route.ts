import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
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

  const { data, error } = await supabase
    .from('pet_expenses')
    .select('*')
    .eq('pet_id', id)
    .order('date', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  return NextResponse.json({ expenses: data ?? [] })
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
  const { amount, category, date, description } = body

  if (!amount || !category) {
    return NextResponse.json({ error: 'Tutar ve kategori zorunludur.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('pet_expenses')
    .insert({
      pet_id: id,
      user_id: user.id,
      amount: Number(amount),
      category,
      date: date || new Date().toISOString().split('T')[0],
      description: description || null,
    })

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath('/owner/dashboard')
  // @ts-expect-error
    revalidateTag('dashboard')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}
