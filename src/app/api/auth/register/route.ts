import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getIP, registerRateLimit, verifyTurnstile } from '@/lib/auth-security'
import { registerSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate Limiting Check
  const { success } = await registerRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Çok fazla kayıt denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
  }

  const fd = await req.formData()
  const data = Object.fromEntries(fd.entries());
  
  const parsed = registerSchema.safeParse({
    ...data,
    terms: String(data.terms) === 'on' || String(data.terms) === 'true',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { name, email, password, turnstileToken } = parsed.data;

  // Turnstile Verification
  const isHuman = await verifyTurnstile(turnstileToken, ip);
  if (!isHuman) {
    return NextResponse.json({ error: 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.' }, { status: 400 })
  }

  // Response nesnesini önceden oluşturuyoruz
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

  // Dinamik callback URL — production'da NEXT_PUBLIC_SITE_URL kullan,
  // local'de request origin'inden türet (localhost:3000)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${req.headers.get('host')}`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=/owner/dashboard`,
      data: {
        first_name: name
      }
    }
  })

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 400 })
  }

  return response
}
