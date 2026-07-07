import * as fs from 'fs'
import * as path from 'path'
import type { PersonaReport, ModuleResult } from './helpers/ux-recorder'

const OUTPUT_DIR = 'test-results'
const FINAL_REPORT = path.join(OUTPUT_DIR, 'odipet-ux-report.json')

// Modül bazlı başarı eşikleri (10 persona üzerinden)
// key: modül adı, value: { minPass: yardımsız tamamlaması gereken persona sayısı }
const SUCCESS_CRITERIA: Record<string, { minPass: number; label: string }> = {
  registration: { minPass: 9, label: 'Kayıt' },
  pet_registration: { minPass: 8, label: 'Pet kaydı' },
  next_step: { minPass: 7, label: 'Akıllı sonraki adım' },
  vaccine: { minPass: 7, label: 'Aşı' },
  parasite: { minPass: 8, label: 'Parazit' },
  nutrition: { minPass: 7, label: 'Mama/Beslenme' },
  budget: { minPass: 7, label: 'Bütçe (45sn limit)' },
  health_card: { minPass: 6, label: 'Karne' },
  services: { minPass: 8, label: 'Hizmet bul (60sn limit)' },
}

interface ModuleSummary {
  module: string
  label: string
  tested: number
  completed_unaided: number
  failed: number
  blocked_missing_testid: number
  avg_duration_seconds: number
  within_time_limit_count: number
  min_pass_threshold: number
  criteria_met: boolean
  stuck_screens: string[]
}

interface Issue {
  severity: 'blocker' | 'major' | 'minor'
  module: string
  description: string
  affected_personas: string[]
}

function classifyIssues(reports: PersonaReport[]): Issue[] {
  const issues: Issue[] = []
  const moduleNames = Object.keys(SUCCESS_CRITERIA)

  for (const moduleName of moduleNames) {
    const results = reports
      .map((r) => ({
        persona: r.persona.name,
        result: r.results.find((m) => m.module === moduleName),
      }))
      .filter((x): x is { persona: string; result: ModuleResult } => !!x.result)

    const failedPersonas = results
      .filter((x) => x.result.outcome === 'failed' || x.result.outcome === 'abandoned')
      .map((x) => x.persona)

    const blockedPersonas = results
      .filter((x) => x.result.outcome === 'blocked_missing_testid')
      .map((x) => x.persona)

    if (blockedPersonas.length > 0) {
      issues.push({
        severity: 'blocker',
        module: moduleName,
        description: `data-testid eksik veya eleman bulunamadı — test hiç çalışamadı. Önce geliştirici testid eklemeli.`,
        affected_personas: blockedPersonas,
      })
    }

    if (failedPersonas.length >= 4) {
      issues.push({
        severity: 'major',
        module: moduleName,
        description: `10 personadan ${failedPersonas.length} tanesi modülü tamamlayamadı.`,
        affected_personas: failedPersonas,
      })
    } else if (failedPersonas.length >= 1) {
      issues.push({
        severity: 'minor',
        module: moduleName,
        description: `${failedPersonas.length} persona modülde zorlandı veya tamamlayamadı.`,
        affected_personas: failedPersonas,
      })
    }
  }
  return issues
}

export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) return

  const personaFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith('persona-') && f.endsWith('.json'))

  if (personaFiles.length === 0) {
    console.warn('Persona raporu bulunamadı; özet üretilmedi.')
    return
  }

  const reports: PersonaReport[] = personaFiles.map((f) =>
    JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf-8'))
  )

  const moduleSummaries: ModuleSummary[] = Object.entries(SUCCESS_CRITERIA).map(
    ([moduleName, criteria]) => {
      const results = reports
        .map((r) => r.results.find((m) => m.module === moduleName))
        .filter((m): m is ModuleResult => !!m)

      const unaided = results.filter((m) => m.outcome === 'completed_unaided').length
      const durations = results.map((m) => m.duration_seconds)
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0

      const stuckScreens = [
        ...new Set(
          results.flatMap((m) => m.stuck_events.map((s) => s.screen_name))
        ),
      ]

      return {
        module: moduleName,
        label: criteria.label,
        tested: results.length,
        completed_unaided: unaided,
        failed: results.filter((m) => m.outcome === 'failed').length,
        blocked_missing_testid: results.filter(
          (m) => m.outcome === 'blocked_missing_testid'
        ).length,
        avg_duration_seconds: avgDuration,
        within_time_limit_count: results.filter((m) => m.within_time_limit === true)
          .length,
        min_pass_threshold: criteria.minPass,
        criteria_met: unaided >= criteria.minPass,
        stuck_screens: stuckScreens,
      }
    }
  )

  const allStuck = reports.flatMap((r) =>
    r.results.flatMap((m) =>
      m.stuck_events.map((s) => ({ screen: s.screen_name, persona: r.persona.name }))
    )
  )
  const stuckCounts = allStuck.reduce<Record<string, number>>((acc, s) => {
    acc[s.screen] = (acc[s.screen] ?? 0) + 1
    return acc
  }, {})
  const mostStuckScreen =
    Object.entries(stuckCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const slowestModule = [...moduleSummaries].sort(
    (a, b) => b.avg_duration_seconds - a.avg_duration_seconds
  )[0]
  const bestModule = [...moduleSummaries]
    .filter((m) => m.tested > 0)
    .sort((a, b) => b.completed_unaided - a.completed_unaided)[0]

  const issues = classifyIssues(reports)

  const finalReport = {
    generated_at: new Date().toISOString(),
    personas_tested: reports.length,
    overall: {
      pass: reports.filter((r) => r.overall_result === 'pass').length,
      partial: reports.filter((r) => r.overall_result === 'partial').length,
      fail: reports.filter((r) => r.overall_result === 'fail').length,
    },
    module_summaries: moduleSummaries,
    highlights: {
      most_stuck_screen: mostStuckScreen,
      slowest_module: slowestModule?.module ?? null,
      best_module: bestModule?.module ?? null,
    },
    issues: {
      blocker: issues.filter((i) => i.severity === 'blocker'),
      major: issues.filter((i) => i.severity === 'major'),
      minor: issues.filter((i) => i.severity === 'minor'),
    },
    recommended_actions: buildRecommendations(moduleSummaries, issues),
    persona_reports: reports,
  }

  fs.writeFileSync(FINAL_REPORT, JSON.stringify(finalReport, null, 2), 'utf-8')
  console.log(`\n✔ Nihai rapor: ${FINAL_REPORT}`)
  printConsoleSummary(finalReport)
}

function buildRecommendations(
  summaries: ModuleSummary[],
  issues: Issue[]
): string[] {
  const actions: string[] = []

  const blocked = summaries.filter((s) => s.blocked_missing_testid > 0)
  if (blocked.length > 0) {
    actions.push(
      `ÖNCE: ${blocked.map((s) => s.label).join(', ')} modüllerinde data-testid eksik — geliştirici eklemeden UX sonucu ölçülemez.`
    )
  }

  const failing = summaries.filter((s) => s.tested > 0 && !s.criteria_met)
  for (const s of failing) {
    actions.push(
      `${s.label}: ${s.completed_unaided}/${s.tested} yardımsız tamamladı (eşik: ${s.min_pass_threshold}). ` +
        (s.stuck_screens.length > 0
          ? `En çok takılınan ekran(lar): ${s.stuck_screens.join(', ')}.`
          : 'Takılma kaydı yok — hata loglarını incele.')
    )
  }

  if (issues.filter((i) => i.severity === 'blocker').length === 0 && failing.length === 0) {
    actions.push('Tüm modüller başarı eşiklerini geçti. Manuel/derinlemesine teste geçilebilir.')
  }
  return actions
}

function printConsoleSummary(report: {
  module_summaries: ModuleSummary[]
  overall: { pass: number; partial: number; fail: number }
}): void {
  console.log('\n─── OdiPet UX Test Özeti ───')
  console.log(
    `Persona sonuçları: ${report.overall.pass} pass / ${report.overall.partial} partial / ${report.overall.fail} fail`
  )
  for (const m of report.module_summaries) {
    const mark = m.criteria_met ? '✔' : m.blocked_missing_testid > 0 ? '⛔' : '✘'
    console.log(
      `${mark} ${m.label}: ${m.completed_unaided}/${m.tested} yardımsız (eşik ${m.min_pass_threshold}) — ort. ${m.avg_duration_seconds}sn`
    )
  }
}
