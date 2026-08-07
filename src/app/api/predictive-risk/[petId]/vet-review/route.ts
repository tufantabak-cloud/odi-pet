import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'

async function vetReviewHandler(req: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { riskId } = await req.json()
  if (!riskId) return NextResponse.json({ error: 'Missing riskId' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { petId } = await params

  // Check if review already exists
  const { data: existing } = await supabase.from('vet_reviews').select('id').eq('risk_id', riskId).single()
  if (existing) {
    return NextResponse.json({ success: true, message: 'Review already requested' })
  }

  // 3. INSTANT ASSIGN (SİHİR BURADA)
  // Online ve müsait veteriner bul (son 2 dakikada aktif olanlar)
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  
  const { data: availableVets } = await supabase
    .from('vet_status')
    .select('vet_id')
    .eq('is_online', true)
    .gte('last_active_at', twoMinsAgo)
    .order('current_load', { ascending: true })
    .limit(1)

  const selectedVetId = availableVets && availableVets.length > 0 ? availableVets[0].vet_id : null;
  const isInstant = !!selectedVetId;

  const { data, error } = await supabase
    .from('vet_reviews')
    .insert({
      profile_id: user.id,
      pet_id: petId,
      risk_id: riskId,
      status: isInstant ? 'in_review' : 'pending',
      vet_id: selectedVetId,
      claimed_at: isInstant ? new Date().toISOString() : null,
      sla_status: isInstant ? 'instant' : null
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  // Yükü artır
  if (isInstant) {
    await supabase.rpc('increment_vet_load', { p_vet_id: selectedVetId })
  }

  return NextResponse.json({ success: true, data, isInstant })
}

export const POST = withAPIFeatureGuard('ai_vet', vetReviewHandler);
