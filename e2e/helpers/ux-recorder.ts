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
 * 45sn'de stuck_candidate, 90sn'de stuck_confirmed üretir.
 */
export class UxRecorder {
  private results: ModuleResult[] = []
  private startedAt = new Date()
  private screenshotDir: string

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
    fn: (recorder: ModuleRecorder) => Promise<void>
  ): Promise<ModuleResult> {
    const moduleRecorder = new ModuleRecorder(
      moduleName,
      this.page,
      this.screenshotDir
    )
    const startMs = Date.now()
    let outcome: ModuleOutcome = 'completed_unaided'
    let notes = ''

    try {
      await fn(moduleRecorder)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
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
      (r) => r.outcome === 'failed' || r.outcome === 'blocked_missing_testid'
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
 * waitForVisible: elemanı beklerken 45/90sn eşiklerinde takılma kaydı üretir.
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
   * data-testid ile elemanı bekler. STUCK eşiklerinde olay kaydeder,
   * stuck_confirmed sonrası hata fırlatır (kullanıcı pes etti sayılır).
   */
  async waitForTestId(testId: string, screenName: string): Promise<void> {
    const locator = this.page.getByTestId(testId)
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

  async clickTestId(testId: string, screenName: string): Promise<void> {
    await this.waitForTestId(testId, screenName)
    await this.page.getByTestId(testId).click()
  }

  async fillTestId(testId: string, value: string, screenName: string): Promise<void> {
    await this.waitForTestId(testId, screenName)
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
