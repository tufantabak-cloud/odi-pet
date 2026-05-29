import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SYSTEM_INSTRUCTION = `Sen Odi.Pet uygulamasının veri özetleme asistanısın. Kullanıcıya evcil hayvanının son günlerdeki günlük kayıtlarının kısa bir trend özetini sunuyorsun. Türkçe konuşuyorsun.

KURALLAR: 
1. KESİNLİKLE tanı koyma. Hastalık adı verme. ("Şu hastalık olabilir", "Böbrek yetmezliği belirtisi" vb. KESİNLİKLE YASAK).
2. Sadece girilen verilerdeki artış/düşüş/değişim trendlerini belirt (örn. "iştah seviyesinde düşüş gözlemleniyor", "ruh hali agresif olarak kaydedilmiş" vb.).
3. Kullanıcıya uzun uzun açıklamalar yapma, kısa bir özet ver.
4. Çıktının EN SONUNA kelimesi kelimesine şu metni ekle: 
"Girdiğiniz kayıtlar, petinizin [trend özetine uygun 1-2 kelime] gösterdiğini düşündürüyor. Bu birçok farklı nedenden kaynaklanabilir. Kesin bilgi ve doğru tanı için en kısa sürede veteriner hekiminize danışmanızı öneririz."
Not: Yukarıdaki paragraftaki [trend özetine uygun 1-2 kelime] kısmını cümlenin anlamlı olması için doldur, örneğin "iştah kaybı", "stres belirtileri", "değişken bir ruh hali" gibi.`

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const petId = body.petId

  if (!petId) return NextResponse.json({ error: 'Pet ID required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  
  // Sadece son 14 günün verilerini al
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: entries } = await supabase
    .from('pet_journal_entries')
    .select('entry_type, data, note, created_at')
    .eq('pet_id', petId)
    .gte('created_at', twoWeeksAgo)
    .order('created_at', { ascending: false })

  if (!entries || entries.length === 0) {
    return NextResponse.json({ summary: "Son 14 güne ait analiz edilebilecek yeterli kayıt bulunmuyor." })
  }

  // Verileri JSON string formatına getirip prompt'a ekle
  const contextData = entries.map(e => {
    return `Tarih: ${new Date(e.created_at).toLocaleDateString('tr-TR')} - Kategori: ${e.entry_type} - Veri: ${JSON.stringify(e.data)} - Not: ${e.note || '-'}`
  }).join('\n')

  const userMessage = `Aşağıda petime ait son kayıtlar bulunuyor. Lütfen bu verilerin trend özetini çıkar:\n\n${contextData}`

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ summary: "AI servisi şu an kullanılamıyor, ancak kayıtlarınız güvende." })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
    })

    const summary = result.response.text()

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[ai-journal-summary] Gemini error:', err)
    return NextResponse.json({ summary: "Özet çıkarılırken bir hata oluştu, lütfen daha sonra tekrar deneyin." }, { status: 500 })
  }
}
