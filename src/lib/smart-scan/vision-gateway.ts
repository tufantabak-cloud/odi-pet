import { GoogleGenAI, Type, Schema } from '@google/genai'

export const EXACT_VISION_MODEL = 'gemini-3.8-flash'
export const EXACT_API_VERSION = 'v1beta'
export const MAX_OUTPUT_TOKENS = 512

export type PassportPageType = 'cover' | 'page_5' | 'page_6' | 'page_7'

export interface CoverExtraction {
  passport_no?: string | null
  microchip_no?: string | null
}

export interface Page5Extraction {
  name?: string | null
  species?: 'cat' | 'dog' | null
  breed?: string | null
  gender?: 'male' | 'female' | null
  birth_date?: string | null
  color?: string | null
}

export interface Page6Extraction {
  microchip_no?: string | null
  implant_date?: string | null
  implant_location?: string | null
}

export interface Page7Extraction {
  vaccination_name?: string | null
  vaccination_date?: string | null
  valid_until?: string | null
  veterinarian_name?: string | null
}

export interface VisionExtractionResult<T> {
  data: T
  rawJson: string
  modelUsed: string
  confidence: number
}

// Schemas for structured output per page
export const COVER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    passport_no: { type: Type.STRING, description: 'T.C. Pasaport Numarası (örn. TR-06-123456 veya benzeri)' },
    microchip_no: { type: Type.STRING, description: '15 haneli mikroçip numarası' },
    confidence: { type: Type.NUMBER, description: '0.0 ile 1.0 arasında genel güven skoru' },
  },
  required: ['confidence'],
}

export const PAGE5_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Evcil hayvanın adı' },
    species: { type: Type.STRING, enum: ['cat', 'dog'], description: 'Tür: cat veya dog' },
    breed: { type: Type.STRING, description: 'Irk / Cins adı' },
    gender: { type: Type.STRING, enum: ['male', 'female'], description: 'Cinsiyet: male veya female' },
    birth_date: { type: Type.STRING, description: 'Doğum tarihi (YYYY-MM-DD formatında)' },
    color: { type: Type.STRING, description: 'Renk ve ayırt edici işaretler' },
    confidence: { type: Type.NUMBER, description: '0.0 ile 1.0 arasında güven skoru' },
  },
  required: ['confidence'],
}

export const PAGE6_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    microchip_no: { type: Type.STRING, description: '15 haneli mikroçip numarası' },
    implant_date: { type: Type.STRING, description: 'Mikroçip uygulama tarihi (YYYY-MM-DD)' },
    implant_location: { type: Type.STRING, description: 'Mikroçipin uygulandığı vücut bölgesi' },
    confidence: { type: Type.NUMBER, description: '0.0 ile 1.0 arasında güven skoru' },
  },
  required: ['confidence'],
}

export const PAGE7_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    vaccination_name: { type: Type.STRING, description: 'Uygulanan aşı adı (örn. Kuduz / Rabies, Karma)' },
    vaccination_date: { type: Type.STRING, description: 'Aşı uygulama tarihi (YYYY-MM-DD)' },
    valid_until: { type: Type.STRING, description: 'Aşının geçerlilik bitiş tarihi (YYYY-MM-DD)' },
    veterinarian_name: { type: Type.STRING, description: 'Uygulayan veteriner hekim adı/kaşesi' },
    confidence: { type: Type.NUMBER, description: '0.0 ile 1.0 arasında güven skoru' },
  },
  required: ['confidence'],
}

const PAGE_SYSTEM_INSTRUCTIONS: Record<PassportPageType, string> = {
  cover: 'Sen T.C. Evcil Hayvan Pasaportu kapak sayfasını okuyan bir uzmansın. Pasaport numarasını ve varsa mikroçip etiket numarasını çıkar. Yalnızca istenen JSON şemasına uy.',
  page_5: 'Sen T.C. Evcil Hayvan Pasaportu Sayfa 5 (Kimlik Bilgileri) sayfasını okuyan bir uzmansın. Hayvanın adını, türünü (cat/dog), ırkını, cinsiyetini (male/female), doğum tarihini (YYYY-MM-DD) ve rengini çıkar. Yalnızca istenen JSON şemasına uy.',
  page_6: 'Sen T.C. Evcil Hayvan Pasaportu Sayfa 6 (Mikroçip & Dövme) sayfasını okuyan bir uzmansın. 15 haneli mikroçip numarasını, uygulama tarihini ve bölgesini çıkar. Yalnızca istenen JSON şemasına uy.',
  page_7: 'Sen T.C. Evcil Hayvan Pasaportu Sayfa 7 (Aşı ve Sağlık Kayıtları) sayfasını okuyan bir uzmansın. Aşı adını, uygulama tarihini, geçerlilik tarihini ve hekim adını çıkar. Yalnızca istenen JSON şemasına uy.',
}

const PAGE_SCHEMAS: Record<PassportPageType, Schema> = {
  cover: COVER_SCHEMA,
  page_5: PAGE5_SCHEMA,
  page_6: PAGE6_SCHEMA,
  page_7: PAGE7_SCHEMA,
}

/**
 * Executes a single, strictly-pinned Gemini 3.8 Flash vision extraction.
 * Invariants:
 * - exact model: gemini-3.8-flash
 * - thinkingLevel: low
 * - maxOutputTokens: 512
 * - responseMimeType: application/json
 * - NO fallback LLM (on error, throws so caller can trigger manual input fallback)
 */
export async function extractPassportPage<T>(params: {
  pageType: PassportPageType
  imageBase64: string
  mimeType?: string
  apiKey?: string
}): Promise<VisionExtractionResult<T>> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured')
  }

  // @google/genai client defaults to v1beta
  const ai = new GoogleGenAI({ apiKey })

  const systemInstruction = PAGE_SYSTEM_INSTRUCTIONS[params.pageType]
  const responseSchema = PAGE_SCHEMAS[params.pageType]

  const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const mimeType = params.mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: EXACT_VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Lütfen bu pasaport sayfasındaki (${params.pageType}) ilgili alanları oku ve JSON olarak döndür.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: {
          thinkingLevel: 'low' as any,
        },
      },
    })

    const rawJson = response.text || '{}'
    const parsed = JSON.parse(rawJson)
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8

    return {
      data: parsed as T,
      rawJson,
      modelUsed: EXACT_VISION_MODEL,
      confidence,
    }
  } catch (error) {
    console.error(`[smart-scan-vision] Vision extraction failed for ${params.pageType}:`, error)
    // Re-throw so caller handles graceful manual fallback (no second LLM retry)
    throw error
  }
}
