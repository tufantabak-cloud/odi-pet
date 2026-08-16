# Odi Pet — Empirically Verified Product Strengths

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\12_PRODUCT_STRENGTHS.md`  
> **Kapsam:** Sıfır-Legacy Tasarımda Kesinlikle Korunacak Güçlü Yanlar  

---

## 1. Veri Koruma ve Tıbbi Geçmiş Güvenliği (Archival Policy)

- **Güçlü Yan:** Odi Pet, tıbbi verileri (aşı kayıtları, reçeteler, geçmiş operasyonlar, kilo ölçümleri) asla veritabanından kalıcı olarak silmez (`is_archived = true`).
- **Neden Korunmalı?:** Bir evcil hayvan veteriner değiştirdiğinde veya yaşlandığında 3 yıl önceki bir aşı alerjisine veya tıbbi müdahaleye erişim hayati önem taşır.

---

## 2. Şeffaf ve Güvenilir Yapay Zeka (Human-in-the-Loop AI)

- **Güçlü Yan:** AI engines (Gemini OCR) kullanıcıdan habersiz veritabanına doğrudan kayıt ekleyemez. Tüm çıktılar Mor Yıldız (`Sparkles`) göstergesi ve Taslak İnceleme Modalı ile sunulur.
- **Neden Korunmalı?:** Tıbbi veride yapay zekanın yanlış bir doz veya tarihi otomatik kaydetmesi durumunda evcil hayvanın sağlığı riske girebilir. Kullanıcı onayı klinik kesinliği garanti eder.

---

## 3. OPOS Görsel ve Hissiyat Bütünlüğü (Design System)

- **Güçlü Yan:** Plus Jakarta Sans tipografi ölçeği, 24px yumuşak radius kart anayasası, 8pt ızgara ritmi ve dokunsal basılma hissi (`active:scale-[0.98]`).
- **Neden Korunmalı?:** Uygulamaya sıkıcı medikal yazılım hissi yerine modern, lüks ve kullanıcıyı bağlayan premium bir his kazandırır.

---

## 4. Multi-Tenant RLS ve Private Storage Güvenliği

- **Güçlü Yan:** Supabase RLS politikaları ile kullanıcı verileri birbirinden strictly izole edilmiştir. Aşı belgeleri `private` bucket'larda tutulur ve yalnızca süreli `createSignedUrl` ile erişilebilir.
- **Neden Korunmalı?:** Kullanıcı gizliliğini ve evcil hayvan sağlık evraklarının dışarı sızmasını tam korumaya alır.

---

## 5. Atomik RPC ve İdemopotent Zamanlama Motoru

- **Güçlü Yan:** `complete_recurring_plan_rpc` ve `notification_jobs` üzerindeki benzersiz `idempotency_key` yapısı.
- **Neden Korunmalı?:** Çift bildirim gönderimini ve aynı aşının arka arkaya iki kez yanlışlıkla eklenmesini engeller.
