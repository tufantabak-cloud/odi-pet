import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const name     = (fd.get('name')     as string)?.trim()
  const email    = (fd.get('email')    as string)?.trim()
  const password = (fd.get('password') as string)?.trim()

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
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
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Dinamik callback URL — production'da NEXT_PUBLIC_SITE_URL kullan,
  // local'de request origin'inden türet (localhost:3000)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${req.headers.get('x-forwarded-proto') ?? 'http'}://${req.headers.get('host')}`

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
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return response
}
