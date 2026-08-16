# Odi Pet — Forensic Evidence Log & Verification Matrix

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\17_EVIDENCE.md`  
> **Kapsam:** Adli Kod, Veritabanı ve Doküman İnceleme Kanıt Kataloğu  

---

## 1. İnceleme Metodolojisi ve Güven Seviyeleri

Bu bilgi paketindeki tüm iddialar, veritabanı migrasyonları, API rotaları ve kural dosyaları üzerinden incelenerek derecelendirilmiştir:

- **CONFIRMED (Kesin Doğrulanmış):** Doğrudan veritabanı şeması (`supabase/migrations`), kod veya anayasa dosyasında (`AGENTS.md`) fiziksel varlığı doğrulananlar.
- **HIGH CONFIDENCE (Yüksek Güven):** Birden fazla kod veya servis dosyasındaki mantıksal yapıdan doğrulananlar.
- **INFERRED (Çıkarımlı):** Ürün hedeflerinden ve iş mimarisinden mantıksal olarak çıkarılanlar.

---

## 2. Kanıt Doğrulama Matrisi

| Madde / Özellik | Kaynak Dosya / Konum | Kanıt Türü | Güven Seviyesi | Etki ve Değerlendirme |
| :--- | :--- | :--- | :--- | :--- |
| **Kedi/Köpek Tür Kısıtı** | `supabase/migrations/` & `pets` tablosu | `CHECK (species IN ('cat', 'dog'))` | **CONFIRMED** | Veritabanı seviyesinde fiziksel kısıtlama mevcut. |
| **Resmi Yaş Skalası** | `AGENTS.md` & `src/lib/species.ts` | Anayasa Metni | **CONFIRMED** | 0-1 Yavru, 1-7 Yetişkin, 7-12 Yaşlı, 12+ Yaşlı+ dondurulmuş kural. |
| **Soft-Delete Arşivleme** | `supabase/migrations/` & `vaccine_records_v2` | `is_archived = true` kolonları | **CONFIRMED** | Hiçbir medikal veri veritabanından silinmiyor. |
| **OPOS Tasarım Sistemi** | `AGENTS.md` & `tailwind.config.js` | `Plus Jakarta Sans`, `24px` radius | **CONFIRMED** | Tüm bileşenlerde zorunlu kılınmış görsel anayasa. |
| **Private Storage & Signed URL** | `supabase/migrations/` & `src/lib/supabase/` | Bucket politikaları & `createSignedUrl` | **CONFIRMED** | Medikal evraklar public erişime kapalı. |
| **HITL AI Governance** | `src/app/api/scan-document/` & `AGENTS.md` | API confirm route & Sparkles | **CONFIRMED** | AI habersiz veri yazamıyor, kullanıcı onayı şart. |
| **Atomik RPC ve Plan Tamamlama** | `supabase/migrations/` (`complete_recurring_plan_rpc`) | PostgreSQL Stored Procedure | **CONFIRMED** | Tekrarlayan planlar yarış durumuna geçmeden RPC ile yazılıyor. |
| **Notification Idempotency** | `supabase/migrations/` (`notification_jobs`) | `idempotency_key` UNIQUE indeksi | **CONFIRMED** | Çift bildirim iletimi veritabanı seviyesinde engelleniyor. |
| **Proje Sahipliği (Tufan)** | `GEMINI.md` & `AGENTS.md` | Proje Sahibi İbaresi | **CONFIRMED** | Proje kararları yalnızca Tufan onaylıdır. |
