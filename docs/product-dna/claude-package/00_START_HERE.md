# Odi Pet 2.0 — Claude Knowledge Package: Start Here

> **Sürüm:** 2.0.0-AI  
> **Tarih:** 12 Ağustos 2026  
> **Hedef:** Claude ve AI Ürün Mimarları için Odi Pet Ekosistemi Tam Bilgi ve Tasarım Paketi  
> **Erişim Modu:** Bağımsız (Standalone), AI-Optimized Knowledge Base  

---

## 1. Yönetici Özeti (Executive Summary)

**Odi Pet**, evcil hayvan (kedi ve köpek) sahiplerinin dostlarına ait tüm **koruyucu sağlık, aşı, parazit, tıbbi geçmiş, beslenme, rutin bakım, kızgınlık/üreme ve acil durum (SOS)** süreçlerini tek bir dijital merkezden, klinik hassasiyet ve premium bir kullanıcı deneyimi ile yönetmelerini sağlayan **Cross-Platform (Next.js 14 SSR, PWA, Supabase)** evcil hayvan bakım ekosistemidir.

Bu bilgi paketi (`claude-package`), Odi Pet platformunun tüm ürün DNA'sını, veri modelini, mimari sınırlarını, iş kurallarını, tasarım sistemini (OPOS v1.0), zayıf/güçlü yönlerini ve sıfır-legacy (zero-legacy) geleceğe dönük yeniden tasarım vizyonunu yapay zeka modelleri (Claude 3.5 Sonnet / Opus / Gemini) için **tek bir standart bilgi deposunda** toplamak amacıyla hazırlanmıştır.

---

## 2. Bilgi Paketi Site Haritası (Package Sitemap)

Bu paket, birbirini tamamlayan **20 bağımsız ve yüksek yoğunluklu dokümandan** oluşur:

| Dosya Adı | Başlık ve İçerik Özeti | Anahtar Alanlar |
| :--- | :--- | :--- |
| [`00_START_HERE.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/00_START_HERE.md) | **Başlangıç Rehberi & Site Haritası** | Yönetici özeti, okuma hatları, paket sitemap |
| [`01_PRODUCT_DNA.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/01_PRODUCT_DNA.md) | **Ürün DNA'sı & Temel Özgünlük** | Amaç, hedef kitle, yaş skalaları, değer önerisi |
| [`02_DOMAINS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/02_DOMAINS.md) | **Domain Mimarisi & Sorumluluklar** | 12 ana domain sınırları, entity ilişkileri |
| [`03_FEATURES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/03_FEATURES.md) | **Konsolide Özellik Spesifikasyonları** | Modül bazlı detaylı akışlar, önkoşullar, UI durumları |
| [`04_USER_JOURNEYS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/04_USER_JOURNEYS.md) | **Kullanıcı Yolculukları (User Journeys)** | Onboarding, Aşı Ekleme, Mama Stok, SOS akışları |
| [`05_BUSINESS_RULES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/05_BUSINESS_RULES.md) | **İş Kuralları Motoru (Business Rules)** | Kural ID'leri, yaş/tür kısıtları, protokoler hesaplar |
| [`06_DATA_MODEL.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/06_DATA_MODEL.md) | **Kapsamlı Veri Modeli & Şema** | Supabase tabloları, RLS politikaları, RPC'ler |
| [`07_EVENT_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/07_EVENT_SYSTEM.md) | **Olay Sistemi & Yan Etkiler** | Event triggers, otomatik plan türetimi, cascade |
| [`08_NOTIFICATION_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/08_NOTIFICATION_SYSTEM.md) | **Bildirim & Zamanlama Motoru** | Web Push, VAPID, cron dispatch, idemopotensi |
| [`09_AI_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/09_AI_SYSTEM.md) | **AI, OCR & Human-in-the-Loop** | Gemini OCR, Sparkles göstergesi, taslak onay UI |
| [`10_DESIGN_SYSTEM_REFERENCE.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/10_DESIGN_SYSTEM_REFERENCE.md) | **Tasarım Sistemi (OPOS Design Bible)** | Plus Jakarta Sans, 24px Radius, 8pt Spacing, Iconography |
| [`11_CURRENT_PROBLEMS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/11_CURRENT_PROBLEMS.md) | **Mevcut Hata & Sürtünme Kataloğu** | UX karmaşası, teknik borçlar, bilinen bug'lar |
| [`12_PRODUCT_STRENGTHS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/12_PRODUCT_STRENGTHS.md) | **Korunacak Ürün Güçleri** | Veri koruma, klinik hassasiyet, şeffaf AI |
| [`13_PRODUCT_WEAKNESSES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/13_PRODUCT_WEAKNESSES.md) | **Yeniden Tasarlanacak Zayıflıklar** | Aşırı formlar, zayıf bildirim kişiselleştirme |
| [`14_PRODUCT_OPPORTUNITIES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/14_PRODUCT_OPPORTUNITIES.md) | **Yenilik & İnovasyon Fırsatları** | AI Sağlık İkizi, Biyometrik Su/Egzersiz, Akıllı Market |
| [`15_PRODUCT_INVARIANTS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/15_PRODUCT_INVARIANTS.md) | **Ürün Değişmezleri (Invariants)** | KESİNLİKLE KORUNACAK kurallar, SSOT, Yaş Skalaları |
| [`16_REINVENTION_BOUNDARIES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/16_REINVENTION_BOUNDARIES.md) | **Serbest Yeniden İcat Sınırları** | Navigasyon, sayfa düzeni, kart hiyerarşisi |
| [`17_EVIDENCE.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/17_EVIDENCE.md) | **Adli Kanıt & İnceleme Günlüğü** | Veritabanı ve kod doğrulama matrisi, güven skorları |
| [`18_DATA_FLOWS_AND_FAILURE_MODES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/18_DATA_FLOWS_AND_FAILURE_MODES.md) | **Veri Akışları & Hata Modları** | Uçtan uca veri geçişleri, hata durumları |
| [`CLAUDE_PRODUCT_MISSION.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/CLAUDE_PRODUCT_MISSION.md) | **Claude Ürün Görevi (Mission Prompt)** | Odi Pet 2.0 sıfır-legacy tasarım yönergeleri |

---

## 3. Yapay Zeka Okuma ve Çalışma Yolu (AI Reading Pathways)

AI ajanı veya ürün mimarı, yapacağı göreve göre bilgi paketini şu sırayla okumalıdır:

### A. Ürün Mimarları & UX Tasarımcıları
1. [`01_PRODUCT_DNA.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/01_PRODUCT_DNA.md) → Temel kimlik ve yaş kısıtları
2. [`10_DESIGN_SYSTEM_REFERENCE.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/10_DESIGN_SYSTEM_REFERENCE.md) → OPOS Tasarım Anayasası
3. [`04_USER_JOURNEYS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/04_USER_JOURNEYS.md) → Akışlar ve sürtünme noktaları
4. [`15_PRODUCT_INVARIANTS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/15_PRODUCT_INVARIANTS.md) & [`16_REINVENTION_BOUNDARIES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/16_REINVENTION_BOUNDARIES.md) → Nelerin serbest, nelerin kilitli olduğu

### B. Backend & Veri Veritabanı Mühendisleri
1. [`02_DOMAINS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/02_DOMAINS.md) → Domain sınırları
2. [`06_DATA_MODEL.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/06_DATA_MODEL.md) → Şema, RLS ve RPC'ler
3. [`05_BUSINESS_RULES.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/05_BUSINESS_RULES.md) → Protokol ve hesaplama kuralları
4. [`07_EVENT_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/07_EVENT_SYSTEM.md) & [`08_NOTIFICATION_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/08_NOTIFICATION_SYSTEM.md) → Event ve cron motoru

### C. Yapay Zeka & OCR Geliştiricileri
1. [`09_AI_SYSTEM.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/09_AI_SYSTEM.md) → Gemini OCR, Sparkles ve HITL Kuralları
2. [`15_PRODUCT_INVARIANTS.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/15_PRODUCT_INVARIANTS.md) → Tıbbi sorumluluk reddi ve habersiz mutasyon yasağı

---

## 4. Temel Tasarım Felsefesi ve Anayasa Sütunları

Odi Pet ekosistemi 5 yıkılmaz temel ilkeden oluşur:

1. **One Product, One Style (OPOS v1.0):** Tek tip tipografi (Plus Jakarta Sans), 24px radius kart anayasası, 8pt ızgara ritmi ve insani ikonların (tenis raketi, steak eti) kesinlikle yasaklandığı dondurulmuş ikonografi.
2. **Progressive Profiling (Aşamalı Veri Toplama):** Kullanıcı onboarding anında boğulmaz. Yalnızca Tür, İsim, Yaş, Cinsiyet alınır. Diğer veriler bağlamsal olarak zamanı geldiğinde talep edilir.
3. **Single Source of Truth & Soft-Delete (Kanonik Veri Bütünlüğü):** Tıbbi/sağlık verileri asla fiziksel olarak silinmez (`is_archived = true`). Dashboard ve takvim ekranları doğrudan veri üretmez, kanonik tablolardan okur (Read-Only Aggregation).
4. **Human-in-the-Loop AI Governance:** AI asla arkada gizlice veritabanına veri yazamaz. Tüm OCR ve AI tavsiyeleri Mor Yıldız (`Sparkles`) göstergesi ve Taslak İnceleme Modalı ile kullanıcının onayına sunulur.
5. **Kedi & Köpek Odaklılık:** Veritabanı ve iş kuralları seviyesinde yalnızca Kedi ve Köpek türleri desteklenir. Yaş skalaları 0-1 (Yavru), 1-7 (Yetişkin), 7-12 (Yaşlı), 12+ (Yaşlı+) olarak sabitlenmiştir.

---

## 5. Sıfır-Legacy Vade Hedefi (Zero-Legacy Odi Pet 2.0)

Bu bilgi paketi, eski koddaki hataları tekrarlamadan **Odi Pet 2.0** sürümünü sıfırdan en yüksek estetik ve teknik standartlarda inşa etmek üzere kurgulanmıştır. Başlamak için doğrudan [`CLAUDE_PRODUCT_MISSION.md`](file:///c:/Odi.Pet/docs/product-dna/claude-package/CLAUDE_PRODUCT_MISSION.md) dosyasındaki ana talimatları inceleyebilirsiniz.
