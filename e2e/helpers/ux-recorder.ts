import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import type { Persona } from '../personas'

export type ModuleOutcome =
  | 'completed_unaided'
  | 'completed_aided'
  | 'failed'
  | 'abandoned'
  | 'blocked_missing_testid'
  | 'prerequisite_failed'
  | 'abandoned_due_to_prerequisite'
  | 'element_not_found'

export interface StuckEvent {
  screen_name: string
  stuck_duration_seconds: number
  severity: 'stuck_candidate' | 'stuck_confirmed'
  waiting_for: string
}

export interface ErrorEvent {
  screen_name: string
  error_type:
    | 'element_not_found'
    | 'timeout'
    | 'unexpected_navigation'
    | 'validation_error'
    | 'network_error'
    | 'crash'
  description: string
}

export interface ModuleResult {
  module: string
  outcome: ModuleOutcome
  duration_seconds: number
  time_limit_seconds: number | null
  within_time_limit: boolean | null
  stuck_events: StuckEvent[]
  error_events: ErrorEvent[]
  screenshots: string[]
  notes: string
}

export interface PersonaReport {
  session_id: string
  persona: {
    name: string
    age: number
    device: string
    tech_level: string
  }
  environment: {
    base_url: string
    viewport: string
    network: string
  }
  started_at: string
  finished_at: string
  results: ModuleResult[]
  overall_result: 'pass' | 'partial' | 'fail'
  ux_lead_note: string
}

const STUCK_CANDIDATE_MS = 45_000
const STUCK_CONFIRMED_MS = 90_000

/**
 * Bir persona oturumu boyunca modül sonuçlarını, takılma olaylarını ve
 * hataları toplayan kayıt sınıfı. Her modül tryModule ile sarılır;
 * Gerçek takılmalarda 45sn'de stuck_candidate, 90sn'de stuck_confirmed üretir.
 * Yanlış rota veya eksik prerequisite durumlarında ise 90sn deadlock beklemeden
 * anında prerequisite_failed / element_not_found durumunu kaydeder.
 */
export class UxRecorder {
  private results: ModuleResult[] = []
  private startedAt = new Date()
  private screenshotDir: string
  private hasOnboardingFailed = false

  constructor(
    private persona: Persona,
    private page: Page,
    private baseUrl: string,
    private outputDir: string
  ) {
    this.screenshotDir = path.join(outputDir, 'screenshots', persona.id)
    fs.mkdirSync(this.screenshotDir, { recursive: true })
  }

  /**
   * Bir modül testini çalıştırır ve süre/takılma/hata verilerini kaydeder.
   * fn içinde atılan hatalar yakalanır — test zinciri kırılmaz, sonraki
   * modül denenir (gerçek kullanıcı da pes edip başka ekrana geçer).
   */
  async tryModule(
    moduleName: string,
    timeLimitSeconds: number | null,
    fn: (recorder: ModuleRecorder) => Promise<void>,
    options?: { requiresOnboardingState?: boolean }
  ): Promise<ModuleResult> {
    const moduleRecorder = new ModuleRecorder(
      moduleName,
      this.page,
      this.screenshotDir
    )
    const startMs = Date.now()
    let outcome: ModuleOutcome = 'completed_unaided'
    let notes = ''

    // Durum D: Önceki Onboarding modülleri başarısız olduysa ve bu modül bu state'e ihtiyaç duyuyorsa
    if (options?.requiresOnboardingState && this.hasOnboardingFailed) {
      outcome = 'abandoned_due_to_prerequisite'
      notes = `prerequisite_failed: Onboarding basarisiz oldugu icin "${moduleName}" modulu calistirilamadi.`
      moduleRecorder.recordError({
        screen_name: moduleName,
        error_type: 'unexpected_navigation',
        description: notes,
      })

      const result: ModuleResult = {
        module: moduleName,
        outcome,
        duration_seconds: 0,
        time_limit_seconds: timeLimitSeconds,
        within_time_limit: timeLimitSeconds === null ? null : true,
        stuck_events: [],
        error_events: moduleRecorder.errorEvents,
        screenshots: [],
        notes,
      }
      this.results.push(result)
      return result
    }

    try {
      await fn(moduleRecorder)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.startsWith('prerequisite_failed')) {
        outcome = 'prerequisite_failed'
        notes = message.slice(0, 500)
      } else if (message.startsWith('element_not_found')) {
        outcome = 'element_not_found'
        notes = message.slice(0, 500)
      } else {
        const isMissingTestId =
          message.includes('data-testid') || message.includes('waiting for locator')

        outcome = isMissingTestId ? 'blocked_missing_testid' : 'failed'
        notes = message.slice(0, 500)

        moduleRecorder.recordError({
          screen_name: moduleName,
          error_type: isMissingTestId ? 'element_not_found' : 'crash',
          description: message.slice(0, 300),
        })
        await moduleRecorder.screenshot('failure')
      }

      if (
        moduleName === 'registration' ||
        moduleName === 'pet_registration' ||
        moduleName === 'next_step'
      ) {
        this.hasOnboardingFailed = true
      }
    }

    const durationSeconds = Math.round((Date.now() - startMs) / 1000)
    const withinLimit =
      timeLimitSeconds === null ? null : durationSeconds <= timeLimitSeconds

    const result: ModuleResult = {
      module: moduleName,
      outcome,
      duration_seconds: durationSeconds,
      time_limit_seconds: timeLimitSeconds,
      within_time_limit: withinLimit,
      stuck_events: moduleRecorder.stuckEvents,
      error_events: moduleRecorder.errorEvents,
      screenshots: moduleRecorder.screenshots,
      notes,
    }
    this.results.push(result)
    return result
  }

  /** Persona davranış simülasyonu: teknoloji seviyesine göre bekleme */
  async humanPause(): Promise<void> {
    await this.page.waitForTimeout(this.persona.actionDelayMs)
  }

  async readingPause(): Promise<void> {
    await this.page.waitForTimeout(this.persona.readingPauseMs)
  }

  buildReport(): PersonaReport {
    const failed = this.results.filter(
      (r) =>
        r.outcome === 'failed' ||
        r.outcome === 'blocked_missing_testid' ||
        r.outcome === 'element_not_found' ||
        r.outcome === 'prerequisite_failed' ||
        r.outcome === 'abandoned_due_to_prerequisite'
    ).length
    const total = this.results.length
    const overall: PersonaReport['overall_result'] =
      failed === 0 ? 'pass' : failed < total / 2 ? 'partial' : 'fail'

    const viewport = this.page.viewportSize()

    return {
      session_id: `${this.persona.name.toUpperCase()}_FULL_FLOW_001`,
      persona: {
        name: this.persona.name,
        age: this.persona.age,
        device: this.persona.deviceLabel,
        tech_level: this.persona.techLevel,
      },
      environment: {
        base_url: this.baseUrl,
        viewport: viewport ? `${viewport.width}x${viewport.height}` : 'unknown',
        network: process.env.NETWORK_THROTTLE === 'true' ? '4g_throttled' : 'normal',
      },
      started_at: this.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      results: this.results,
      overall_result: overall,
      ux_lead_note: '',
    }
  }

  saveReport(): string {
    const report = this.buildReport()
    const filePath = path.join(this.outputDir, `persona-${this.persona.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')
    return filePath
  }
}

/**
 * Tek bir modül testi sırasında olay toplayan yardımcı.
 * waitForTestId: elemanı beklerken 45/90sn eşiklerinde takılma kaydı üretir.
 * State ve Rota bilinci sayesinde yanlış sayfalarda veya eksik elementlerde
 * gereksiz 90 saniye deadlock beklemesini engeller.
 */
export class ModuleRecorder {
  stuckEvents: StuckEvent[] = []
  errorEvents: ErrorEvent[] = []
  screenshots: string[] = []

  constructor(
    private moduleName: string,
    private page: Page,
    private screenshotDir: string
  ) {}

  /**
   * data-testid ile elemanı bekler.
   * - Yanlış route ise derhal prerequisite_failed
   * - DOM yüklü ve eleman yoksa derhal element_not_found
   * - Gerçekten yükleniyor/spinner/DOM bağlı ise 45s candidate + 45s confirmed (toplam 90s) stuck mantığı tam çalışır.
   */
  async waitForTestId(
    testId: string,
    screenName: string,
    expectedRoute?: string | RegExp
  ): Promise<void> {
    const currentUrl = this.page.url()

    // Durum B: WRONG ROUTE Kontrolü
    if (expectedRoute) {
      const isRouteMatch =
        typeof expectedRoute === 'string'
          ? currentUrl.includes(expectedRoute)
          : expectedRoute.test(currentUrl)

      if (!isRouteMatch) {
        this.recordError({
          screen_name: screenName,
          error_type: 'unexpected_navigation',
          description: `Beklenen rota "${expectedRoute}" yerine mevcut rota "${currentUrl}". Prerequisite saglanamadi.`,
        })
        throw new Error(
          `prerequisite_failed: "${screenName}" ekraninda beklenen rota "${expectedRoute}" yerine "${currentUrl}" bulundu.`
        )
      }
    }

    const locator = this.page.getByTestId(testId)

    // Hızlı kontrol: Görünür mü?
    if (await locator.isVisible().catch(() => false)) {
      return
    }

    // Eleman DOM'da bağlı mı kontrolü (2sn kısa tolerans)
    const isPresentInitially = await locator
      .waitFor({ state: 'attached', timeout: 2000 })
      .then(() => true)
      .catch(() => false)

    if (isPresentInitially && (await locator.isVisible().catch(() => false))) {
      return
    }

    // Durum C: DOM Kararlı ve Eleman Yok Kontrolü
    const isDomReady = await this.page
      .evaluate(() => document.readyState === 'complete')
      .catch(() => false)

    if (isDomReady && !isPresentInitially) {
      const hasLoadingIndicator = await this.page
        .locator('.animate-spin, [data-loading="true"], [role="progressbar"]')
        .isVisible()
        .catch(() => false)

      if (!hasLoadingIndicator) {
        this.recordError({
          screen_name: screenName,
          error_type: 'element_not_found',
          description: `DOM kararlı ancak [data-testid="${testId}"] bulunamadı.`,
        })
        await this.screenshot(`missing-testid-${testId}`)
        throw new Error(
          `element_not_found: "${screenName}" ekranında [data-testid=${testId}] DOM'da mevcut değil.`
        )
      }
    }

    // Durum A: TRUE STUCK (DOM bağlı, animasyon/yükleme sürüyor)
    // 45s STUCK_CANDIDATE_MS + 45s STUCK_CONFIRMED_MS (90s) AYNEN ÇALIŞIR
    const startMs = Date.now()

    try {
      await locator.waitFor({ state: 'visible', timeout: STUCK_CANDIDATE_MS })
      return
    } catch {
      this.stuckEvents.push({
        screen_name: screenName,
        stuck_duration_seconds: 45,
        severity: 'stuck_candidate',
        waiting_for: testId,
      })
      await this.screenshot(`stuck-candidate-${testId}`)
    }

    try {
      await locator.waitFor({
        state: 'visible',
        timeout: STUCK_CONFIRMED_MS - STUCK_CANDIDATE_MS,
      })
    } catch {
      const totalSeconds = Math.round((Date.now() - startMs) / 1000)
      this.stuckEvents.push({
        screen_name: screenName,
        stuck_duration_seconds: totalSeconds,
        severity: 'stuck_confirmed',
        waiting_for: testId,
      })
      await this.screenshot(`stuck-confirmed-${testId}`)
      throw new Error(
        `stuck_confirmed: "${screenName}" ekranında [data-testid=${testId}] ${totalSeconds}sn içinde görünmedi`
      )
    }
  }

  async clickTestId(
    testId: string,
    screenName: string,
    expectedRoute?: string | RegExp
  ): Promise<void> {
    await this.waitForTestId(testId, screenName, expectedRoute)
    await this.page.getByTestId(testId).click()
  }

  async fillTestId(
    testId: string,
    value: string,
    screenName: string,
    expectedRoute?: string | RegExp
  ): Promise<void> {
    await this.waitForTestId(testId, screenName, expectedRoute)
    await this.page.getByTestId(testId).fill(value)
  }

  recordError(event: ErrorEvent): void {
    this.errorEvents.push(event)
  }

  async screenshot(label: string): Promise<void> {
    const fileName = `${this.moduleName}-${label}-${Date.now()}.png`
    const filePath = path.join(this.screenshotDir, fileName)
    try {
      await this.page.screenshot({ path: filePath, fullPage: false })
      this.screenshots.push(fileName)
    } catch {
      // Sayfa kapanmışsa ekran görüntüsü alınamaz; raporu bozmasın
    }
  }
}
