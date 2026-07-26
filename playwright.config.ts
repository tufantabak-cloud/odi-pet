import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const localUrl = new URL(baseURL);

if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(localUrl.hostname)) {
  throw new Error('REFUSING_REMOTE_URL_IN_DEFAULT_E2E_CONFIG');
}

export default defineConfig({
  testDir: '.',
  testMatch: [
    'tests/**/*.spec.ts',
    'e2e/**/*.spec.ts',
  ],
  testIgnore: [
    '**/.claude/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/scratch/**',
    'tests/live*.spec.ts',
    'tests/smoke-test-sprint42.spec.ts',
    'e2e/test_login_diagnostic.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Run sequentially to avoid rate limiting and allow clean logging
  reporter: [
    ['html', { outputFolder: '.next-e2e/playwright-report', open: 'never' }],
  ],
  outputDir: '.next-e2e/test-results',
  timeout: 120000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${localUrl.port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      // Explicitly forward critical env vars to the webServer child process.
      // Playwright does not reliably inherit the runner's env on all platforms.
      PLAYWRIGHT_TEST: process.env.PLAYWRIGHT_TEST ?? '',
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? '.next',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '',
      CRON_SECRET: process.env.CRON_SECRET ?? '',
    },
  },
});
