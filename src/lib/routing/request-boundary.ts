export type ApiAccessMode = 'public' | 'token' | 'service' | 'session'

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function classifyApiRequest(
  pathname: string,
  method: string
): ApiAccessMode {
  const normalizedMethod = method.toUpperCase()

  if (
    startsWithSegment(pathname, '/api/auth')
    || pathname === '/api/beta/signup'
    || (pathname === '/api/provinces' && normalizedMethod === 'GET')
    || (pathname === '/api/version' && normalizedMethod === 'GET')
    || (
      normalizedMethod === 'GET'
      && /^\/api\/pets\/[^/]+\/lost$/.test(pathname)
    )
    || (
      pathname === '/api/invite/accept'
      && normalizedMethod === 'GET'
    )
  ) {
    return 'public'
  }

  if (
    (
      normalizedMethod === 'GET'
      && /^\/api\/share\/get\/[^/]+$/.test(pathname)
    )
    || (
      normalizedMethod === 'GET'
      && /^\/api\/calendar\/feed\/[^/]+$/.test(pathname)
    )
    || (
      pathname === '/api/logbook/create'
      && normalizedMethod === 'POST'
    )
  ) {
    return 'token'
  }

  if (
    startsWithSegment(pathname, '/api/cron')
    || (
      pathname === '/api/payments/webhook'
      && normalizedMethod === 'POST'
    )
  ) {
    return 'service'
  }

  return 'session'
}

export function isProtectedPagePath(pathname: string): boolean {
  return (
    startsWithSegment(pathname, '/owner')
    || startsWithSegment(pathname, '/clinic')
    || startsWithSegment(pathname, '/admin')
  )
}

export function isAdminBoundaryPath(pathname: string): boolean {
  return (
    startsWithSegment(pathname, '/admin')
    || startsWithSegment(pathname, '/api/admin')
    || startsWithSegment(pathname, '/api/users')
  )
}
