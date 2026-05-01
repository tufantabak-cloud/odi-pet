import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, name, segment } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email zorunlu' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('beta_signups')
    .insert({ email, name: name ?? null, segment: segment ?? null })

  if (error) {
    const isdup = error.code === '23505'
    return NextResponse.json(
      { error: isdup ? 'Bu email zaten kayıtlı.' : error.message },
      { status: isdup ? 409 : 500 }
    )
  }
  return NextResponse.json({ success: true })
}
