import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSafeRelativeRedirect } from '@/lib/security/redirect'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Runtime Allow-List for Email OTP Types ──────────────────────────────────
// TypeScript `as EmailOtpType` cast'i URL parametrelerini runtime'da doğrulamaz.
// Bu Set, yalnızca Supabase tarafından desteklenen geçerli tipleri kabul eder.
const VALID_EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'email',
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email_change',
])

function isValidEmailOtpType(value: string): value is EmailOtpType {
  return VALID_EMAIL_OTP_TYPES.has(value as EmailOtpType)
}

// ── Kullanıcı Dostu Türkçe Hata Mesajları ───────────────────────────────────
// Supabase'in ham İngilizce kütüphane mesajlarını normalize eder.
function getLocalizedAuthError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase()

  if (msg.includes('pkce') || msg.includes('code verifier not found')) {
    return 'Doğrulama bağlantısı farklı bir cihaz veya tarayıcıda açıldı. Lütfen kayıt olduğunuz tarayıcıyı kullanın veya hesabınıza doğrudan giriş yapmayı deneyin.'
  }
  if (msg.includes('flow_state_already_used') || msg.includes('already used')) {
    return 'Bu doğrulama bağlantısı zaten kullanılmış. Lütfen giriş yapmayı deneyin veya yeni bir doğrulama e-postası isteyin.'
  }
  if (msg.includes('expired') || msg.includes('otp_expired')) {
    return 'Doğrulama bağlantısının süresi dolmuş. Lütfen yeni bir doğrulama e-postası isteyin.'
  }
  if (msg.includes('invalid') || msg.includes('otp_disabled')) {
    return 'Doğrulama bağlantısı geçersiz. Lütfen tekrar giriş yapmayı deneyin veya yeni bir doğrulama e-postası isteyin.'
  }

  // Bilinmeyen hatalar için genel mesaj — ham Supabase mesajı kullanıcıya sızmaz.
  return 'Doğrulama işlemi başarısız oldu. Lütfen tekrar giriş yapmayı deneyin.'
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // ── 1. Supabase hata parametresi varsa (ör: flow_state_already_used) ──
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

  // ── 2. Ambiguous Callback Reddi: code + token_hash birlikte gelirse ──
  if (code && tokenHash) {
    console.error('[auth/callback] Ambiguous callback: hem code hem token_hash mevcut — reddedildi.')
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent('Geçersiz doğrulama bağlantısı. Lütfen tekrar giriş yapmayı deneyin.')}`,
        req.url
      )
    )
  }

  // ── 3. token_hash var ama type eksik veya geçersiz → Reject ──
  if (tokenHash && (!type || !isValidEmailOtpType(type))) {
    console.error('[auth/callback] token_hash mevcut fakat type eksik veya geçersiz:', type)
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent('Geçersiz doğrulama bağlantısı. Lütfen tekrar giriş yapmayı deneyin.')}`,
        req.url
      )
    )
  }

  // ── 4. Hiç parametre yoksa → Reject ──
  if (!code && !tokenHash) {
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent('Doğrulama bağlantısı eksik veya bozuk. Lütfen e-postanızdaki bağlantıyı tekrar deneyin.')}`,
        req.url
      )
    )
  }

  // ── Response ve Supabase Client Hazırlığı ──
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

  // ── 5. Dual-Path Authentication ──
  let sessionData: { user: { id: string } | null } | null = null
  let authError: Error | null = null

  if (tokenHash && type && isValidEmailOtpType(type)) {
    // ── Path A: OTP / Token Hash Doğrulama (Cross-device uyumlu) ──
    const { error: otpError, data: otpData } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (otpError) {
      authError = otpError
    } else {
      sessionData = otpData?.session ? { user: otpData.session.user } : null
    }
  } else if (code) {
    // ── Path B: PKCE Code Exchange (Standart akış) ──
    const { error: exchangeError, data: exchangeData } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      authError = exchangeError
    } else {
      sessionData = exchangeData ? { user: exchangeData.user } : null
    }
  }

  // ── 6. Hata Kontrolü ──
  if (authError) {
    const rawMessage = authError instanceof Error ? authError.message : String(authError)
    console.error('[auth/callback] Doğrulama hatası:', rawMessage)
    const localizedMessage = getLocalizedAuthError(rawMessage)
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent(localizedMessage)}`,
        req.url
      )
    )
  }

  // ── Mevcut Yeni Kullanıcı Lifecycle Başlatma (AI+ 60 gün → PRO 60 gün → FREE) ──
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
        })

        await adminClient
          .from('profiles')
          .update({ premium_tier: 'ai_plus', premium_until: proEnd.toISOString() })
          .eq('id', userId)

        await adminClient.from('membership_events').insert({
          profile_id:    userId,
          event_type:    'WELCOME_GRANTED',
          previous_plan: null,
          new_plan:      'ai_plus',
          provider:      'referral',
          metadata:      { ai_plus_days: 60, pro_days: 60, reason: 'WELCOME_PROMOTION', source: 'callback_fallback' },
        })

      }
    }
  } catch (lifecycleErr) {
    // Non-blocking — lifecycle hatası kayıt akışını durdurmaz
    console.error('[auth/callback] lifecycle grant error (non-blocking):', lifecycleErr)
  }
  // ─────────────────────────────────────────────────────────────────────────

  return response
}
