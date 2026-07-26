import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  classifyApiRequest,
  isAdminBoundaryPath,
  isProtectedPagePath,
} from '@/lib/routing/request-boundary'
import { validateSameOriginHeaders } from '@/lib/security/request-origin'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function validateSameOrigin(request: NextRequest): NextResponse | null {
  const validation = validateSameOriginHeaders(request.headers)
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 }
    )
  }

  return null
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isApiRequest = pathname === '/api' || pathname.startsWith('/api/')
  const apiAccessMode = isApiRequest
    ? classifyApiRequest(pathname, request.method)
    : null

  // Service endpoints authenticate their own signed/Bearer requests. Browser
  // state changes remain protected by the same-origin boundary.
  if (
    apiAccessMode !== 'service'
    && STATE_CHANGING_METHODS.has(request.method)
  ) {
    const csrfError = validateSameOrigin(request)
    if (csrfError) {
      return csrfError
    }
  }

  // Public, token and service endpoints validate their own access contract in
  // the route handler and must not depend on a Supabase browser session.
  if (isApiRequest && apiAccessMode !== 'session') {
    return NextResponse.next({ request })
  }

  if (!isApiRequest && !isProtectedPagePath(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL
      || 'https://placeholder-project.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            })
          })

          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value)
            })
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isApiRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('reason', 'session_expired')
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminBoundaryPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'founder') {
      if (isApiRequest) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/owner/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/owner/:path*',
    '/admin/:path*',
    '/clinic/:path*',
    '/api/:path*',
  ],
}
