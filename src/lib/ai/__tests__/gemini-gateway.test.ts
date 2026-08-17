import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractStatus, isTransientError } from '../gemini-gateway'

/**
 * Gateway'in davranis sozlesmesi:
 *  - Gecici hatalarda (429/5xx, ag hatalari) yeniden dener, sonra yedek modele duser
 *  - Kalici hatalarda (400/401/403/404) hic denemez, hizli basarisiz olur
 *
 * Production kaniti (2026-08-17): gemini-3.6-flash 503 "high demand" dondu ve
 * retry olmadigi icin kullaniciya fallback mesaji gitti.
 */

const sendMessageMock = vi.fn()
const getGenerativeModelMock = vi.fn(() => ({
  startChat: () => ({ sendMessage: sendMessageMock }),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getGenerativeModelMock
  },
  SchemaType: {},
}))

function geminiError(status: number, message = 'err') {
  return Object.assign(new Error(`[GoogleGenerativeAI Error]: [${status} ] ${message}`), { status })
}

function okResponse(text: string) {
  return { response: { text: () => text } }
}

describe('gemini-gateway hata siniflandirmasi', () => {
  it('durum kodunu error.status alanindan okur', () => {
    expect(extractStatus(geminiError(503))).toBe(503)
  })

  it('status alani yoksa mesajdan cikarir', () => {
    const err = new Error('[GoogleGenerativeAI Error]: [429 Too Many Requests] quota')
    expect(extractStatus(err)).toBe(429)
  })

  it('429 ve 5xx gecicidir', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(isTransientError(geminiError(status))).toBe(true)
    }
  })

  it('4xx istemci hatalari kalicidir', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(isTransientError(geminiError(status))).toBe(false)
    }
  })

  it('ag hatalari gecici sayilir', () => {
    expect(isTransientError(new Error('fetch failed'))).toBe(true)
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
  })
})

describe('gemini-gateway retry ve fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMessageMock.mockReset()
  })

  const baseParams = {
    apiKey: 'test-key',
    systemInstruction: 'test',
    message: 'merhaba',
  }

  it('ilk denemede basarili olursa tek cagri yapar', async () => {
    const { generateStructuredContent } = await import('../gemini-gateway')
    sendMessageMock.mockResolvedValueOnce(okResponse('{"ok":true}'))

    const result = await generateStructuredContent({
      ...baseParams,
      models: ['gemini-3.6-flash', 'gemini-2.0-flash'],
    })

    expect(result.text).toBe('{"ok":true}')
    expect(result.modelUsed).toBe('gemini-3.6-flash')
    expect(result.attempts).toBe(1)
    expect(result.usedFallback).toBe(false)
  })

  it('503 sonrasi ayni modelde tekrar dener ve basarili olur', async () => {
    const { generateStructuredContent } = await import('../gemini-gateway')
    sendMessageMock
      .mockRejectedValueOnce(geminiError(503, 'high demand'))
      .mockResolvedValueOnce(okResponse('{"recovered":true}'))

    const result = await generateStructuredContent({
      ...baseParams,
      models: ['gemini-3.6-flash', 'gemini-2.0-flash'],
    })

    expect(result.modelUsed).toBe('gemini-3.6-flash')
    expect(result.attempts).toBe(2)
    expect(result.usedFallback).toBe(false)
  })

  it('birincil model tukenince yedek modele duser (production 503 senaryosu)', async () => {
    const { generateStructuredContent } = await import('../gemini-gateway')
    sendMessageMock
      .mockRejectedValueOnce(geminiError(503, 'high demand'))
      .mockRejectedValueOnce(geminiError(503, 'high demand'))
      .mockResolvedValueOnce(okResponse('{"fallback":true}'))

    const result = await generateStructuredContent({
      ...baseParams,
      models: ['gemini-3.6-flash', 'gemini-2.0-flash'],
    })

    expect(result.modelUsed).toBe('gemini-2.0-flash')
    expect(result.usedFallback).toBe(true)
    expect(result.attempts).toBe(3)
  })

  it('kalici hatada (400) hic yeniden denemez', async () => {
    const { generateStructuredContent } = await import('../gemini-gateway')
    sendMessageMock.mockRejectedValue(geminiError(400, 'invalid schema'))

    await expect(
      generateStructuredContent({
        ...baseParams,
        models: ['gemini-3.6-flash', 'gemini-2.0-flash'],
      })
    ).rejects.toThrow()

    expect(sendMessageMock).toHaveBeenCalledTimes(1)
  })

  it('tum modeller tukenirse son hatayi firlatir', async () => {
    const { generateStructuredContent } = await import('../gemini-gateway')
    sendMessageMock.mockRejectedValue(geminiError(503, 'high demand'))

    await expect(
      generateStructuredContent({
        ...baseParams,
        models: ['gemini-3.6-flash', 'gemini-2.0-flash'],
      })
    ).rejects.toThrow()

    // 2 model x 2 deneme
    expect(sendMessageMock).toHaveBeenCalledTimes(4)
  })
})
