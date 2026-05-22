import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getIP, loginRateLimit, verifyTurnstile } from '@/lib/auth-security'
import { loginSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate Limiting Check
  if (loginRateLimit) {
    const { success, pending, limit, reset, remaining } = await loginRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Çok fazla giriş denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
    }
  }

  const fd = await req.formData()
  const data = Object.fromEntries(fd.entries());
  
  const parsed = loginSchema.safeParse(data);

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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 })
  }

  // Cookie'leri içeren response'u döndür
  return response
}
