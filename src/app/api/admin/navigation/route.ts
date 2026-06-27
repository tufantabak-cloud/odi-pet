import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const navSchema = z.object({
  label: z.string().min(1).max(50),
  icon: z.string().min(1),
  href: z.string().min(1),
  slot: z.enum(['bottom_nav', 'action_menu', 'menu_drawer']),
  order_index: z.number().optional()
})

export async function GET() {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const { data: items, error: itemsError } = await supabase
    .from('navigation_items')
    .select('*')
    .order('slot', { ascending: true })
    .order('order_index', { ascending: true })

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const { data: pages, error: pagesError } = await supabase
    .from('navigation_pages')
    .select('*')
    .order('created_at', { ascending: false })

  if (pagesError) {
    return NextResponse.json({ error: pagesError.message }, { status: 500 })
  }

  return NextResponse.json({ items, pages })
}

export async function POST(req: Request) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = navSchema.parse(body)

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('navigation_items')
      .insert({
        label: parsed.label,
        icon: parsed.icon,
        href: parsed.href,
        slot: parsed.slot,
        order_index: parsed.order_index ?? 0,
        is_active: true,
        match_type: 'exact'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}
