'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function analyzeVaccineLabel(base64Image: string, mimeType: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY bulunamadı. Lütfen sistem yöneticisine başvurun veya ortam değişkenlerini kontrol edin.')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
      Sen veteriner hekim asistanısın. Gönderilen görsel bir evcil hayvan sağlık karnesindeki aşı/parazit etiketleri sayfasıdır.
      Görselde BİRDEN FAZLA etiket veya işlem olabilir.
      Lütfen bu görseldeki tüm etiketleri dikkatlice oku ve aşağıdaki JSON ARRAY (liste) formatında, SADECE geçerli bir JSON objesi olarak yanıt dön. Başka hiçbir açıklama, selamlama veya markdown kodu (örn: \`\`\`json) EKLENMEMELİDİR.
      
      ÇOK ÖNEMLİ KURAL: Eğer aynı satırda (yan yana) birden fazla aşı etiketi yapıştırılmışsa (Örn: Sarı ve Mavi renkli Karma kombi aşıları gibi), satırın sağına atılmış olan TEK BİR tarih ve veteriner kaşesini, o satırdaki HER BİR aşı etiketi için AYRI AYRI JSON objelerine kopyalamalısın.

      [
        {
          "vaccineName": "Okunan aşının veya parazitin cinsi/hastalıklar (Örn: Karma, Kuduz, Lyme, Feline Leukemia, İç Parazit, DHPPi2, L, vb.)",
          "brand": "Aşının markası (Örn: Nobivac, Zoetis, Vanguard, Biocan, Eurican, vb.)",
          "batchNo": "Lot veya Seri Numarası (Örn: A482B01)",
          "clinicName": "Eğer görselde kaşe veya imza üzerinde klinik ismi geçiyorsa buraya yaz",
          "date": "Eğer etiket etrafında el yazısı veya kaşe ile bir uygulama/geçerlilik tarihi atılmışsa YYYY-MM-DD formatında yaz"
        }
      ]
      
      Sadece okuyabildiğin kadarını dön, okuyamadığın alanları boş string ("") bırak.
      Hiç etiket yoksa boş array [] dön.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      }
    ])

    let text = result.response.text()
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim()
    
    let parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) {
      parsed = [parsed] // Object dönerse array'e çevir
    }
    
    return { success: true, data: parsed }

  } catch (error: any) {
    console.error('AI Vision Error:', error)
    return { success: false, error: error.message }
  }
}
