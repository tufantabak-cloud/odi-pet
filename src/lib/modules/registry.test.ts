import { describe, it, expect } from 'vitest'
import { MODULES, getNavModules } from './registry'

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
