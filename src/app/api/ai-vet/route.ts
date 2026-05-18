import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_INSTRUCTION = `Sen Odi AI Vet adlı bir veteriner triaj asistanısın. Türkçe konuşuyorsun.

Görevin:
1. Kullanıcının tarif ettiği evcil hayvan belirtilerini dinle.
2. Bağlamsal, açıklayıcı ve empatik bir yanıt ver — iki ila dört paragraf.
3. Risk seviyesini (düşük / orta / kritik) ve gerekçesini her zaman açıkla.
4. Mümkünse olası nedenleri listele (örn. besin zehirlenmesi, enfeksiyon vb.).
5. Somut, uygulanabilir bir sonraki adım öner.
6. Yanıtının en sonuna, sadece şu formatta tek satır ekle (başka bir şey yazma):
   [SCORE:XX][SEV:low|medium|critical]
   XX = 0-100 arası tam sayı risk skoru

Kurallar:
- Skor 0-30 → sev: low
- Skor 31-69 → sev: medium
- Skor 70-100 → sev: critical
- Yalnızca evcil hayvan sağlığı ile ilgili konulara cevap ver.
- Kullanıcı alakasız bir şey sorarsa nazikçe yönlendir.
- Tıbbi kesinlik iddiasında bulunma; "olabilir", "muhtemelen" gibi ifadeler kullan.
- Veteriner ziyaretinin yerini tutmadığını vurgula.`

interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

function parseScoreLine(text: string): { score: number; severity: string; cleanText: string } {
  const match = text.match(/\[SCORE:(\d+)\]\[SEV:(low|medium|critical)\]/)
  if (!match) return { score: 10, severity: 'low', cleanText: text.trim() }

  const score = Math.min(100, Math.max(0, Number(match[1])))
  const severity = match[2]
  const cleanText = text.replace(match[0], '').replace(/\n\s*$/, '').trim()
  return { score, severity, cleanText }
}

function heuristicFallback(_symptomStr?: string) {
  return {
    score: 50, severity: 'medium',
    text: 'Sistemlerimizde şu an geçici bir yoğunluk yaşanıyor, lütfen birazdan tekrar deneyin. Eğer evcil dostunuzun durumu acilse, vakit kaybetmeden en yakın veteriner kliniğine başvurmanızı önemle tavsiye ederiz.',
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // history: array of { role: 'user'|'model', text: string }
  const history: { role: 'user' | 'model'; text: string }[] = body.history ?? []
  const petContext = body.petContext ?? null

  let systemInstruction = SYSTEM_INSTRUCTION
  if (petContext) {
    systemInstruction += `\n\nBAĞLAM (Şu An İlgilenilen Evcil Hayvan):\n`
    systemInstruction += `- İsim: ${petContext.name}\n`
    systemInstruction += `- Tür/Irk: ${petContext.species} / ${petContext.breed || 'Bilinmiyor'}\n`
    if (petContext.gender) systemInstruction += `- Cinsiyet: ${petContext.gender}\n`
    if (petContext.birth_date) {
      const ageYears = Math.floor((new Date().getTime() - new Date(petContext.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      systemInstruction += `- Doğum Tarihi: ${petContext.birth_date} (Yaklaşık ${ageYears} yaşında)\n`
    }
    if (petContext.vaccines && petContext.vaccines.length > 0) {
      systemInstruction += `- Son Aşılar: ${petContext.vaccines.join(', ')}\n`
    }
    if (petContext.diseases && petContext.diseases.length > 0) {
      systemInstruction += `- Bilinen Hastalıklar: ${petContext.diseases.join(', ')}\n`
    }
    systemInstruction += `\nÖNEMLİ: Lütfen tavsiyelerini bu bilgilere göre uyarla. Kullanıcıya güven vermek için yanıtının hemen başında ${petContext.name}'in profiline (ırkı, yaşı, aşıları vb.) hakim olduğunu açıkça hissettiren sıcak bir giriş yap.`
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Heuristic fallback — use last user message
    const lastUser = [...history].reverse().find(m => m.role === 'user')?.text ?? ''
    const fb = heuristicFallback(lastUser.toLowerCase())
    return NextResponse.json({ text: fb.text, score: fb.score, severity: fb.severity, powered_by: 'heuristic' })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemInstruction,
    })

    // Build Gemini chat history (all but last user message)
    const chatHistory: ChatMessage[] = history.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    })

    const lastMessage = history[history.length - 1]?.text ?? ''
    const result = await chat.sendMessage(lastMessage)
    const raw = result.response.text()

    const { score, severity, cleanText } = parseScoreLine(raw)

    return NextResponse.json({ text: cleanText, score, severity, powered_by: 'gemini' })
  } catch (err) {
    console.error('[ai-vet] Gemini error:', err)
    const lastUser = [...history].reverse().find(m => m.role === 'user')?.text ?? ''
    const fb = heuristicFallback(lastUser.toLowerCase())
    return NextResponse.json({ text: fb.text, score: fb.score, severity: fb.severity, powered_by: 'heuristic' })
  }
}
