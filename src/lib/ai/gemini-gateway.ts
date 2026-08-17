import { GoogleGenerativeAI, Schema } from '@google/generative-ai'

/**
 * Merkezi Gemini gateway'i.
 *
 * NEDEN VAR: Production'da (2026-08-17, dpl_DVyCFgNXkLW6sDeAwvTjPKv9jEbD)
 * /api/ai-vet cagrisi su hatayla dustu:
 *   [503 Service Unavailable] This model is currently experiencing high demand.
 *   Spikes in demand are usually temporary. Please try again later.
 * Cagri yolunda retry veya yedek model olmadigi icin tek bir gecici saglayici
 * hatasi dogrudan kullaniciya "degerlendirme olusturulamadi" olarak yansidi.
 *
 * Bu modul saglayici cagrisini tek noktada toplar: gecici hatalarda (429/5xx)
 * ustel geri cekilme ile yeniden dener, ardindan yedek modele duser. Kalici
 * hatalarda (400/401/403/404) hic denemez — hizli basarisiz olur.
 *
 * Zamanlama butcesi bilinclidir: en kotu durumda ~1.2sn ek bekleme eklenir,
 * boylece 10sn'lik serverless limitinde bile guvenle calisir.
 */

/** Saglayici tarafinda gecici kabul edilen HTTP durumlari. */
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504])

/** Denemeler arasi temel bekleme (ms). Gercek bekleme ustel + jitter'lidir. */
const BASE_BACKOFF_MS = 400

/** Ayni model uzerinde toplam deneme sayisi (ilk cagri dahil). */
const ATTEMPTS_PER_MODEL = 2

export interface GeminiGenerateParams {
  apiKey: string
  /** Sirayla denenecek modeller. Ilki birincil, sonrakiler yedek. */
  models: string[]
  systemInstruction: string
  responseSchema?: Schema
  maxOutputTokens?: number
  history?: { role: 'user' | 'model'; parts: { text: string }[] }[]
  message: string
}

export interface GeminiGenerateResult {
  /** Modelin dondurdugu ham metin (structured output'ta JSON string). */
  text: string
  /** Cevabi gercekten ureten model. Gozlemlenebilirlik icin doner. */
  modelUsed: string
  /** Toplam yapilan saglayici cagrisi sayisi. */
  attempts: number
  /** Yedek modele dusuldu mu (birincil model basarisiz oldu mu). */
  usedFallback: boolean
}

/**
 * Hatadan HTTP durum kodunu cikarir.
 * @google/generative-ai hatayi `status` alaniyla verir; bazi surumlerde bu alan
 * bos gelir, o yuzden mesaj metnine de bakariz.
 */
export function extractStatus(err: unknown): number | null {
  const e = err as { status?: number; message?: string }
  if (typeof e?.status === 'number') return e.status
  const match = e?.message?.match(/\[(\d{3})\s/)
  return match ? Number(match[1]) : null
}

/** Hata yeniden denemeye deger mi? Ag/timeout hatalari da gecici sayilir. */
export function isTransientError(err: unknown): boolean {
  const status = extractStatus(err)
  if (status !== null) return TRANSIENT_STATUS.has(status)
  // Durum kodu yoksa ag katmani hatasi olabilir (fetch failed, ECONNRESET...).
  const message = (err as { message?: string })?.message?.toLowerCase() ?? ''
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset')
  )
}

/** Ustel geri cekilme + jitter. Jitter, es zamanli isteklerin ayni anda tekrar denemesini onler. */
function backoffDelay(attemptIndex: number): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attemptIndex)
  const jitter = Math.random() * BASE_BACKOFF_MS
  return exponential + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Yapilandirilmis (structured output) icerik uretir.
 * Model zincirini sirayla dener; her modelde gecici hatalarda tekrar dener.
 *
 * @throws Tum modeller tukendiginde son hatayi firlatir. Cagiran taraf kendi
 *         guvenli fallback'ini uygulamaya devam eder.
 */
export async function generateStructuredContent(
  params: GeminiGenerateParams
): Promise<GeminiGenerateResult> {
  const {
    apiKey,
    models,
    systemInstruction,
    responseSchema,
    maxOutputTokens = 2048,
    history = [],
    message,
  } = params

  if (models.length === 0) {
    throw new Error('generateStructuredContent: en az bir model gerekli')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  let attempts = 0
  let lastError: unknown

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex]

    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        attempts++
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: {
            maxOutputTokens,
            responseMimeType: 'application/json',
            ...(responseSchema ? { responseSchema } : {}),
          },
        })

        const chat = model.startChat({ history })
        const result = await chat.sendMessage(message)

        return {
          text: result.response.text(),
          modelUsed: modelName,
          attempts,
          usedFallback: modelIndex > 0,
        }
      } catch (err) {
        lastError = err
        const status = extractStatus(err)

        // Kalici hata: yeniden denemek de yedek modele dusmek de anlamsiz.
        if (!isTransientError(err)) {
          console.error(
            `[gemini-gateway] Kalici hata (model=${modelName}, status=${status}). Yeniden denenmiyor.`,
            err
          )
          throw err
        }

        const isLastAttemptOnModel = attempt === ATTEMPTS_PER_MODEL - 1
        const isLastModel = modelIndex === models.length - 1

        console.warn(
          `[gemini-gateway] Gecici hata (model=${modelName}, status=${status}, deneme=${attempt + 1}/${ATTEMPTS_PER_MODEL}).`
        )

        if (isLastAttemptOnModel && isLastModel) break
        await sleep(backoffDelay(attempt))
      }
    }

    if (modelIndex < models.length - 1) {
      console.warn(
        `[gemini-gateway] ${modelName} tukendi, yedek modele geciliyor: ${models[modelIndex + 1]}`
      )
    }
  }

  console.error('[gemini-gateway] Tum modeller basarisiz oldu.', lastError)
  throw lastError
}
