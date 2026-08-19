import { describe, it, expect, vi } from 'vitest'
import { resolveNavItems, getNavModules } from '@/lib/modules/registry'

describe('Bottom Navigation & Module Registry', () => {
  it('includes social in bottom_nav modules with direct access', () => {
    const bottomModules = getNavModules('bottom_nav')
    const socialModule = bottomModules.find((m) => m.key === 'social' || m.href === '/owner/social')

    expect(socialModule).toBeDefined()
    expect(socialModule?.label).toBe('Sosyal')
    expect(socialModule?.href).toBe('/owner/social')
    expect(socialModule?.status).toBe('live')
  })

  it('resolveNavItems for bottom_nav returns dashboard, takvim, and social in order', () => {
    const resolved = resolveNavItems([], 'bottom_nav')
    const hrefs = resolved.map((r) => r.href)

    expect(hrefs).toContain('/owner/dashboard')
    expect(hrefs).toContain('/owner/takvim')
    expect(hrefs).toContain('/owner/social')
  })
})
