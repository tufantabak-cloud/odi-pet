import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests to avoid Supabase auth cookie collisions. */
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.TEST_BASE_URL || process.env.ODIPET_BASE_URL || 'http://127.0.0.1:3100',

    /* Ensure navigator.userAgent includes Playwright for all test browsers */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Playwright',

    /* Collect trace, screenshots and videos on failure */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: (devices['Desktop Chrome'].userAgent || '') + ' Playwright',
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        userAgent: (devices['Desktop Firefox'].userAgent || '') + ' Playwright',
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        userAgent: (devices['Desktop Safari'].userAgent || '') + ' Playwright',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx next start -p 3100',
    url: process.env.TEST_BASE_URL || 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || '.next-e2e',
      PORT: '3100',
    },
  },
});

