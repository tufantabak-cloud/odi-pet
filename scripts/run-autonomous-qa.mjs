import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  LOCAL_E2E_ADMIN_EMAIL,
  LOCAL_E2E_ADMIN_PASSWORD,
  LOCAL_E2E_CAREGIVER_EMAIL,
  LOCAL_E2E_CAREGIVER_PASSWORD,
  LOCAL_E2E_EMAIL,
  LOCAL_E2E_PASSWORD,
  LOCAL_E2E_PET_ID,
  seedLocalE2EFixtures,
} from './seed-local-e2e-fixtures.mjs'

const isWindows = process.platform === 'win32'
const statusCommand = isWindows ? process.env.ComSpec : 'npx'
const statusArgs = isWindows
  ? ['/d', '/s', '/c', 'npx.cmd --yes supabase status -o json']
  : ['--yes', 'supabase', 'status', '-o', 'json']

console.log('🔍 [QA ENGINE] Validating Local Supabase status...')
const status = spawnSync(statusCommand, statusArgs, { encoding: 'utf8' })

if (status.status !== 0) {
  console.error('❌ [QA ENGINE] Yerel Supabase çalışmıyor. `npx supabase start` çalıştırın.')
  if (status.error?.message || status.stderr) {
    console.error(status.error?.message || status.stderr)
  }
  process.exit(status.status ?? 1)
}

let localSupabase
try {
  localSupabase = JSON.parse(status.stdout)
} catch {
  console.error('❌ [QA ENGINE] Yerel Supabase durum çıktısı okunamadı.')
  process.exit(1)
}

const apiUrl = new URL(localSupabase.API_URL)
if (!['127.0.0.1', 'localhost', '::1'].includes(apiUrl.hostname)) {
  console.error('❌ [QA ENGINE] REFUSING_REMOTE_DATABASE_IN_E2E_TEST')
  process.exit(1)
}

const testBaseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100'
const isSmoke = process.argv.includes('--smoke')
const isRegression = process.argv.includes('--regression')
const skipBuild = process.env.E2E_SKIP_BUILD === '1' || process.argv.includes('--skip-build')

const smokeFiles = ['e2e/main_flow.spec.ts', 'e2e/auth_onboarding.spec.ts', 'e2e/dashboard.spec.ts']
const regressionFiles = [
  'e2e/main_flow.spec.ts',
  'e2e/lost-pet-rls.spec.ts',
  'e2e/lost-pet-validation.spec.ts',
  'e2e/cron-security.spec.ts',
  'e2e/pwa.spec.ts',
  'e2e/subscription-payment.spec.ts',
  'e2e/admin-panel-flow.spec.ts'
]

let targetFiles = []
if (isSmoke) {
  targetFiles = smokeFiles
} else if (isRegression) {
  targetFiles = regressionFiles
} else {
  const customArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  if (customArgs.length > 0) {
    targetFiles = customArgs
  }
}

const testEnv = {
  ...process.env,
  NEXT_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_SUPABASE_URL: localSupabase.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabase.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: localSupabase.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: testBaseUrl,
  NEXT_PUBLIC_SITE_URL: testBaseUrl,
  TEST_BASE_URL: testBaseUrl,
  ODIPET_BASE_URL: testBaseUrl,
  TEST_EMAIL: LOCAL_E2E_EMAIL,
  TEST_PASSWORD: LOCAL_E2E_PASSWORD,
  TEST_PET_ID: LOCAL_E2E_PET_ID,
  TEST_ADMIN_EMAIL: LOCAL_E2E_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD: LOCAL_E2E_ADMIN_PASSWORD,
  TEST_CAREGIVER_EMAIL: LOCAL_E2E_CAREGIVER_EMAIL,
  TEST_CAREGIVER_PASSWORD: LOCAL_E2E_CAREGIVER_PASSWORD,
  CRON_SECRET: 'odi-pet-local-e2e-cron-secret',
  PLAYWRIGHT_TEST: 'true',
}

console.log('🌱 [QA ENGINE] Seeding local E2E database fixtures...')
try {
  await seedLocalE2EFixtures({
    apiUrl: localSupabase.API_URL,
    serviceRoleKey: localSupabase.SERVICE_ROLE_KEY,
  })
  console.log('✔ [QA ENGINE] Local E2E fixtures seeded successfully.')
} catch (error) {
  console.error('❌ [QA ENGINE] E2E test fixtures seeding failed:', error)
  process.exit(1)
}

if (skipBuild && !existsSync('.next-e2e/BUILD_ID')) {
  console.error('❌ [QA ENGINE] E2E_SKIP_BUILD requires an existing `.next-e2e` build.')
  process.exit(1)
}

if (!skipBuild) {
  console.log('📦 [QA ENGINE] Building Next.js (.next-e2e)...')
  const buildResult = spawnSync(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'build'],
    { env: testEnv, stdio: 'inherit' }
  )
  if (buildResult.status !== 0) {
    console.error('❌ [QA ENGINE] Next.js build failed.')
    process.exit(buildResult.status ?? 1)
  }

  console.log('📦 [QA ENGINE] Building Serwist Service Worker...')
  const swResult = spawnSync(
    process.execPath,
    ['node_modules/@serwist/cli/cli.js', 'build', 'serwist.config.mjs', '--no-update-notifier'],
    { env: testEnv, stdio: 'inherit' }
  )
  if (swResult.status !== 0) {
    console.error('❌ [QA ENGINE] Serwist build failed.')
    process.exit(swResult.status ?? 1)
  }
}

if (!existsSync('test-results')) {
  mkdirSync('test-results', { recursive: true })
}

const jsonReportPath = join('test-results', 'playwright-raw-results.json')
const playwrightArgs = [
  'node_modules/@playwright/test/cli.js',
  'test',
  ...targetFiles,
  `--reporter=json,html`,
]

const envForPlaywright = {
  ...testEnv,
  PLAYWRIGHT_JSON_OUTPUT_NAME: jsonReportPath,
}

console.log(`🚀 [QA ENGINE] Executing Playwright suite (${targetFiles.length > 0 ? targetFiles.join(', ') : 'all'})...`)
const result = spawnSync(process.execPath, playwrightArgs, {
  env: envForPlaywright,
  stdio: 'inherit',
})

// Failure Classification Engine
function classifyFailure(spec) {
  const errorText = spec.error?.message || spec.error?.stack || ''
  if (errorText.includes('ERR_CONNECTION_REFUSED') || errorText.includes('NS_ERROR_CONNECTION_REFUSED') || errorText.includes('Could not connect to server')) {
    return 'ENVIRONMENT'
  }
  if (errorText.includes('auth') || errorText.includes('login') || errorText.includes('redirected away from /login')) {
    return 'AUTH_FAILURE'
  }
  if (errorText.includes('supabase') || errorText.includes('PostgrestError') || errorText.includes('relation') || errorText.includes('foreign key')) {
    return 'DATABASE_FAILURE'
  }
  if (errorText.includes('Timeout') || errorText.includes('exceeded')) {
    return 'TIMEOUT'
  }
  if (errorText.includes('data-testid') || errorText.includes('toBeVisible') || errorText.includes('toHaveURL') || errorText.includes('locator')) {
    return 'APP_BUG'
  }
  return 'UNKNOWN'
}

let rawJson = null
if (existsSync(jsonReportPath)) {
  try {
    rawJson = JSON.parse(readFileSync(jsonReportPath, 'utf8'))
  } catch (e) {
    console.warn('⚠️ [QA ENGINE] Could not parse raw Playwright JSON output:', e.message)
  }
}

// Read previous qa-results.json if available
const qaResultsPath = join('test-results', 'qa-results.json')
let previousResults = null
if (existsSync(qaResultsPath)) {
  try {
    previousResults = JSON.parse(readFileSync(qaResultsPath, 'utf8'))
  } catch (e) {
    // Ignore invalid previous JSON
  }
}

const testsSummary = {
  total: 0,
  passed: 0,
  failed: 0,
  flaky: 0,
  skipped: 0,
}

const testList = []
const regressions = []
const classificationCounts = {
  APP_BUG: 0,
  TEST_BUG: 0,
  ENVIRONMENT: 0,
  AUTH_FAILURE: 0,
  DATABASE_FAILURE: 0,
  NETWORK_FAILURE: 0,
  TIMEOUT: 0,
  FLAKY: 0,
  BLOCKED: 0,
  UNKNOWN: 0,
}

if (rawJson && rawJson.suites) {
  function processSuite(suite) {
    for (const spec of suite.specs || []) {
      for (const testItem of spec.tests || []) {
        testsSummary.total += 1
        const title = `${spec.title}`
        const status = testItem.status
        const isFlaky = testItem.results && testItem.results.length > 1 && testItem.status === 'expected'

        let classification = 'PASS'
        let errorMessage = null

        if (status === 'expected') {
          if (isFlaky) {
            testsSummary.flaky += 1
            classification = 'FLAKY'
            classificationCounts.FLAKY += 1
          } else {
            testsSummary.passed += 1
          }
        } else if (status === 'skipped') {
          testsSummary.skipped += 1
          classification = 'BLOCKED'
          classificationCounts.BLOCKED += 1
        } else {
          testsSummary.failed += 1
          const lastResult = testItem.results?.[testItem.results.length - 1]
          classification = classifyFailure(lastResult || {})
          classificationCounts[classification] = (classificationCounts[classification] || 0) + 1
          errorMessage = lastResult?.error?.message || 'Test assertion failed'
        }

        const testEntry = {
          title,
          file: spec.file || '',
          status,
          classification,
          duration: testItem.results?.[0]?.duration || 0,
          error: errorMessage,
        }

        testList.push(testEntry)

        // Regression check
        if (previousResults && previousResults.tests) {
          const prevMatch = previousResults.tests.find(t => t.title === title && t.file === spec.file)
          if (prevMatch && prevMatch.classification === 'PASS' && classification !== 'PASS') {
            regressions.push({
              title,
              file: spec.file,
              previous: 'PASS',
              current: classification,
              error: errorMessage,
            })
          }
        }
      }
    }
    for (const sub of suite.suites || []) {
      processSuite(sub)
    }
  }

  for (const s of rawJson.suites) {
    processSuite(s)
  }
}

const finalResults = {
  runId: `run-${Date.now()}`,
  timestamp: new Date().toISOString(),
  branch: process.env.GIT_BRANCH || 'phase18-wip',
  commit: process.env.GIT_COMMIT || 'a3982da',
  environment: {
    supabaseUrl: localSupabase.API_URL,
    testBaseUrl,
    nodeVersion: process.version,
  },
  summary: testsSummary,
  classifications: classificationCounts,
  regressions,
  tests: testList,
  recommendations: buildQaRecommendations(testsSummary, classificationCounts, regressions),
}

function buildQaRecommendations(summary, classifications, regressionsList) {
  const recs = []
  if (regressionsList.length > 0) {
    recs.push(`⚠️ ${regressionsList.length} YENİ REGRESSION TESPİT EDİLDİ! Önceki çalışan testler şu an patlıyor.`)
  }
  if (classifications.ENVIRONMENT > 0) {
    recs.push('🔌 TEST ORTAMI HATASI: Sunucu veya port bağlantısı reddedildi. Next.js / Supabase servislerini doğrulayın.')
  }
  if (classifications.AUTH_FAILURE > 0) {
    recs.push('🔑 AUTHENTICATION HATASI: Test kullanıcısı session veya yetkilendirme yönlendirmesi başarısız.')
  }
  if (classifications.APP_BUG > 0) {
    recs.push(`🐛 UYGULAMA BUG'I TESPİT EDİLDİ: ${classifications.APP_BUG} adet testte UI elemanı veya yönlendirme beklenenden farklı.`)
  }
  if (classifications.FLAKY > 0) {
    recs.push(`⚡ FLAKY TESTLER: ${classifications.FLAKY} test ilk seferde kalıp retry ile geçti. Zamanlama sorunlarını inceleyin.`)
  }
  if (summary.failed === 0 && summary.total > 0) {
    recs.push('🎉 TÜM QA TESTLERİ BAŞARIYLA GEÇTİ!')
  }
  return recs
}

// Write machine-readable qa-results.json
writeFileSync(qaResultsPath, JSON.stringify(finalResults, null, 2), 'utf8')
console.log(`\n📄 [QA ENGINE] Machine-readable report saved: ${qaResultsPath}`)

// Write human/agent-readable QA_REPORT.md
const markdownReportPath = join('QA_REPORT.md')
const markdownContent = `# Odi.Pet Autonomous QA Report

**Run ID:** \`${finalResults.runId}\`  
**Generated At:** \`${finalResults.timestamp}\`  
**Branch:** \`${finalResults.branch}\` | **Commit:** \`${finalResults.commit}\`  
**Test Base URL:** \`${testBaseUrl}\` | **Supabase URL:** \`${localSupabase.API_URL}\`  

---

## 📊 Summary

- **Total Executed:** ${testsSummary.total}
- **Passed:** ✅ ${testsSummary.passed}
- **Failed:** ❌ ${testsSummary.failed}
- **Flaky:** ⚡ ${testsSummary.flaky}
- **Skipped / Blocked:** ⛔ ${testsSummary.skipped}
- **Regressions:** ⚠️ ${regressions.length}

---

## 🔍 Failure Classifications

| Classification | Count | Description |
| :--- | :--- | :--- |
| **APP_BUG** | ${classificationCounts.APP_BUG} | Uygulama UI/davranış beklenenden farklı |
| **TEST_BUG** | ${classificationCounts.TEST_BUG} | Test fixture/selector hatası |
| **ENVIRONMENT** | ${classificationCounts.ENVIRONMENT} | Sunucu/Port/DB erişim sorunu |
| **AUTH_FAILURE** | ${classificationCounts.AUTH_FAILURE} | Kimlik doğrulama/Session hatası |
| **DATABASE_FAILURE** | ${classificationCounts.DATABASE_FAILURE} | Supabase DB sorgu/veri hatası |
| **TIMEOUT** | ${classificationCounts.TIMEOUT} | Test zaman aşımı |
| **FLAKY** | ${classificationCounts.FLAKY} | Retry sonrası geçen kararsız test |

---

## 🚨 Regressions (${regressions.length})

${regressions.length === 0 ? '_Henüz yeni regression bulunmadı._' : regressions.map(r => `- **${r.title}** (\`${r.file}\`): ${r.previous} ➡️ ${r.current}\n  _Error:_ \`${r.error}\``).join('\n')}

---

## 🛠 Recommended Actions

${finalResults.recommendations.map(r => `- ${r}`).join('\n')}

---

## 📜 Detailed Test Execution List

${testList.map(t => `- [${t.classification === 'PASS' ? '✅ PASS' : '❌ ' + t.classification}] **${t.title}** (${t.duration}ms)\n  ${t.error ? '  _Message:_ `' + t.error + '`' : ''}`).join('\n')}
`

writeFileSync(markdownReportPath, markdownContent, 'utf8')
console.log(`📝 [QA ENGINE] Human/Agent readable Markdown report saved: ${markdownReportPath}\n`)

process.exit(result.status ?? 0)
