import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()

  // Admin / Founder yetki kontrolü
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
    return NextResponse.json({ error: 'Forbidden: Admin yetkisi gerekli' }, { status: 403 })
  }

  const { user_ids, days, reason, note } = await req.json()

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: 'En az 1 kullanıcı seçilmelidir.' }, { status: 400 })
  }

  const creditDays = Number(days)
  if (isNaN(creditDays) || creditDays <= 0 || creditDays > 365) {
    return NextResponse.json({ error: 'Geçerli bir gün sayısı giriniz (1-365).' }, { status: 400 })
  }

  const creditReason = reason || 'campaign'
  const timestamp = Date.now()
  const results: Array<{ userId: string; success: boolean; error?: string }> = []

  for (const targetUserId of user_ids) {
    const idempotencyKey = `admin_grant:${timestamp}:${targetUserId}`
    const { error: rpcError } = await adminSupabase.rpc('grant_membership_credit', {
      p_profile_id: targetUserId,
      p_days: creditDays,
      p_reason: creditReason,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        granted_by: user.id,
        note: note || 'Admin tarafından toplu/tekil hediye edildi.',
        granted_at: new Date().toISOString(),
      },
    })

    if (rpcError) {
      console.error(`[AdminCreditGrant] Failed for ${targetUserId}:`, rpcError)
      results.push({ userId: targetUserId, success: false, error: rpcError.message })
    } else {
      results.push({ userId: targetUserId, success: true })
    }
  }

  const successCount = results.filter(r => r.success).length

  // Audit log kaydı at
  try {
    await adminSupabase.from('audit_logs').insert({
      admin_id: user.id,
      action: 'BULK_CREDIT_GRANT',
      target_type: 'membership_credits',
      details: {
        total_targets: user_ids.length,
        successful_grants: successCount,
        days_per_user: creditDays,
        reason: creditReason,
        note,
      },
    })
  } catch {
    // Tablo yoksa uygulamanın akışını bozma
  }

  return NextResponse.json({
    success: true,
    count: successCount,
    totalDays: successCount * creditDays,
    results,
  })
}
