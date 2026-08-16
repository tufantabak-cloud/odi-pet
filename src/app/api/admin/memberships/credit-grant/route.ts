import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { Client } from 'pg'
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

    // 1. Direct PostgreSQL RPC çağrısı (PGRST202 Bypass)
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    const pgClient = new Client({ connectionString: dbUrl })
    
    try {
      await pgClient.connect()
    } catch (dbErr: any) {
      console.error(`[AdminCreditGrant] PostgreSQL connection failed:`, dbErr.message)
      results.push({ userId: targetUserId, success: false, error: 'Veritabanı bağlantısı kurulamadı.' })
      continue
    }

    try {
      await pgClient.query(
        `SELECT public.grant_membership_credit($1::uuid, $2::integer, $3::text, $4::text, $5::jsonb);`,
        [
          targetUserId,
          creditDays,
          creditReason,
          idempotencyKey,
          JSON.stringify({
            granted_by: user.id,
            note: note || 'Admin tarafından toplu/tekil hediye edildi.',
            granted_at: new Date().toISOString(),
          })
        ]
      )
      results.push({ userId: targetUserId, success: true })
    } catch (rpcError: any) {
      console.error(`[AdminCreditGrant] PostgreSQL RPC failed for user ${targetUserId}:`, rpcError.message)
      results.push({ userId: targetUserId, success: false, error: rpcError.message })
    } finally {
      await pgClient.end()
    }
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
