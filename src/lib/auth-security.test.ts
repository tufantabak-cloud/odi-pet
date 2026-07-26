import { afterEach, describe, expect, it } from 'vitest'
import { isTrustedPlaywrightTestEnvironment } from './auth-security'

const originalEnvironment = {
  PLAYWRIGHT_TEST: process.env.PLAYWRIGHT_TEST,
  TEST_BASE_URL: process.env.TEST_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('trusted Playwright environment', () => {
  it('açık test bayrağı ve yalnızca yerel adreslerle etkinleşir', () => {
    process.env.PLAYWRIGHT_TEST = 'true'
    process.env.TEST_BASE_URL = 'http://127.0.0.1:3100'
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3100'
    process.env.NEXT_PUBLIC_APP_URL = 'http://[::1]:3100'

    expect(isTrustedPlaywrightTestEnvironment()).toBe(true)
  })

  it('test bayrağı olmadan etkinleşmez', () => {
    delete process.env.PLAYWRIGHT_TEST
    process.env.TEST_BASE_URL = 'http://127.0.0.1:3100'

    expect(isTrustedPlaywrightTestEnvironment()).toBe(false)
  })

  it('herhangi bir üretim adresi yapılandırılmışsa etkinleşmez', () => {
    process.env.PLAYWRIGHT_TEST = 'true'
    process.env.TEST_BASE_URL = 'http://127.0.0.1:3100'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://odi.pet'

    expect(isTrustedPlaywrightTestEnvironment()).toBe(false)
  })
})
