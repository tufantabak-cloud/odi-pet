import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

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

const status = spawnSync(
  statusCommand,
  statusArgs,
  { encoding: 'utf8' }
)

if (status.status !== 0) {
  const detail = status.error?.message || status.stderr?.trim()
  console.error(
    'Yerel Supabase çalışmıyor. Önce `npx supabase start` çalıştırın.'
  )
  if (detail) console.error(detail)
  process.exit(status.status ?? 1)
}

let localSupabase
try {
  localSupabase = JSON.parse(status.stdout)
} catch {
  console.error('Yerel Supabase durum çıktısı okunamadı.')
  process.exit(1)
}

const apiUrl = new URL(localSupabase.API_URL)
if (!['127.0.0.1', 'localhost', '::1'].includes(apiUrl.hostname)) {
  console.error('REFUSING_REMOTE_DATABASE_IN_E2E_TEST')
  process.exit(1)
}

const testBaseUrl = 'http://127.0.0.1:3100'
const playwrightArgs = [
  'node_modules/@playwright/test/cli.js',
  'test',
  ...process.argv.slice(2),
]

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

try {
  await seedLocalE2EFixtures({
    apiUrl: localSupabase.API_URL,
    serviceRoleKey: localSupabase.SERVICE_ROLE_KEY,
  })
} catch (error) {
  console.error('Yerel E2E test verileri hazırlanamadı.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const skipBuild = process.env.E2E_SKIP_BUILD === '1'
if (skipBuild && !existsSync('.next-e2e/BUILD_ID')) {
  console.error(
    'E2E_SKIP_BUILD yalnızca mevcut bir .next-e2e üretim derlemesiyle kullanılabilir.'
  )
  process.exit(1)
}

if (!skipBuild) {
  const buildResult = spawnSync(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'build'],
    {
      env: testEnv,
      stdio: 'inherit',
    }
  )

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1)
  }

  const serviceWorkerBuildResult = spawnSync(
    process.execPath,
    [
      'node_modules/@serwist/cli/cli.js',
      'build',
      'serwist.config.mjs',
      '--no-update-notifier',
    ],
    {
      env: testEnv,
      stdio: 'inherit',
    }
  )

  if (serviceWorkerBuildResult.status !== 0) {
    process.exit(serviceWorkerBuildResult.status ?? 1)
  }
}

const result = spawnSync(
  process.execPath,
  playwrightArgs,
  {
    env: testEnv,
    stdio: 'inherit',
  }
)

process.exit(result.status ?? 1)
