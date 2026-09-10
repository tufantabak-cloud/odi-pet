import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  EXACT_VISION_MODEL,
  EXACT_API_VERSION,
  MAX_OUTPUT_TOKENS,
  COVER_SCHEMA,
  PAGE5_SCHEMA,
  PAGE6_SCHEMA,
  PAGE7_SCHEMA,
  extractPassportPage,
} from '../vision-gateway'

// Mock @google/genai
const mockGenerateContent = vi.fn()
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      }
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
    },
  }
})

describe('Smart Scan Vision Gateway Configuration', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear()
  })

  it('pins exact model to gemini-3.8-flash', () => {
    expect(EXACT_VISION_MODEL).toBe('gemini-3.8-flash')
  })

  it('pins exact api version to v1beta', () => {
    expect(EXACT_API_VERSION).toBe('v1beta')
  })

  it('pins maximum output tokens to 512', () => {
    expect(MAX_OUTPUT_TOKENS).toBe(512)
  })

  it('provides structured JSON schemas for Cover, Page 5, Page 6, and Page 7', () => {
    expect(COVER_SCHEMA.properties?.passport_no).toBeDefined()
    expect(PAGE5_SCHEMA.properties?.name).toBeDefined()
    expect(PAGE5_SCHEMA.properties?.species).toBeDefined()
    expect(PAGE6_SCHEMA.properties?.microchip_no).toBeDefined()
    expect(PAGE7_SCHEMA.properties?.vaccination_name).toBeDefined()
  })

  it('calls generateContent with thinkingLevel: low, maxOutputTokens: 512 and exact model', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        name: 'Pamuk',
        species: 'cat',
        breed: 'Van Kedisi',
        confidence: 0.95,
      }),
    })

    const result = await extractPassportPage({
      pageType: 'page_5',
      imageBase64: 'data:image/jpeg;base64,dGVzdA==',
      apiKey: 'test-key',
    })

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    const callArg = mockGenerateContent.mock.calls[0][0]

    expect(callArg.model).toBe('gemini-3.8-flash')
    expect(callArg.config.maxOutputTokens).toBe(512)
    expect(callArg.config.responseMimeType).toBe('application/json')
    expect(callArg.config.thinkingConfig).toEqual({ thinkingLevel: 'low' })

    expect(result.data).toEqual({
      name: 'Pamuk',
      species: 'cat',
      breed: 'Van Kedisi',
      confidence: 0.95,
    })
    expect(result.modelUsed).toBe('gemini-3.8-flash')
  })

  it('propagates error without second LLM retry on provider failure', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Google 503 High Demand'))

    await expect(
      extractPassportPage({
        pageType: 'page_5',
        imageBase64: 'test',
        apiKey: 'test-key',
      })
    ).rejects.toThrow('Google 503 High Demand')

    // Proves NO second LLM retry is attempted
    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
  })
})
