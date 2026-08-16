import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnboarding } from '../useOnboarding';

describe('useOnboarding & Fetch Interceptor', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should not swallow or wrap native fetch errors when network fails', async () => {
    // Mock fetch to simulate a network error (Failed to fetch)
    const mockNetworkError = new TypeError('Failed to fetch');
    global.fetch = vi.fn().mockRejectedValue(mockNetworkError);

    // Call fetch directly
    await expect(fetch('/api/test')).rejects.toThrow('Failed to fetch');
  });
});
