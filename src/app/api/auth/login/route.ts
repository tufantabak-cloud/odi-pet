import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getIP, loginRateLimit, verifyTurnstile } from '@/lib/auth-security'
import { loginSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate Limiting Check
  const { success, reset } = await loginRateLimit.limit(ip);
  if (!success) {
    const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json({ 
      error: `Çok fazla hatalı giriş denemesi. Lütfen ${waitSeconds} saniye sonra tekrar deneyin.`,
      reset 
    }, { status: 429 })
  }

  const fd = await req.formData()
  const data = Object.fromEntries(fd.entries());
  
  const parsed = loginSchema.safeParse({
    ...data,
    rememberMe: data.rememberMe === 'true',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { email, password, turnstileToken, rememberMe } = parsed.data;

  // Turnstile Verification
  const isHuman = await verifyTurnstile(turnstileToken, ip);
  if (!isHuman) {
    return NextResponse.json({ error: 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.' }, { status: 400 })
  }

  // Response nesnesini önceden oluşturuyoruz ki Supabase cookie'leri ona yazabilsin
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Auth cookie'lerini response'a yaz
          cookiesToSet.forEach(({ name, value, options }) => {
            if (!rememberMe) {
              // Beni hatırla seçili değilse session cookie yap
              delete options.maxAge;
              delete options.expires;
            }
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

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if ((error instanceof Error ? error.message : String(error)).includes('Email not confirmed')) {
      return NextResponse.json({ error: 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 })
  }

  // Strict E3 check (Eğer Supabase'te confirm zorunlu değilse bile biz enforce edebiliriz)
  if (authData?.user && !authData.user.email_confirmed_at) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.' }, { status: 403 })
  }

  // Cookie'leri içeren response'u döndür
  return response
}
