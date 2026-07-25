import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const configPath = process.argv[2] || 'vitest.integration.config.mts'
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
  console.error('REFUSING_REMOTE_DATABASE_IN_INTEGRATION_TEST')
  process.exit(1)
}

if (!localSupabase.ANON_KEY || !localSupabase.SERVICE_ROLE_KEY) {
  console.error('Yerel Supabase test anahtarları bulunamadı.')
  process.exit(1)
}

const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--config',
    configPath,
  ],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: localSupabase.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabase.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: localSupabase.SERVICE_ROLE_KEY,
    },
    stdio: 'inherit',
  }
)

process.exit(result.status ?? 1)
