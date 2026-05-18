import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const name       = (fd.get('name')       as string)?.trim()
  const email      = (fd.get('email')      as string)?.trim()
  const password   = (fd.get('password')   as string)?.trim()
  const clinicName = (fd.get('clinicName') as string)?.trim()
  const clinicPhone= (fd.get('clinicPhone')as string)?.trim()

  if (!email || !password || !name || !clinicName) {
    return NextResponse.json({ error: 'Tüm zorunlu alanları doldurunuz.' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // For signing up the user and setting local session
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${req.headers.get('host')}`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=/clinic/dashboard`,
      data: {
        first_name: name,
        full_name: name,
      }
    }
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const user = authData.user
  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı.' }, { status: 500 })
  }

  // Use Admin Client to set up roles and clinic
  if (serviceKey) {
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Update the profile role to 'admin'
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile role:', profileError)
      // Non-fatal, but we should log it
    }

    // Create the clinic
    const { data: clinicData, error: clinicError } = await adminClient
      .from('clinics')
      .insert({
        name: clinicName,
        contact_phone: clinicPhone || null,
        contact_email: email, // Default clinic contact to the registering user's email
      })
      .select('id')
      .single()

    if (clinicError) {
      console.error('Error creating clinic:', clinicError)
    } else if (clinicData) {
      // Create the membership
      const { error: membershipError } = await adminClient
        .from('clinic_memberships')
        .insert({
          profile_id: user.id,
          clinic_id: clinicData.id,
        })
      
      if (membershipError) {
        console.error('Error creating membership:', membershipError)
      }
    }
  } else {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Could not assign clinic role and create clinic.')
  }

  return response
}
