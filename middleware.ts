import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // CSRF Protection for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin') ?? request.headers.get('referer')
    const host = request.headers.get('host')
    
    if (origin && host) {
      try {
        const originUrl = new URL(origin)
        if (originUrl.host !== host) {
          return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid origin header' }, { status: 403 })
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Middleware maintains session across requests without querying DB for roles
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          supabaseResponse = NextResponse.next({
            request,
          })
          
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
            }
            supabaseResponse.cookies.set(name, value, secureOptions)
          })

          // IMPORTANT: Apply Supabase Auth headers to prevent reverse-proxy/CDN poisoning
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

  const pathname = request.nextUrl.pathname

  const isProtectedPath = 
    pathname.startsWith('/owner') || 
    pathname.startsWith('/clinic') || 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api')

  // Allow auth-related API routes without authentication
  const isAuthRoute = pathname.startsWith('/api/auth')

  // Redirection rule for authenticated users trying to access auth pages
  const isAuthPage = pathname === '/login' || pathname === '/register'
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirection rule for unauthenticated users
  if (isProtectedPath && !isAuthRoute && !user) {
    // API routes return 401 instead of redirect
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('reason', 'session_expired')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/owner/:path*',
    '/admin/:path*',
    '/clinic/:path*',
    '/api/:path*',
    '/login',
    '/register',
  ],
}
