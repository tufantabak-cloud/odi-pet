import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Yakalanması gereken referral parametresi
  const ref = request.nextUrl.searchParams.get('ref')
  const odipetRef = request.cookies.get('odipet_ref')?.value

  // Response'u başlat (default: next)
  let response = NextResponse.next()

  // Eğer URL'de ref varsa ve mevcut cookie'den farklıysa (veya yoksa) güncelle
  if (ref && ref !== odipetRef) {
    // 30 günlük çerez
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    // Eğer root URL ise (/) login sayfasına yönlendiriyor olabiliriz
    if (request.nextUrl.pathname === '/') {
      const loginUrl = new URL('/login', request.url)
      response = NextResponse.redirect(loginUrl)
    }

    response.cookies.set('odipet_ref', ref, {
      expires,
      httpOnly: false, // Client side erişime de izin ver (DashboardPendingReferral vb. okuyabilsin)
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register'
  ],
}
