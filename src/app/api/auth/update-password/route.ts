import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getIP, updatePasswordRateLimit, verifyTurnstile } from '@/lib/auth-security'
import { updatePasswordSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // Rate Limiting Check
  const { success } = await updatePasswordRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Çok fazla şifre güncelleme denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
  }

  const fd = await req.formData()
  const data = Object.fromEntries(fd.entries());

  const parsed = updatePasswordSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { password, turnstileToken } = parsed.data;

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

  // Verify user is authenticated (they followed the reset link)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturumunuz bulunamadı. Lütfen şifre sıfırlama bağlantısını tekrar kullanın.' }, { status: 401 })
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return NextResponse.json({ error: 'Şifre güncellenemedi. Lütfen tekrar deneyin.' }, { status: 400 })
  }

  return response
}
