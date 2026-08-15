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

  // ── FORENSIC DÜZELTME: BOLA engeli (pet_id/risk_id doğrulaması) ────────
  // Önceden `petId` (path) ve `riskId` (body) hiçbir sahiplik kontrolünden
  // geçmeden doğrudan `vet_reviews.insert`'e yazılıyordu. `vet_reviews`
  // RLS'i yalnızca `profile_id = auth.uid()` şartını kontrol ediyor
  // (WITH CHECK verilmediği için USING otomatik WITH CHECK olarak da
  // uygulanır) — `pet_id`/`risk_id` sütunları RLS tarafından hiç
  // kısıtlanmıyor. Bu nedenle risk kaydını, session-bound (RLS'e tabi)
  // client ile `predictive_insights` üzerinden okuyup:
  //   1) kaydın var olduğunu VE çağıran kullanıcının bu pet üzerinde
  //      gerçek erişimi olduğunu ("Owners manage their predictive
  //      insights" RLS politikası: pet_owners üyeliği) kanıtlıyoruz,
  //   2) döndürülen `pet_id`'nin path'teki `petId` ile eşleştiğini
  //      doğruluyoruz (path/body tutarsızlığını engeller).
  // Eşleşmeyen veya erişilemeyen (RLS tarafından gizlenen) riskId'ler
  // 403/404 ile reddedilir. Insert'te pet_id artık path/body'den değil,
  // bu doğrulanmış DB kaydından alınır.
  const { data: insight, error: insightError } = await supabase
    .from('predictive_insights')
    .select('id, pet_id')
    .eq('id', riskId)
    .maybeSingle()

  if (insightError || !insight) {
    return NextResponse.json({ error: 'Risk kaydı bulunamadı veya erişim yetkiniz yok.' }, { status: 404 })
  }

  if (insight.pet_id !== petId) {
    return NextResponse.json({ error: 'Risk kaydı belirtilen pet ile eşleşmiyor.' }, { status: 403 })
  }

  const verifiedPetId = insight.pet_id

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
      pet_id: verifiedPetId,
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
