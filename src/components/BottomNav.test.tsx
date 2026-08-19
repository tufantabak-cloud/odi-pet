import { describe, it, expect } from 'vitest'
import { resolveNavItems, getNavModules } from '@/lib/modules/registry'

describe('Bottom Navigation & Module Registry — BUG-002 SSOT Suite', () => {
  it('includes social in bottom_nav modules with direct access', () => {
    const bottomModules = getNavModules('bottom_nav')
    const socialModule = bottomModules.find((m) => m.key === 'social' || m.href === '/owner/social')

    expect(socialModule).toBeDefined()
    expect(socialModule?.label).toBe('Sosyal')
    expect(socialModule?.href).toBe('/owner/social')
    expect(socialModule?.status).toBe('live')
  })

  it('resolveNavItems for bottom_nav returns canonical 4 items in exact order', () => {
    const resolved = resolveNavItems([], 'bottom_nav')
    const hrefs = resolved.map((r) => r.href)
    const labels = resolved.map((r) => r.label)

    expect(resolved).toHaveLength(4)
    expect(hrefs).toEqual(['/owner/dashboard', '/owner/takvim', '/owner/social', '#'])
    expect(labels).toEqual(['Anasayfa', 'Takvim', 'Sosyal', 'Menü'])
  })

  it('BUG-002: Deduplicates multiple Sosyal items from database and retains only 1 instance', () => {
    const duplicateDbItems = [
      { id: 'item-1', label: 'Anasayfa', href: '/owner/dashboard', slot: 'bottom_nav' as const, order_index: 1, is_active: true, match_type: 'startsWith' as const },
      { id: 'item-2', label: 'Sosyal', href: '/owner/social', slot: 'bottom_nav' as const, order_index: 2, is_active: true, match_type: 'startsWith' as const },
      { id: 'item-3', label: 'Sosyal', href: '/owner/social/', slot: 'bottom_nav' as const, order_index: 3, is_active: true, match_type: 'startsWith' as const },
      { id: 'item-4', label: 'Social', href: '/owner/social', slot: 'bottom_nav' as const, order_index: 4, is_active: true, match_type: 'startsWith' as const },
      { id: 'item-5', label: 'Takvim', href: '/owner/takvim', slot: 'bottom_nav' as const, order_index: 5, is_active: true, match_type: 'startsWith' as const },
    ]

    const resolved = resolveNavItems(duplicateDbItems, 'bottom_nav')
    const socialMatches = resolved.filter((r) => r.href.includes('/owner/social') || r.label.toLowerCase().includes('sosyal'))

    expect(socialMatches).toHaveLength(1)
    expect(resolved.map((r) => r.label)).toEqual(['Anasayfa', 'Takvim', 'Sosyal', 'Menü'])
  })

  it('verifies Sosyal is only in side_primary and NOT in side_shortcut', () => {
    const primaryModules = getNavModules('side_primary')
    const shortcutModules = getNavModules('side_shortcut')

    const primarySocial = primaryModules.filter((m) => m.key === 'social' || m.href === '/owner/social')
    const shortcutSocial = shortcutModules.filter((m) => m.key === 'social' || m.href === '/owner/social')

    expect(primarySocial).toHaveLength(1)
    expect(shortcutSocial).toHaveLength(0)
  })

  it('verifies resolveNavItems for side_shortcut does not return Sosyal', () => {
    const shortcuts = resolveNavItems([], 'side_shortcut')
    const socialInShortcuts = shortcuts.filter((r) => r.href === '/owner/social' || r.label === 'Sosyal')

    expect(socialInShortcuts).toHaveLength(0)
  })
})
