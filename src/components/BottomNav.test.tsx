import { describe, it, expect, vi } from 'vitest'
import { resolveNavItems, getNavModules } from '@/lib/modules/registry'

describe('Bottom Navigation & Module Registry for Vets', () => {
  it('includes vets in bottom_nav modules with direct access', () => {
    const bottomModules = getNavModules('bottom_nav')
    const vetModule = bottomModules.find((m) => m.key === 'vets' || m.href === '/owner/vets')

    expect(vetModule).toBeDefined()
    expect(vetModule?.label).toBe('Veteriner')
    expect(vetModule?.href).toBe('/owner/vets')
    expect(vetModule?.status).toBe('live')
  })

  it('resolveNavItems for bottom_nav returns dashboard, takvim, vets, and profile in order', () => {
    const resolved = resolveNavItems([], 'bottom_nav')
    const hrefs = resolved.map((r) => r.href)

    expect(hrefs).toContain('/owner/dashboard')
    expect(hrefs).toContain('/owner/takvim')
    expect(hrefs).toContain('/owner/vets')
    expect(hrefs).toContain('/owner/profile')
  })
})
