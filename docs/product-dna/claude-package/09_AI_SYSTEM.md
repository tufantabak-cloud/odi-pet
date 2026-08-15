# Odi Pet — AI System, OCR & Governance

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\09_AI_SYSTEM.md`  
> **Kapsam:** Smart Scanner, Gemini OCR, Human-in-the-Loop (HITL) ve Yapay Zeka Yönetişim Anayasası  

---

## 1. Yapay Zeka Görsel Standardı & Aidiyet Göstergesi

Odi Pet arayüzünde yapay zeka (AI) tarafından üretilen, desteklenen veya türetilen tüm bileşenlerde aidiyeti kesinleştiren **Mor Yıldız / Sparkles İkonu (`Sparkles`)** ve mor görsel tema kullanılır.

```tsx
// OPOS Standard AI Indicator
<div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-200">
  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
  <span className="text-xs font-semibold">Odi AI Akıllı Analiz</span>
</div>
```

---

## 2. Smart Scanner & Gemini OCR Pipeline Mimarisi

```
[Kullanıcı Aşı Karnesi Fotoğrafı Yükler]
                 ↓
[Image Optimization & Base64 Encoding]
                 ↓
[Gemini Vision API (`/api/scan-document`)]
                 ↓
[Metin Ayrıştırma & JSON Yapılandırma]
                 ↓ (Güven Skoru Değerlendirmesi)
[AI Taslak İnceleme Modalı (Human-in-the-Loop UI)]
                 ↓ (Kullanıcı "Onayla ve Kaydet" Butonuna Basar)
[Kanonik Veritabanı Mutasyonu (`vaccine_records_v2`)]
```

### 2.1 Gemini OCR İstem (Prompt) Şablonu
```text
Role: Specialized Veterinary Passport & Medical Document Parser.
Input: Image of Pet Vaccine/Medical Card.
Target Output (Strict JSON):
{
  "vaccine_name": "Karma / Rabies / Internal Parasite",
  "brand_name": "Nobivac / Biocan / Vanguard",
  "dose_number": 1 or 2,
  "administered_at": "YYYY-MM-DD",
  "confidence_score": 0.95,
  "detected_text_snippets": ["Karma 22.04.2026 Nobivac"]
}
```

---

## 3. Human-in-the-Loop (HITL) İnceleme Anayasası

> 🔒 **HABERSİZ VERİ KAYDI KESİNLİKLE YASAKTIR:** Yapay zeka hiçbir koşulda kullanıcıdan habersiz veya otonom olarak veritabanına doğrudan kayıt ekleyemez, güncelleyemez veya silemez!

### 3.1 HITL Onay Akışı Kuralları
1. OCR sonucu veritabanına **YAZILMAZ**.
2. Çıkarılan veriler kullanıcıya bir **"AI Taslak İnceleme Modalı"** ile sunulur.
3. Kullanıcı formdaki verileri gözden geçirir, gerekirse düzeltir.
4. Yalnızca kullanıcı açıkça **"Onayla ve Kaydet"** butonuna bastığında API mutasyon servisi çağrılır.

---

## 4. Güven Skoru (Confidence Score) & Açıklanabilirlik

- OCR çıktısında güven skoru `%70` değerinin altındaysa ilgili input alanı turuncu çerçeve ile işaretlenir.
- Kullanıcıya *"Metin net okunamadı, lütfen tarihi doğrulayınız"* uyarısı verilir.

---

## 5. ZORUNLU Tıbbi Sorumluluk Reddi (Medical Disclaimer)

Yapay zeka tarafından üretilen tüm tavsiye, öneri veya OCR çıktılarının altında istisnasız aşağıdaki sorumluluk reddi metni yer alır:

> ⚠️ **Tıbbi Sorumluluk Reddi:**  
> *"Odi AI tarafından sunulan analiz ve öneriler bilgilendirme amaçlıdır; kesin klinik teşhis veya tedavi yerine geçmez. Evcil hayvanınızın sağlık durumunda acilen lisanslı bir veteriner hekime danışınız."*
