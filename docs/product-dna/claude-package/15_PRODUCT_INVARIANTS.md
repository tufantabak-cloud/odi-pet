# Odi Pet — Product Invariants ("Do Not Lose" Rules)

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\15_PRODUCT_INVARIANTS.md`  
> **Kapsam:** Yeniden Tasarımda ASLA Bozulmayacak ve Kesinlikle Korunacak Kurallar  

---

## 1. KESİNLİKLE KORUNACAK DEĞİŞMEZLER (MUST PRESERVE)

### 1.1 Single Source of Truth & Read-Only Aggregation
- **Kural:** Her sağlık verisi veritabanında yalnızca TEK BİR KANONİK TABLODA tutulur. Dashboard ve Takvim ekranları veri mutasyonu yapamaz, doğrudan okur.

### 1.2 Veri Koruma ve Arşivleme (Zero Hard Delete)
- **Kural:** Aşı, parazit, hastalık, reçete ve kilo verileri veritabanından KESİNLİKLE SİLİNEMEZ. Silme istekleri yalnızca `is_archived = true` bayrağı ile arşivlenir.

### 1.3 Tür Kısıtlaması (Cat & Dog Only)
- **Kural:** Veritabanı ve iş mantığı seviyesinde YALNIZCA Kedi (`cat`) ve Köpek (`dog`) türleri desteklenir.

### 1.4 Resmi Yaş Skalası Standardı
- **Kural:** Yaş kategorileri istisnasız şu şekilde gruplanacaktır:
  - 0 - 1 Yaş: Yavru
  - 1 - 7 Yaş: Yetişkin
  - 7 - 12 Yaş: Yaşlı
  - 12+ Yaş: Yaşlı (12+)

### 1.5 Human-in-the-Loop AI Governance & Tıbbi Sorumluluk Reddi
- **Kural:** AI habersiz veritabanına veri yazamaz. Tüm OCR çıktılarında `Sparkles` göstergesi, Taslak İnceleme Modalı ve Zorunlu Tıbbi Sorumluluk Reddi ibaresi olmak zorundadır.

### 1.6 OPOS Design Bible Anayasası
- **Kural:** Font `Plus Jakarta Sans`, Kart Radius `24px`, Izgara `8pt`, İkonlar `Lucide Rounded Outline` (İnsani ikonlar yasaktır).

### 1.7 Private Storage & İmzalı URL'ler
- **Kural:** Tüm kullanıcı sağlık belgeleri private bucket'larda saklanır ve geçici imzalı URL'ler ile sunulur.

### 1.8 Proje Sahipliği Karar Yetkisi
- **Kural:** Tüm ürün kararları ve onay yetkisi Tufan'a aittir.

---

## 2. ESNEK KORUNACAK DEĞİŞMEZLER (SHOULD PRESERVE)

1. **Progressive Profiling:** Kayıt anında sürtünmeyi en aza indiren kademeli veri toplama akışı.
2. **Otomatik Refill Uyarısı:** Porsiyon düşümüne bağlı mama stok yenileme hatırlatıcısı.
3. **SOS Acil Durum İlanı:** Çevredeki PWA kullanıcılarına anlık harita uyarı yayını.
