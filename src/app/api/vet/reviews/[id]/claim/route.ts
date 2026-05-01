import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { id } = params
  
  // MOCK: Vet ID would come from session
  const vetId = (await req.json()).vetId || '00000000-0000-0000-0000-000000000001'

  // CLAIM MEKANİZMASI (KRİTİK) - Atomic update where status = 'pending'
  const { data, error } = await supabase
    .from('vet_reviews')
    .update({ 
      status: 'in_review',
      vet_id: vetId
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error || !data) {
    // If no data returned, it was either not found or already claimed (status != pending)
    return NextResponse.json({ error: 'Review already claimed or not found' }, { status: 409 })
  }

  // Load fix: increment load upon claim
  await supabase.rpc('increment_vet_load', { p_vet_id: vetId })

  return NextResponse.json({ success: true, data })
}
