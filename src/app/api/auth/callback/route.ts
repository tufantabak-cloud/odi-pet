import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSafeRelativeRedirect } from '@/lib/security/redirect'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Supabase hata parametresi varsa (ör: flow_state_already_used)
  if (error) {
    console.error('[auth/callback] Supabase hatası:', error, errorDescription)

    let message = 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'
    if (error === 'invalid_request' && errorDescription?.includes('flow_state_already_used')) {
      message = 'Bu doğrulama bağlantısı zaten kullanılmış. Lütfen giriş yapmayı deneyin veya yeni bir kayıt bağlantısı isteyin.'
    }

    return NextResponse.redirect(
      new URL(`/login?message=${encodeURIComponent(message)}`, req.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?message=Doğrulama+kodu+bulunamadı', req.url)
    )
  }

  const next = getSafeRelativeRedirect(requestUrl.searchParams.get('next'))
  const response = NextResponse.redirect(new URL(next, req.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
            }
            response.cookies.set(name, value, secureOptions)
          })
        },
      },
    }
  )

  const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession hatası:', exchangeError.message)
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent('Doğrulama başarısız: ' + exchangeError.message)}`,
        req.url
      )
    )
  }

  // ── Yeni Kullanıcı Lifecycle Başlatma (AI+ 60 gün → PRO 60 gün → FREE) ──
  // Supabase trigger (handle_new_user_subscription) bunu otomatik yapmalı.
  // Fallback: trigger yoksa ya da başarısız olursa buradan başlatılır.
  try {
    const userId = sessionData?.user?.id
    if (userId) {
      const adminClient = createAdminSupabaseClient()
      const { data: existing } = await adminClient
        .from('user_subscriptions')
        .select('id, ai_plus_until')
        .eq('profile_id', userId)
        .maybeSingle()

      if (!existing) {
        // Subscription hiç oluşturulmamış — fallback grant
        const now = new Date()
        const aiPlusEnd = new Date(now.getTime() + 60 * 86400000)
        const proEnd    = new Date(aiPlusEnd.getTime() + 60 * 86400000)

        await adminClient.from('user_subscriptions').insert({
          profile_id:          userId,
          plan:                'ai_plus',
          status:              'active',
          provider:            'referral',
          reason:              'WELCOME_PROMOTION',
          ai_plus_until:       aiPlusEnd.toISOString(),
          pro_until:           proEnd.toISOString(),
          current_period_end:  proEnd.toISOString(),
          earned_days:         0,
        } as any)

        await adminClient
          .from('profiles')
          .update({ premium_tier: 'ai_plus', premium_until: proEnd.toISOString() } as any)
          .eq('id', userId)

        await adminClient.from('membership_events').insert({
          profile_id:    userId,
          event_type:    'WELCOME_GRANTED',
          previous_plan: null,
          new_plan:      'ai_plus',
          provider:      'referral',
          metadata:      { ai_plus_days: 60, pro_days: 60, reason: 'WELCOME_PROMOTION', source: 'callback_fallback' },
        })

        console.log('[auth/callback] Welcome AI+ lifecycle granted for new user:', userId)
      }
    }
  } catch (lifecycleErr) {
    // Non-blocking — lifecycle hatası kayıt akışını durdurmaz
    console.error('[auth/callback] lifecycle grant error (non-blocking):', lifecycleErr)
  }
  // ─────────────────────────────────────────────────────────────────────────

  return response
}
