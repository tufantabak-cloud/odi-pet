import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// PATCH — güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('vaccine_protocols')
    .update(body)
    .eq('id', resolvedParams.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE — soft delete (is_active = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('vaccine_protocols')
    .update({ is_active: false })
    .eq('id', resolvedParams.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
