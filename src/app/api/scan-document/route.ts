import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getIP, scanDocRateLimit } from '@/lib/auth-security'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'
import { getUsageEngine } from '@/lib/features/usage'

const SYSTEM_PROMPT = `
Sen bir evcil hayvan bakım uygulaması için akıllı belge tarama asistanısın.
Gönderilen fotoğrafı analiz et ve aşağıdaki JSON formatında, eksiksiz ve yapılandırılmış olarak yanıt ver.
Markdown kullanma, sadece saf JSON döndür.

Zorunlu JSON Şeması:
{
  "document_type": "pet_passport" | "official_document" | "food_packaging" | "vaccine_card" | "medicine_packaging" | "parasite_product" | "unknown",
  "confidence": 0.0, // 0.0 - 1.0 arası
  "extracted_fields": {
    // Eğer document_type = "pet_passport" veya "official_document" ise (veya resmi evrak/karne/tarım müdürlüğü belgesi ise):
    "microchip_no": "15 haneli mikroçip numarası (örn: 900123456789012)",
    "passport_no": "Pasaport / karne numarası (örn: TR-34-123456)",
    "registration_city": "Kayıtlı olunan il (örn: İstanbul)",
    "registration_district": "Kayıtlı olunan ilçe (örn: Kadıköy)",
    "agriculture_directorate": "Kayıtlı olduğu İlçe Tarım ve Orman Müdürlüğü adı (örn: Kadıköy İlçe Tarım ve Orman Müdürlüğü)",
    "vet_name": "Veteriner Hekim Adı",
    "vet_company": "Klinik / Kurum Adı",
    "vet_phone": "Veteriner Telefonu",
    "vet_email": "Veteriner E-posta",
    // Eğer document_type = "food_packaging" ise:
    "food_brand": "Marka adı (örn: Purina)",
    "food_product": "Ürün adı (örn: Pro Plan Adult)",
    "food_type": "dry" | "wet" | "raw" | "mixed",
    "package_size_grams": 7000, // Sayısal değer (gram cinsinden)
    "target_species": "dog" | "cat" | "bird" | "other", // Hangi hayvan için
    "target_age_group": "kitten" | "adult" | "senior" | "all", // Hangi yaş grubu için
    // Eğer document_type = "vaccine_card" ise:
    "title": "Aşı Adı",
    "brand": "Marka (örn: Nobivac)",
    "lot_number": "Lot Numarası",
    "product_expiry_at": "YYYY-MM-DD", // Ürün/ambalaj son kullanma tarihi
    "administration_route": "parenteral_sc" | "parenteral_im" | "intranasal" | "oral",
    "date": "YYYY-MM-DD", // Uygulama tarihi
    "next_date": "YYYY-MM-DD", // Sonraki tarih
    "vet_name": "Veteriner Hekim Adı",
    "vet_company": "Klinik Adı",
    // Eğer document_type = "medicine_packaging" ise:
    "title": "İlaç Adı",
    "dose": "Doz (örn: 250mg)",
    "duration": "Kullanım süresi (örn: 7 gün)",
    // Eğer document_type = "parasite_product" ise:
    "title": "Ürün Adı",
    "brand": "Marka",
    "product_name": "Ürün Adı",
    "parasite_type": "İç Parazit" | "Dış Parazit" | "Birleşik Parazit" | "Parazit Tasması",
    "lot_number": "Lot/Seri Numarası",
    "product_expiry_at": "YYYY-MM-DD",
    "application_method": "oral" | "spot_on" | "injection" | "collar" | "spray" | "other",
    "dose": "Uygulanan doz",
    "active_ingredient": "Etken madde",
    "duration_days": 30,
    "duration_months": 1,
    "next_date": "YYYY-MM-DD" // Koruma süresine göre sonraki tarih
  }
}
Lütfen verileri olabildiğince eksiksiz doldur. Tespit edemediğin alanları null yap.
`;


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

async function handler(req: Request) {
  let uploadedPath: string | null = null
  let adminSupabase: ReturnType<typeof createAdminSupabaseClient> | null = null

  try {
    // Auth kontrolü
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getIP(req)
    const { success } = await scanDocRateLimit.limit(`${user.id}:${ip}`)
    if (!success) return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })

    const formData = await req.formData()
    const image = formData.get('image') as File
    const petId = formData.get('pet_id') as string | null

    if (!image) {
      return NextResponse.json({ error: 'Eksik parametreler (image)' }, { status: 400 })
    }
    if (!petId || !UUID_RE.test(petId)) {
      return NextResponse.json({ error: 'Geçersiz pet_id' }, { status: 400 })
    }

    const ext = ALLOWED_MIME_TO_EXT[image.type]
    if (!ext) {
      return NextResponse.json({ error: 'Desteklenmeyen dosya türü. İzin verilenler: JPEG, PNG, WEBP, PDF.' }, { status: 400 })
    }

    if (image.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 10MB sınırını aşıyor.' }, { status: 400 })
    }

    // Pet sahipliği doğrulaması
    const supabase = await createServerSupabaseClient()
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── OCR öncesi: belgeyi private storage'a yükle ─────────────
    adminSupabase = createAdminSupabaseClient()
    const path = `${user.id}/${petId}/${randomUUID()}.${ext}`

    const { error: uploadError } = await adminSupabase.storage
      .from('vaccine-documents')
      .upload(path, image, { contentType: image.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Belge yüklenirken bir hata oluştu.' }, { status: 500 })
    }
    uploadedPath = path

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Using mock response.");
      await new Promise(r => setTimeout(r, 300));
      return NextResponse.json({
        success: true,
        data: {
          record_type: 'vaccine_card',
          parsed: {
            title: 'Karma Aşı',
            brand: 'Nobivac',
            date: new Date().toISOString().split('T')[0],
            next_date: null
          },
          document_storage_path: uploadedPath
        }
      });
    }

    // Image to Base64
    const buffer = await image.arrayBuffer()
    const base64Image = Buffer.from(buffer).toString('base64')

    // Quota consumption — check BEFORE expensive Gemini call
    const requestId = crypto.randomUUID()
    const usageResult = await getUsageEngine().consumeUsage({
      userId: user.id,
      featureKey: 'scan_document',
      amount: 1,
      idempotencyKey: requestId,
    })
    
    if (!usageResult.success && !usageResult.idempotentAlreadyProcessed) {
      if (adminSupabase && uploadedPath) {
        await cleanupUpload(adminSupabase, uploadedPath)
      }
      return NextResponse.json(
        { error: 'Kullanım kotanız doldu. Lütfen planınızı yükseltin.' },
        { status: 403 }
      )
    }

    // Gemini API Request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: image.type,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      console.error('Gemini API Error:', errorText)
      throw new Error('Görüntü işlenirken bir hata oluştu.')
    }

    const geminiData = await geminiRes.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      await cleanupUpload(adminSupabase, uploadedPath)
      return NextResponse.json({ error: 'Metin anlaşılamadı.' }, { status: 422 })
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON parse error:", responseText);
      await cleanupUpload(adminSupabase, uploadedPath)
      return NextResponse.json({ error: 'AI geçersiz bir yanıt döndürdü.' }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      data: {
        record_type: parsedResult.document_type,
        parsed: parsedResult.extracted_fields,
        document_storage_path: uploadedPath
      }
    })

  } catch (error: unknown) {
    console.error('OCR Error:', error)
    if (adminSupabase && uploadedPath) {
      await cleanupUpload(adminSupabase, uploadedPath)
    }
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}

async function cleanupUpload(admin: ReturnType<typeof createAdminSupabaseClient>, path: string) {
  try {
    await admin.storage.from('vaccine-documents').remove([path])
  } catch (err) {
    console.error('Belge temizleme (best-effort) başarısız:', err)
  }
}

export const POST = withAPIFeatureGuard('scan_document', handler)
