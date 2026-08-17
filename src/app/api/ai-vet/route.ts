import { NextRequest, NextResponse } from 'next/server'
import { Schema, SchemaType } from '@google/generative-ai'
import { generateStructuredContent } from '@/lib/ai/gemini-gateway'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { getIP, aiVetRateLimit } from '@/lib/auth-security'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'
import { getUsageEngine } from '@/lib/features/usage'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { AIVetResponse } from '@/app/owner/ai-vet/ai-vet-types'

const SYSTEM_INSTRUCTION = `Sen Odi AI Vet adlı bir veteriner triaj asistanısın. Türkçe konuşuyorsun.
Odi Pet sistemindeki evcil hayvan kayıtlarını inceleyerek bağlamsal ve empatik bir ön değerlendirme yapıyorsun.

Görevin:
1. Kullanıcının tarif ettiği belirtileri ve pet bağlamını (yaş, ırk vs.) dikkate al.
2. Klinik bir risk skoru ve ciddiyet durumu (low / medium / critical / emergency) belirle.
3. Eksik bilgileri veya kırmızı bayrakları (red flags) tespit et.
4. Veteriner ziyareti gerekiyorsa zamanlamasını öner.
5. Kullanıcıya empatik bir özet ve alınması gereken aksiyonları sun.
6. KLİNİK SINIRLAR: Bu kesinlikle klinik bir teşhis değildir, her zaman "olası durumlar" dili kullan. ASLA reçete yazma, ASLA ilaç dozu önerme, ASLA hastanın mevcut ilacının dozunu değiştirme. Sadece ilaç dozu sorulduğu için klinik severity'i yükseltme (örn. critical yapma) ve risk_score'u null bırak. Gerçek bir klinik acil durum semptomu varsa o zaman severity'i yükselt.
7. ÖNEMLİ ÜRÜN KURALI (PRODUCT INVARIANT): Odi Pet YALNIZCA kedi (cat) ve köpek (dog) türlerini destekler. Kuş, tavşan, vb. desteklenmez. Desteklenmeyen bir türden bahsediliyorsa "assessment_available: false" dön ve reddet.
8. ZAMANLAMA / TRİYAJ (TIME_SENSITIVE): Eğer kullanıcı "sabaha kadar bekleyebilir miyim?" gibi zaman hassasiyeti belirten bir soru sorarsa, beklemenin güvenli olup olmadığını, hangi belirtiler ("red flags") çıkarsa derhal eyleme geçmesi gerektiğini açıkça belirt.
9. VERİ AYRIMI (CONVERSATION vs CANONICAL): Kullanıcının bu sohbette verdiği anlık bilgiler (örn: "Bugün 5 kg tarttım") sadece bu konuşma için geçerlidir, kalıcı bir tıbbi kayıt olarak değerlendirilemez.
10. VERİ EKSİKLİĞİ (NOT_RECORDED): "Kayıt yok" kesinlikle "yok/sağlıklı" anlamına gelmez. "Kayıtlarımızda bu bilgi bulunmuyor" de.
11. AKSİYON (ALLOWLIST): Yalnızca sana verilen allowlist eylemlerinden ('add_weight', 'go_to_vaccines', 'go_to_parasites', 'go_to_nutrition', 'go_to_health', 'find_vet') uygun olanları öner. Önerdiğin aksiyon SADECE SORGUNUN BAĞLAMIYLA SEMANTİK OLARAK İLİŞKİLİYSE döndürülmelidir (Örn: Aşı konusu -> go_to_vaccines). İlgisiz durumlarda otomatik aksiyon ekleme.
12. Verdiğin JSON formatındaki yanıt tamamen yapılandırılmış ve kurallara uygun olmalıdır.`

const aiVetResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    assessment_available: { type: SchemaType.BOOLEAN },
    is_emergency: { type: SchemaType.BOOLEAN },
    emergency_reason: { type: SchemaType.STRING },
    emergency_action: { type: SchemaType.STRING },
    severity: { type: SchemaType.STRING },
    risk_score: { type: SchemaType.INTEGER, nullable: true },
    confidence_score: { type: SchemaType.INTEGER, nullable: true },
    summary: { type: SchemaType.STRING },
    missing_critical_info: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    possible_explanations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    recommended_actions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    red_flags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    when_to_see_vet: { type: SchemaType.STRING },
    follow_up_questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    suggested_app_actions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    reasoning: { type: SchemaType.STRING },
    known_context: { type: SchemaType.STRING },
    missing_information: { type: SchemaType.STRING },
  },
  required: [
    'assessment_available', 'is_emergency', 'severity'
  ],
}

interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

/**
 * Model zinciri: birincil model kapasite hatasi (503) verirse yedege dusulur.
 * gemini-2.0-flash bu repoda ai-score ve journal/ai-summary uclarinda halihazirda
 * kullanildigi icin bilinen-calisir bir yedek; structured output'u destekler.
 */
const AI_VET_MODEL_CHAIN = ['gemini-3.6-flash', 'gemini-2.0-flash']

function safeFallbackResponse(): AIVetResponse {
  return {
    assessment_available: false,
    is_emergency: false,
    severity: 'unknown',
    risk_score: null,
    confidence_score: 0,
    summary: 'Odi şu anda güvenilir bir değerlendirme oluşturamadı. Sistemlerimizde geçici bir yoğunluk veya hata olabilir. Belirtiler ciddi veya hızla kötüleşiyorsa, lütfen vakit kaybetmeden doğrudan veteriner hekiminizle iletişime geçin.',
  }
}

// Emergency Guard: Runs before LLM call
function checkEmergencyGuard(text: string): AIVetResponse | null {
  const lowerText = text.toLowerCase()
  const emergencyKeywords = [
    'nefes alamıyor', 'nefes darlığı', 'bilinci kapalı', 
    'bayıldı', 'nöbet geçiriyor', 'kriz geçiriyor', 'durmayan kanama',
    'kan kusuyor', 'gözü dışarı çıktı', 'nabzı yok',
    'zehir', 'toksik', 'araba çarptı', 'yüksekten düştü',
    'idrar yapamıyor'
  ]
  
  for (const kw of emergencyKeywords) {
    if (lowerText.includes(kw)) {
      return {
        assessment_available: false,
        is_emergency: true,
        emergency_reason: `Yüksek riskli durum tespit edildi: ${kw}`,
        emergency_action: 'LÜTFEN DERHAL EN YAKIN VETERİNER KLİNİĞİNE GİDİN. Durum hayati tehlike taşıyor olabilir.',
        severity: 'emergency',
        risk_score: null,
        confidence_score: 100,
        summary: 'Sistemimiz acil müdahale gerektirebilecek bir durum tespit etti. Bu tür durumlarda saniyeler önemlidir.',
      }
    }
  }
  return null
}

function getExactAgeStr(birthDateStr: string): string {
  const bd = new Date(birthDateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - bd.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} haftalık`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} aylık`
  } else {
    return `${Math.floor(diffDays / 365)} yaşında`
  }
}

async function handler(req: NextRequest) {
  // Auth guard
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getIP(req)
  const { success } = await aiVetRateLimit.limit(`${user.id}:${ip}`)
  if (!success) return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })

  const body = await req.json()
  const history: { role: 'user' | 'model'; text: string }[] = body.history ?? []
  const petId = body.petId

  if (history.length > 50) {
    return NextResponse.json({ error: 'Konuşma geçmişi çok uzun.' }, { status: 400 })
  }
  const lastMessage = history[history.length - 1]?.text ?? ''
  if (lastMessage.length > 2000) {
    return NextResponse.json({ error: 'Mesaj çok uzun.' }, { status: 400 })
  }

  // 1. Server-Side Pet Authorization & Canonical Fetch
  let systemInstruction = SYSTEM_INSTRUCTION
  let backendContextUsed: string[] = []
  
  if (petId) {
    const supabase = await createServerSupabaseClient()
    
    // Auth Check manually for defense in depth
    const { data: petCheck } = await supabase
      .from('pets')
      .select('id')
      .eq('id', petId)
      .eq('owner_id', user.id)
      .single()
      
    if (!petCheck) {
      return NextResponse.json({ error: 'Pet bulunamadı veya yetkiniz yok.' }, { status: 403 })
    }

    try {
      const { buildPetAIContext } = await import('@/lib/ai/context-engine')
      const petContext = await buildPetAIContext(supabase, petId, lastMessage)
      
      // Calculate contextUsed purely on the backend
      if (petContext.core.weight.status !== 'not_recorded') backendContextUsed.push('weight')
      if (petContext.core.medicalStatus.conditionsStatus !== 'not_recorded') backendContextUsed.push('conditions')
      if (petContext.core.medicalStatus.medicationsStatus !== 'not_recorded') backendContextUsed.push('medications')
      if (petContext.core.medicalStatus.allergiesStatus !== 'not_recorded') backendContextUsed.push('allergies')
      if (petContext.intentSpecific?.vaccines) backendContextUsed.push('vaccines')
      if (petContext.intentSpecific?.parasites) backendContextUsed.push('parasites')
      if (petContext.intentSpecific?.nutrition) backendContextUsed.push('nutrition')
      if (petContext.intentSpecific?.reproductive) backendContextUsed.push('reproductive')

      systemInstruction += `\n\nBAĞLAM (PetAIContext JSON):\n`
      systemInstruction += JSON.stringify(petContext, null, 2)
      
      systemInstruction += `\n\nÖNEMLİ KURAL (HALLUCINATION PREVENTION):
Sana verilen JSON formatındaki \`PetAIContext\` objesi, bu pet hakkındaki TEK VE KESİN gerçektir. 
- Eğer bir alanın status'u 'not_recorded' ise, o veri sistemde KAYITLI DEĞİL demektir. Asla "yoktur" veya "sağlıklıdır" gibi negatif bir sonuca varma. "Kayıtlarımızda bu bilgi bulunmuyor" de.
- Context'te bulunmayan hiçbir aşı adını, ilaç markasını veya tıbbi geçmişi pete atfetme.
- Eğer kullanıcı DOĞRUDAN bir parametreyi soruyorsa (örneğin kilonun kendisi veya mama türü) ve bu veri 'not_recorded' / 'stale' ise, değerlendirme yapmayı reddet (assessment_available: false) ve missing_information alanında veriyi talep et.
- ANCAK tıbbi bir semptom veya genel sağlık durumu sorulduğunda (örn. kusma, ishal, halsizlik), kilo veya beslenme verisinin eksik olması bir değerlendirme engeli (blocker) DEĞİLDİR. Assessment yapmaya devam et, sadece ikincil bir soru olarak kilo/beslenme bilgisini isteyebilirsin.`

    } catch (ctxErr: any) {
      if (ctxErr.message === 'INVALID_SPECIES') {
        const fb = {
          assessment_available: false,
          is_emergency: false,
          severity: 'unknown',
          risk_score: null,
          confidence_score: 100,
          summary: 'Odi Pet yalnızca kedi ve köpekler için hizmet vermektedir.',
        }
        try {
          const adminClient = createAdminSupabaseClient()
          adminClient.from('ai_vet_logs').insert({
            pet_id: petId,
            owner_id: user.id,
            user_prompt: lastMessage,
            ai_response: fb,
            severity: 'unknown',
            powered_by: 'invariant-guard'
          }).then(({ error }) => { if (error) console.error(error) })
        } catch (e) {}
        
        return NextResponse.json({
          response: fb,
          powered_by: 'invariant-guard'
        })
      }
      console.error('[ai-vet] Context Engine Error:', ctxErr)
      return NextResponse.json({ error: 'Bağlam oluşturulurken hata oluştu.' }, { status: 500 })
    }
  }

  // 2. Emergency Guard (Pre-LLM)
  const emergencyCheck = checkEmergencyGuard(lastMessage)
  if (emergencyCheck) {
    try {
      const adminClient = createAdminSupabaseClient()
      adminClient.from('ai_vet_logs').insert({
        pet_id: petId,
        owner_id: user.id,
        user_prompt: lastMessage,
        ai_response: emergencyCheck,
        severity: emergencyCheck.severity || 'emergency',
        powered_by: 'emergency-guard'
      }).then(({ error }) => { if (error) console.error(error) })
    } catch (e) {}

    return NextResponse.json({ 
      response: emergencyCheck,
      powered_by: 'emergency-guard' 
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const fb = safeFallbackResponse()
    try {
      const adminClient = createAdminSupabaseClient()
      adminClient.from('ai_vet_logs').insert({
        pet_id: petId,
        owner_id: user.id,
        user_prompt: lastMessage,
        ai_response: fb,
        severity: 'unknown',
        powered_by: 'heuristic'
      }).then(({ error }) => { if (error) console.error(error) })
    } catch (e) {}
    
    return NextResponse.json({ 
      response: fb, 
      powered_by: 'heuristic' 
    })
  }

  // 3. Quota consumption
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

  // 4. Gemini Structured Output Call
  try {
    const chatHistory: ChatMessage[] = history.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    // Saglayici cagrisi merkezi gateway uzerinden: gecici 429/5xx hatalarinda
    // ustel geri cekilme ile tekrar dener, ardindan yedek modele duser.
    const generation = await generateStructuredContent({
      apiKey,
      models: AI_VET_MODEL_CHAIN,
      systemInstruction,
      responseSchema: aiVetResponseSchema,
      maxOutputTokens: 2048,
      history: chatHistory,
      message: lastMessage,
    })
    const raw = generation.text
    const modelUsed = generation.modelUsed

    let structuredResponse: AIVetResponse
    try {
      structuredResponse = JSON.parse(raw)
    } catch (parseError) {
      console.error('[ai-vet] JSON Parse error:', parseError)
      return NextResponse.json({ 
        response: safeFallbackResponse(), 
        powered_by: 'fallback-parse-error' 
      })
    }

    // Clean up potentially missing optional fields from structured response
    // Fallback severity to unknown if it's missing somehow
    if (!structuredResponse.severity || !['low', 'medium', 'critical'].includes(structuredResponse.severity)) {
      structuredResponse.severity = 'unknown'
      structuredResponse.assessment_available = false
    }

    // --- AUDIT LOGGING ---
    try {
      const adminClient = createAdminSupabaseClient()
      // Asynchronously log the transaction
      adminClient.from('ai_vet_logs').insert({
        pet_id: petId,
        owner_id: user.id,
        user_prompt: lastMessage,
        ai_response: structuredResponse,
        severity: structuredResponse.severity,
        powered_by: modelUsed
      }).then(({ error }) => {
        if (error) console.error('[ai-vet] Failed to write ai_vet_logs:', error)
      })
    } catch (logErr) {
      console.error('[ai-vet] Error setting up ai_vet_logs insert:', logErr)
    }

    return NextResponse.json({
      response: structuredResponse,
      powered_by: modelUsed,
      contextUsed: backendContextUsed
    })
  } catch (err) {
    console.error('[ai-vet] Gemini error:', err)
    
    // --- AUDIT LOGGING (ERROR FALLBACK) ---
    try {
      const fb = safeFallbackResponse()
      const adminClient = createAdminSupabaseClient()
      adminClient.from('ai_vet_logs').insert({
        pet_id: petId, // from scope above
        owner_id: user.id, // from scope above
        user_prompt: lastMessage, // from scope above
        ai_response: fb,
        severity: 'unknown',
        powered_by: 'fallback-api-error'
      }).then(({ error }) => {
        if (error) console.error('[ai-vet] Failed to write ai_vet_logs (fallback):', error)
      })
    } catch (e) {}

    return NextResponse.json({ 
      response: safeFallbackResponse(), 
      powered_by: 'fallback-api-error' 
    })
  }
}

export const POST = withAPIFeatureGuard('ai_vet', handler)
