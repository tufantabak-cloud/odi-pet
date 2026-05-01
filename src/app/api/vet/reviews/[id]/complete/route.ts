import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { id } = params
  
  const body = await req.json()
  const { approved = true, note = '', vetId } = body

  if (!vetId) return NextResponse.json({ error: 'Missing vetId' }, { status: 400 })

  // 1. Fetch the review to ensure it belongs to the vet and is in_review
  const { data: review, error: reviewErr } = await supabase
    .from('vet_reviews')
    .select('*')
    .eq('id', id)
    .eq('status', 'in_review')
    .eq('vet_id', vetId)
    .single()

  if (reviewErr || !review) {
    return NextResponse.json({ error: 'Review not found, not claimed by you, or already completed' }, { status: 400 })
  }

  // 4. VET AKSİYON - Update review status
  await supabase
    .from('vet_reviews')
    .update({ status: approved ? 'approved' : 'rejected' })
    .eq('id', id)

  // Insert into verifications
  const { error: verifErr } = await supabase
    .from('vet_verifications')
    .insert({
      risk_id: review.risk_id,
      vet_id: vetId,
      approved: approved,
      note: note
    })

  // 5. GELİR MODELİ - Insert into vet_earnings (₺50 payout per review)
  const { error: earnErr } = await supabase
    .from('vet_earnings')
    .insert({
      vet_id: vetId,
      review_id: id,
      amount: 50.00,
      status: 'pending'
    })

  if (verifErr || earnErr) {
    console.error('Vet Action Error:', verifErr || earnErr)
  }

  // Load fix: decrement load upon complete
  await supabase.rpc('decrement_vet_load', { p_vet_id: vetId })

  return NextResponse.json({ success: true })
}
