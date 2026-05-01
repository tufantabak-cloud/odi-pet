/**
 * trackEvent — fire‑and‑forget analytics helper.
 * Never throws; analytics should never break the user flow.
 */
export async function trackEvent(
  event: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch('/api/analytics/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload: payload ?? {}, ts: new Date().toISOString() }),
    })
  } catch {
    // Silent — analytics must never block UI
  }
}
