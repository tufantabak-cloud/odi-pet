import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { getIP, aiScoreRateLimit } from '@/lib/auth-security'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'
import { getUsageEngine } from '@/lib/features/usage'

const SYSTEM_PROMPT = `Sen bir veteriner triaj asistanısın. Kullanıcının tarif ettiği evcil hayvan belirtilerini değerlendirip aşağıdaki JSON formatında yanıt ver. SADECE JSON döndür, başka hiçbir şey yazma.

Format:
{
  "score": <0-100 arası risk puanı, tam sayı>,
  "severity": <"low" | "medium" | "critical">,
  "recommended_action": <Türkçe kısa tavsiye>,
  "reasoning": <Türkçe 1-2 cümle kısa açıklama>
}

Kurallar:
- score 0-30 → severity: "low"
- score 31-69 → severity: "medium"  
- score 70-100 → severity: "critical"
- Yalnızca evcil hayvan sağlığıyla ilgili girdilere yanıt ver.
- Eğer girdi veterinerlik ile alakasızsa: score:0, severity:"low", recommended_action:"Lütfen evcil hayvanınızın belirtilerini tarif edin."
`

function heuristicFallback(symptomStr: string) {
  const critical = ['kan', 'kriz', 'nöbet', 'bayıl', 'soluk alma', 'nefes', 'bilinç', 'titreme']
  const medium   = ['kusma', 'ateş', 'ishal', 'iştahsız', 'halsiz', 'şişlik', 'yara', 'akıntı']

  if (critical.some(w => symptomStr.includes(w))) {
    return { score: 90, severity: 'critical', recommended_action: 'Acil veteriner müdahalesi gerekli!', reasoning: null }
  }
  if (medium.some(w => symptomStr.includes(w))) {
    return { score: 50, severity: 'medium', recommended_action: 'Veteriner muayenesi önerilir', reasoning: null }
  }
  return { score: 10, severity: 'low', recommended_action: 'Gözlem altında tutun, gerekirse veterinere başvurun', reasoning: null }
}

async function handler(req: NextRequest) {
  // Auth guard — Gemini API maliyetini korumak için
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getIP(req)
  const { success } = await aiScoreRateLimit.limit(`${user.id}:${ip}`)
  if (!success) return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })

  const { symptoms } = await req.json()
  const symptomStr = (symptoms ?? '').toLowerCase()

  // İçerik uzunluk limiti
  if (symptomStr.length > 1000) {
    return NextResponse.json({ error: 'Belirti açıklaması çok uzun (max 1000 karakter).' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    // Quota consumption — check BEFORE expensive Gemini call
    const requestId = crypto.randomUUID()
    const usageResult = await getUsageEngine().consumeUsage({
      userId: user.id,
      featureKey: 'ai_vet',
      amount: 1,
      idempotencyKey: requestId,
    })
    
    if (!usageResult.success && !usageResult.idempotentAlreadyProcessed) {
      return NextResponse.json(
        { error: 'Kullanım kotanız doldu. Lütfen planınızı yükseltin.' },
        { status: 403 }
      )
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nBelirtiler: ${symptoms}` }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 256 },
      })

      const raw = result.response.text().trim()
      const parsed = JSON.parse(raw)

      return NextResponse.json({
        score: Number(parsed.score) || 10,
        severity: ['low', 'medium', 'critical'].includes(parsed.severity) ? parsed.severity : 'low',
        recommended_action: parsed.recommended_action ?? '',
        reasoning: parsed.reasoning ?? null,
        powered_by: 'gemini',
      })
    } catch (err) {
      console.error('[ai-score] Gemini API error, falling back to heuristic:', err)
    }
  }

  // Fallback: heuristic
  const fallback = heuristicFallback(symptomStr)
  return NextResponse.json({ ...fallback, powered_by: 'heuristic' })
}

export const POST = withAPIFeatureGuard('ai_vet', handler)

