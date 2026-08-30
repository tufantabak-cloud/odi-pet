import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isBlockedPath } from '@/lib/modules/registry'
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

/**
 * Build CSP header string.
 * Allows Next.js runtime hydration scripts, Turnstile, Leaflet, and PWA scripts.
 */
function buildCsp(): string {
  // In production & dev: strict CSP allowing Next.js inline scripts, Turnstile, Leaflet and PWA
  // Savunma Katmanı (Defense-in-Depth): https://odi.pet ve sub-domain'leri harici/edge push payload'ları ve CDN görselleri için img-src ve connect-src'ye eklenmiştir.
  return `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.challenges.cloudflare.com https://unpkg.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://odi.pet https://*.odi.pet; font-src 'self' data:; connect-src 'self' blob: http://127.0.0.1:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.challenges.cloudflare.com https://*.cloudflare.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://odi.pet https://*.odi.pet; frame-src 'self' https://challenges.cloudflare.com https://*.challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// In dev: Content-Security-Policy-Report-Only (does not block, only reports)
// In prod: Content-Security-Policy (enforces the policy)
const CSP_HEADER_NAME = IS_PRODUCTION
  ? 'Content-Security-Policy'
  : 'Content-Security-Policy-Report-Only'

/**
 * Apply CSP and nonce headers to a NextResponse.
 */
function applyCspHeaders(response: NextResponse, csp: string, nonce: string): void {
  response.headers.set(CSP_HEADER_NAME, csp)
  response.headers.set('x-nonce', nonce)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // --- CSP Header ---
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCsp()
  // Inject nonce into request headers so Next.js applies it to inline scripts
  request.headers.set('x-nonce', nonce)
  request.headers.set(CSP_HEADER_NAME, cspHeader)

  if (isBlockedPath(pathname)) {
    const res = NextResponse.rewrite(new URL('/404', request.url), { status: 404 })
    applyCspHeaders(res, cspHeader, nonce)
    return res
  }

  const isLoginPage = pathname === '/login'
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
      applyCspHeaders(csrfError, cspHeader, nonce)
      return csrfError
    }
  }

  // Public, token and service endpoints validate their own access contract in
  // the route handler and must not depend on a Supabase browser session.
  if (isApiRequest && apiAccessMode !== 'session') {
    const res = NextResponse.next({ request })
    applyCspHeaders(res, cspHeader, nonce)
    return res
  }

  if (
    !isApiRequest
    && !isProtectedPagePath(pathname)
    && !isLoginPage
  ) {
    const res = NextResponse.next({ request })
    applyCspHeaders(res, cspHeader, nonce)
    return res
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
    if (isLoginPage) {
      applyCspHeaders(supabaseResponse, cspHeader, nonce)
      return supabaseResponse
    }

    if (isApiRequest) {
      const res = NextResponse.json(
        { error: 'Unauthorized', requiresAuth: true },
        { status: 401 }
      )
      applyCspHeaders(res, cspHeader, nonce)
      return res
    }

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('reason', 'session_expired')
    const res = NextResponse.redirect(loginUrl)
    applyCspHeaders(res, cspHeader, nonce)
    return res
  }

  if (isLoginPage) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.search = ''

    const redirectResponse = NextResponse.redirect(homeUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    applyCspHeaders(redirectResponse, cspHeader, nonce)
    return redirectResponse
  }

  if (isAdminBoundaryPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'founder') {
      if (isApiRequest) {
        const res = NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
        applyCspHeaders(res, cspHeader, nonce)
        return res
      }

      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/owner/dashboard'
      const adminRes = NextResponse.redirect(dashboardUrl)
      applyCspHeaders(adminRes, cspHeader, nonce)
      return adminRes
    }
  }

  applyCspHeaders(supabaseResponse, cspHeader, nonce)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/owner/:path*',
    '/admin/:path*',
    '/clinic/:path*',
    '/api/:path*',
    '/login',
    '/sos/:path*',
    // Profesyonel modül iskeletleri: gerçek sayfalar /groomer/dashboard gibi
    // alt yollarda duruyor. Yalnızca '/groomer' yazmak alt yolları KAPSAMAZ,
    // bu yüzden hem kökü hem alt yolları eşleştiriyoruz.
    '/groomer',
    '/groomer/:path*',
    '/hotel',
    '/hotel/:path*',
    '/sitter',
    '/sitter/:path*',
    '/trainer',
    '/trainer/:path*',
  ],
}
