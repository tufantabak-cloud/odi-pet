import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import {
  getIP,
  registerRateLimit,
  verifyTurnstile,
} from '@/lib/auth-security'
import { clinicRegisterSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const { success: withinLimit } = await registerRateLimit.limit(`clinic:${ip}`)

  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Çok fazla kayıt denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' },
      { status: 429 }
    )
  }

  const formData = await req.formData()
  const rawData = Object.fromEntries(formData.entries())
  const parsed = clinicRegisterSchema.safeParse({
    ...rawData,
    terms: String(rawData.terms) === 'on' || String(rawData.terms) === 'true',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const isHuman = await verifyTurnstile(parsed.data.turnstileToken, ip)
  if (!isHuman) {
    return NextResponse.json(
      { error: 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Klinik kayıt servisi yapılandırılmamış.' },
      { status: 503 }
    )
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!configuredSiteUrl && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Uygulama adresi yapılandırılmamış.' },
      { status: 503 }
    )
  }
  const siteUrl = configuredSiteUrl || req.nextUrl.origin
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          })
        })
      },
    },
  })

  const { name, email, password, clinicName, clinicPhone } = parsed.data
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=/clinic/dashboard`,
      data: {
        first_name: name,
        full_name: name,
      },
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const user = authData.user
  if (!user) {
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulamadı.' },
      { status: 500 }
    )
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let createdClinicId: string | null = null
  const rollbackRegistration = async () => {
    if (createdClinicId) {
      const { error } = await adminClient
        .from('clinics')
        .delete()
        .eq('id', createdClinicId)
      if (error) {
        console.error('[clinic-register] Clinic rollback failed:', error.message)
      }
    }

    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[clinic-register] User rollback failed:', error.message)
    }
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ role: 'vet' })
    .eq('id', user.id)

  if (profileError) {
    console.error('[clinic-register] Profile setup failed:', profileError.message)
    await rollbackRegistration()
    return NextResponse.json(
      { error: 'Klinik hesabı hazırlanamadı.' },
      { status: 500 }
    )
  }

  const { data: clinic, error: clinicError } = await adminClient
    .from('clinics')
    .insert({
      name: clinicName,
      contact_phone: clinicPhone || null,
      contact_email: email,
      is_public: false,
    })
    .select('id')
    .single()

  if (clinicError || !clinic) {
    console.error('[clinic-register] Clinic setup failed:', clinicError?.message)
    await rollbackRegistration()
    return NextResponse.json(
      { error: 'Klinik kaydı oluşturulamadı.' },
      { status: 500 }
    )
  }

  createdClinicId = clinic.id
  const { error: membershipError } = await adminClient
    .from('clinic_memberships')
    .insert({
      profile_id: user.id,
      clinic_id: clinic.id,
      is_clinic_admin: true,
    })

  if (membershipError) {
    console.error('[clinic-register] Membership setup failed:', membershipError.message)
    await rollbackRegistration()
    return NextResponse.json(
      { error: 'Klinik üyeliği oluşturulamadı.' },
      { status: 500 }
    )
  }

  return response
}
