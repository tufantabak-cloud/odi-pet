import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackEvent } from './track'

describe('Analytics - trackEvent', () => {
  beforeEach(() => {
    // Mock global fetch so we don't hit the network
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call fetch with the correct endpoint', async () => {
    await trackEvent('pet_created', { petId: 'abc' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/onboarding',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should include event name and payload in the body', async () => {
    await trackEvent('vaccine_added', { vaccineCode: 'DHPPI' })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.event).toBe('vaccine_added')
    expect(body.payload.vaccineCode).toBe('DHPPI')
  })

  it('should use an empty object as payload when none is provided', async () => {
    await trackEvent('page_view')
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.payload).toEqual({})
  })

  it('should include a timestamp (ts) in the body', async () => {
    await trackEvent('test_event')
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(typeof body.ts).toBe('string')
    expect(new Date(body.ts).toString()).not.toBe('Invalid Date')
  })

  it('should NOT throw even if fetch rejects (fire-and-forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    // Should resolve without throwing
    await expect(trackEvent('event_while_offline')).resolves.toBeUndefined()
  })
})
