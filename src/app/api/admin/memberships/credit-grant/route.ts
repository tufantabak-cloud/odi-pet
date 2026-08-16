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

  const { user_ids, target_mode, days, reason, note } = await req.json()

  let targetUserIds: string[] = []

  if (target_mode) {
    const nowISO = new Date().toISOString()
    const in30DaysISO = new Date(Date.now() + 30 * 86400000).toISOString()
    let query = adminSupabase.from('profiles').select('id')

    if (target_mode === 'all') {
      const { data: matchedProfiles } = await adminSupabase.from('profiles').select('id')
      targetUserIds = matchedProfiles?.map(p => p.id) ?? []
    } else if (['free', 'active_premium', 'churn_risk'].includes(target_mode)) {
      const { data: subs } = await adminSupabase.from('user_subscriptions').select('profile_id, plan, status');
      const proIds = subs?.filter(s => ['pro', 'ai_plus'].includes(s.plan) && s.status === 'active').map(s => s.profile_id) || [];
      
      if (target_mode === 'active_premium' || target_mode === 'churn_risk') {
        targetUserIds = proIds;
      } else if (target_mode === 'free') {
        const { data: allProfiles } = await adminSupabase.from('profiles').select('id');
        targetUserIds = (allProfiles || []).map(p => p.id).filter(id => !proIds.includes(id));
      }
    } else {
      let query = adminSupabase.from('profiles').select('id')
      if (target_mode === 'role_owner') {
        query = query.eq('role', 'owner')
      } else if (target_mode === 'role_vet') {
        query = query.eq('role', 'vet')
      } else if (target_mode === 'role_admin') {
        query = query.in('role', ['admin', 'founder'])
      }
      const { data: matchedProfiles, error: queryErr } = await query
      if (queryErr) {
        return NextResponse.json({ error: `Grup kullanıcıları getirilemedi: ${queryErr.message}` }, { status: 500 })
      }
      targetUserIds = matchedProfiles?.map(p => p.id) ?? []
    }
  } else if (Array.isArray(user_ids) && user_ids.length > 0) {
    // Çözümleme: E-posta adresi veya UUID girilmiş olabilir
    const emails = user_ids.filter((item: string) => item.includes('@'))
    const rawIds = user_ids.filter((item: string) => !item.includes('@'))

    targetUserIds = [...rawIds]

    if (emails.length > 0) {
      const { data: foundByEmail } = await adminSupabase
        .from('profiles')
        .select('id')
        .in('email', emails)

      if (foundByEmail) {
        targetUserIds.push(...foundByEmail.map(p => p.id))
      }
    }
  }

  // Benzersizleştir
  targetUserIds = Array.from(new Set(targetUserIds))

  if (targetUserIds.length === 0) {
    return NextResponse.json({ error: 'İşlem yapılacak kullanıcı bulunamadı.' }, { status: 400 })
  }

  const creditDays = Number(days)
  if (isNaN(creditDays) || creditDays <= 0 || creditDays > 36500) {
    return NextResponse.json({ error: 'Geçerli bir gün sayısı giriniz (1 - 36500 gün).' }, { status: 400 })
  }

  const creditReason = reason || 'campaign'
  const timestamp = Date.now()
  const results: Array<{ userId: string; success: boolean; error?: string }> = []

  for (const targetUserId of targetUserIds) {
    const idempotencyKey = `admin_grant:${timestamp}:${targetUserId}`

    // 1. RPC çağrısı
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
      console.error(`[AdminCreditGrant] RPC failed for user ${targetUserId}:`, rpcError.message);
      results.push({ userId: targetUserId, success: false, error: rpcError.message });
      continue;
    }

    results.push({ userId: targetUserId, success: true })
  }

  const successCount = results.filter(r => r.success).length

  if (successCount === 0 && results.length > 0) {
    const firstErr = results.find(r => r.error)?.error || 'Kredilendirme işlemi gerçekleştirilemedi.'
    return NextResponse.json({ error: firstErr }, { status: 500 })
  }

  // Audit log kaydı at
  try {
    await adminSupabase.from('audit_logs').insert({
      admin_id: user.id,
      action: 'BULK_CREDIT_GRANT',
      target_type: 'membership_credits',
      details: {
        total_targets: targetUserIds.length,
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
