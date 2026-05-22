import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getIP, resetRateLimit, verifyTurnstile } from '@/lib/auth-security'
import { resetPasswordSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate Limiting Check
  if (resetRateLimit) {
    const { success } = await resetRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Çok fazla şifre sıfırlama denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
    }
  }

  const fd = await req.formData()
  const data = Object.fromEntries(fd.entries());
  
  const parsed = resetPasswordSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { email, turnstileToken } = parsed.data;

  // Turnstile Verification
  const isHuman = await verifyTurnstile(turnstileToken, ip);
  if (!isHuman) {
    return NextResponse.json({ error: 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.' }, { status: 400 })
  }

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/update-password`,
  })

  if (error) {
    return NextResponse.json({ error: error.message || 'Şifre sıfırlama e-postası gönderilemedi.' }, { status: 400 })
  }

  return response
}
