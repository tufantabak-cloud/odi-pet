import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const email    = (fd.get('email')    as string)?.trim()
  const password = (fd.get('password') as string)?.trim()

  if (!email || !password) {
    return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 })
  }

  // Response nesnesini önceden oluşturuyoruz ki Supabase cookie'leri ona yazabilsin
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Auth cookie'lerini response'a yaz
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
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
