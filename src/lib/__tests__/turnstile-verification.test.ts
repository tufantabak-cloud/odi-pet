import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from '../auth-security';

describe('Turnstile Server-Side Verification (BUG-007 Audit)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.PLAYWRIGHT_TEST;
    delete process.env.TURNSTILE_BYPASS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('Test A: returns true for valid token in production when Cloudflare returns success', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAA_test_secret_key';

    const globalFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, 'error-codes': [] }),
    } as Response);

    const result = await verifyTurnstile('valid_token_xyz', '127.0.0.1');
    expect(result).toBe(true);
    expect(globalFetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('Test B: returns false for invalid/expired token in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAA_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    } as Response);

    const result = await verifyTurnstile('invalid_token_123', '127.0.0.1');
    expect(result).toBe(false);
  });

  it('Test C: returns false when token is missing or empty', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAA_test_secret_key';

    const resultNull = await verifyTurnstile(null, '127.0.0.1');
    const resultEmpty = await verifyTurnstile('', '127.0.0.1');

    expect(resultNull).toBe(false);
    expect(resultEmpty).toBe(false);
  });

  it('Test D: returns false in production when TURNSTILE_SECRET_KEY is missing (Missing Server Secret)', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET_KEY;

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await verifyTurnstile('some_token', '127.0.0.1');
    expect(result).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('TURNSTILE_SECRET_KEY is not set in production.');
  });

  it('Test E: handles network failure gracefully without throwing or leaking error details', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAA_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await verifyTurnstile('token_during_outage', '127.0.0.1');
    expect(result).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Turnstile verification error:', expect.any(Error));
  });

  it('Test F: TURNSTILE_BYPASS=true returns true immediately (used during maintenance/bypass)', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.TURNSTILE_BYPASS = 'true';
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyTurnstile(null, '127.0.0.1');
    expect(result).toBe(true);
  });
});
