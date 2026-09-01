import { describe, it, expect, vi } from 'vitest'
import { UxRecorder, ModuleRecorder } from '../../../../e2e/helpers/ux-recorder'
import { PERSONAS } from '../../../../e2e/personas'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
})

describe('UxRecorder State & Route Awareness Unit Tests', () => {
  const persona = PERSONAS[0] // Ece

  it('Situation D: marks downstream module as abandoned_due_to_prerequisite when onboarding fails', async () => {
    const mockPage: any = {
      url: () => 'http://127.0.0.1:3100/register',
      viewportSize: () => ({ width: 390, height: 844 }),
      waitForTimeout: vi.fn(),
    }

    const recorder = new UxRecorder(persona, mockPage, 'http://127.0.0.1:3100', 'test-results')

    // 1. Registration fails
    await recorder.tryModule('registration', 180, async () => {
      throw new Error('element_not_found: register-submit-button yok')
    })

    // 2. Downstream vaccine module runs with requiresOnboardingState: true
    const downstreamFn = vi.fn()
    const result = await recorder.tryModule('vaccine', 120, downstreamFn, {
      requiresOnboardingState: true,
    })

    expect(downstreamFn).not.toHaveBeenCalled()
    expect(result.outcome).toBe('abandoned_due_to_prerequisite')
    expect(result.duration_seconds).toBe(0)
    expect(result.notes).toContain('prerequisite_failed')
  })

  it('Situation B: throws prerequisite_failed immediately when on wrong route', async () => {
    const mockPage: any = {
      url: () => 'http://127.0.0.1:3100/login',
      getByTestId: vi.fn(),
      screenshot: vi.fn(),
    }

    const moduleRecorder = new ModuleRecorder('health_card', mockPage, 'screenshots')

    await expect(
      moduleRecorder.waitForTestId('health-card-button', 'home', /\/owner\/dashboard/)
    ).rejects.toThrow('prerequisite_failed')

    expect(moduleRecorder.errorEvents[0].error_type).toBe('unexpected_navigation')
  })

  it('Situation C: throws element_not_found immediately when DOM is complete and element is absent', async () => {
    const mockLocator: any = {
      isVisible: vi.fn().mockResolvedValue(false),
      waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
    }
    const mockPage: any = {
      url: () => 'http://127.0.0.1:3100/owner/dashboard',
      getByTestId: vi.fn().mockReturnValue(mockLocator),
      evaluate: vi.fn().mockResolvedValue('complete'), // document.readyState === 'complete'
      locator: vi.fn().mockReturnValue({
        isVisible: vi.fn().mockResolvedValue(false), // no spinner
      }),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    }

    const moduleRecorder = new ModuleRecorder('vaccine', mockPage, 'screenshots')

    await expect(
      moduleRecorder.waitForTestId('vaccine-module-button', 'home', /\/owner\/dashboard/)
    ).rejects.toThrow('element_not_found')

    expect(moduleRecorder.errorEvents[0].error_type).toBe('element_not_found')
  })

  it('Situation A: enters full stuck timer when element is present in DOM / loading', async () => {
    const mockLocator: any = {
      isVisible: vi.fn().mockResolvedValue(false),
      waitFor: vi.fn().mockImplementation(({ timeout }) => {
        if (timeout === 2000) return Promise.resolve() // attached to DOM
        return Promise.reject(new Error('timeout')) // stays invisible
      }),
    }
    const mockPage: any = {
      url: () => 'http://127.0.0.1:3100/owner/dashboard',
      getByTestId: vi.fn().mockReturnValue(mockLocator),
      evaluate: vi.fn().mockResolvedValue('complete'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    }

    const moduleRecorder = new ModuleRecorder('services', mockPage, 'screenshots')

    await expect(
      moduleRecorder.waitForTestId('services-module-button', 'home', /\/owner\/dashboard/)
    ).rejects.toThrow('stuck_confirmed')

    expect(moduleRecorder.stuckEvents).toHaveLength(2)
    expect(moduleRecorder.stuckEvents[0].severity).toBe('stuck_candidate')
    expect(moduleRecorder.stuckEvents[1].severity).toBe('stuck_confirmed')
  })

  it('buildReport produces backward-compatible JSON with all 9 modules', async () => {
    const mockPage: any = {
      url: () => 'http://127.0.0.1:3100/owner/dashboard',
      viewportSize: () => ({ width: 390, height: 844 }),
      waitForTimeout: vi.fn(),
    }

    const recorder = new UxRecorder(persona, mockPage, 'http://127.0.0.1:3100', 'test-results')

    const modules = [
      'registration',
      'pet_registration',
      'next_step',
      'vaccine',
      'parasite',
      'nutrition',
      'budget',
      'health_card',
      'services',
    ]

    for (const m of modules) {
      await recorder.tryModule(m, 60, async () => {})
    }

    const report = recorder.buildReport()
    expect(report.results).toHaveLength(9)
    expect(report.overall_result).toBe('pass')
    expect(report.persona.name).toBe('Ece')
  })
})
