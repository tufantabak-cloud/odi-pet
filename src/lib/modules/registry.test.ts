import { describe, it, expect } from 'vitest'
import { MODULES, getNavModules, resolveNavItems } from './registry'

describe('BUG-003: Help module canonical route verification', () => {
  it('should map help module to canonical route /owner/learn', () => {
    const helpModule = MODULES.find((m) => m.key === 'help')
    expect(helpModule).toBeDefined()
    expect(helpModule?.href).toBe('/owner/learn')
  })

  it('should not contain any module with /help.html href', () => {
    const helpHtmlModules = MODULES.filter((m) => m.href.includes('help.html'))
    expect(helpHtmlModules).toHaveLength(0)
  })

  it('should include help module in side_shortcut pointing to /owner/learn', () => {
    const sideShortcutModules = getNavModules('side_shortcut')
    const helpShortcut = sideShortcutModules.find((m) => m.key === 'help')
    expect(helpShortcut).toBeDefined()
    expect(helpShortcut?.href).toBe('/owner/learn')
  })
})

describe('Takvim module canonical route & /owner/calendar aliasing', () => {
  it('should have takvim module with canonical href /owner/takvim and extraRoutes including /owner/calendar', () => {
    const takvimModule = MODULES.find((m) => m.key === 'takvim')
    expect(takvimModule).toBeDefined()
    expect(takvimModule?.href).toBe('/owner/takvim')
    expect(takvimModule?.status).toBe('live')
    expect(takvimModule?.extraRoutes).toContain('/owner/calendar')
  })

  it('should deduplicate and canonicalize /owner/calendar DB items to /owner/takvim', () => {
    const dbItems = [
      { id: 'item-1', label: 'Anasayfa', href: '/owner/dashboard', slot: 'bottom_nav' as const, order_index: 1, is_active: true, match_type: 'startsWith' as const },
      { id: 'item-cal', label: 'Calendar', href: '/owner/calendar', slot: 'bottom_nav' as const, order_index: 2, is_active: true, match_type: 'startsWith' as const },
    ]

    const resolved = resolveNavItems(dbItems, 'bottom_nav')
    const takvimItems = resolved.filter((r) => r.href === '/owner/takvim' || r.label.toLowerCase().includes('takvim'))

    // Should only have 1 Takvim item and its href should be canonicalized to /owner/takvim
    expect(takvimItems).toHaveLength(1)
    expect(takvimItems[0].href).toBe('/owner/takvim')
  })
})
