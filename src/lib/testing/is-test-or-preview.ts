/**
 * Utility to detect automated testing (TestSprite, Playwright, Puppeteer, Selenium),
 * Vercel Preview deployments, or QA test mode.
 */
export function isTestOrPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return false

  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')
  const isVercelPreview = hostname.includes('vercel.app')
  const hasBypassParam =
    window.location.search.includes('bypass-pwa=true') ||
    window.location.search.includes('test=true') ||
    window.location.search.includes('notour=true') ||
    window.location.search.includes('qa=true')

  const lowerUa = (navigator.userAgent || '').toLowerCase()
  const isAutomatedTest =
    Boolean((window.navigator as any).webdriver) ||
    lowerUa.includes('playwright') ||
    lowerUa.includes('headlesschrome') ||
    lowerUa.includes('testsprite') ||
    lowerUa.includes('selenium') ||
    lowerUa.includes('puppeteer') ||
    (typeof document !== 'undefined' && (document.cookie.includes('is_qa=true') || document.cookie.includes('qa=true')))

  return isLocal || isVercelPreview || hasBypassParam || isAutomatedTest
}
