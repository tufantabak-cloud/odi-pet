import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Supabase hata parametresi varsa (ör: flow_state_already_used)
  if (error) {
    console.error('[auth/callback] Supabase hatası:', error, errorDescription)

    // Kullanıcıya anlamlı Türkçe mesaj ver
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

  // next parametresini al — sadece relative path kabul et (open-redirect önlemi)
  const rawNext = requestUrl.searchParams.get('next') ?? '/owner/dashboard'
  const next = rawNext.startsWith('/') ? rawNext : '/owner/dashboard'

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
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession hatası:', exchangeError.message)
    return NextResponse.redirect(
      new URL(
        `/login?message=${encodeURIComponent('Doğrulama başarısız: ' + exchangeError.message)}`,
        req.url
      )
    )
  }

  return response
}
