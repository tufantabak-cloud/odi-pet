# Odi Pet — Integrated Data Flows & Failure Modes

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\18_DATA_FLOWS_AND_FAILURE_MODES.md`  
> **Kapsam:** Uçtan Uca Veri Akışları, Değer Modeli ve Olası Hata Durumları  

---

## 1. Veri Akışı 1: OCR Belge Okuma ve HITL Onay Akışı

### 1.1 Veri Akış Adımları
```
[Fotoğraf Çekimi] ──> [Image Compression] ──> [/api/scan-document] ──> [Gemini Vision API]
                                                                             ↓
[Veritabanına Yazma] <── [/api/scan-document/confirm] <── [HITL Taslak UI] <── [JSON Output]
```

### 1.2 Olası Hata Durumları (Failure Modes) & Çözüm Stratejileri
- **Hata 1: Bulanık / Okunamayan Fotoğraf**
  - *Sistem Reaksiyonu:* Gemini OCR düşük güven skoru (`confidence_score < 0.70`) döndürür.
  - *Kurtarma:* UI'da turuncu alert belirir: *"Belge net okunamadı. Lütfen bilgileri manuel kontrol ediniz."*
- **Hata 2: API Zaman Aşımı (Timeout)**
  - *Sistem Reaksiyonu:* Network 504 Gateway Timeout alır.
  - *Kurtarma:* Kullanıcıya Toast uyarısı verilir ve manuel aşı ekleme formuna düşülür.
- **Hata 3: Kullanıcının Taslağı İptal Etmesi**
  - *Sistem Reaksiyonu:* Kullanıcı Taslak Modalındaki "İptal" butonuna basar.
  - *Kurtarma:* Hiçbir veri kaydedilmez, geçici dosya temizlenir.

---

## 2. Veri Akışı 2: Aşı Planı → Cron Zamanlama → Web Push Bildirimi

### 2.1 Veri Akış Adımları
```
[Aşı Tamamlandı] ──> [Complete RPC] ──> [Sonraki Doz Tarihi] ──> [health_schedules (UPCOMING)]
                                                                           ↓
[Cihaz Push Ekranı] <── [Web Push API] <── [notification_jobs] <── [Cron Worker]
```

### 2.2 Olası Hata Durumları & Çözüm Stratejileri
- **Hata 1: Geçersiz VAPID / Push Token**
  - *Sistem Reaksiyonu:* Web Push servisi 410 Gone / 404 Not Found döndürür.
  - *Kurtarma:* Pasif push aboneliği `device_push_subscriptions` tablosundan temizlenir.
- **Hata 2: Mükerrer Bildirim Tetiklenmesi (Duplicate Dispatch)**
  - *Sistem Reaksiyonu:* Cron worker aynı anda iki kez çalışır.
  - *Kurtarma:* `idempotency_key` veritabanı kısıtlaması ikinci işlemi otomatik reddeder.

---

## 3. Veri Akışı 3: Mama Stok Düşümü ve Refill Hatırlatıcısı

### 3.1 Olası Hata Durumları & Çözüm Stratejileri
- **Hata: Stok Miktarının Eksiye Düşmesi**
  - *Sistem Reaksiyonu:* Porsiyon düşümleri devam ederken stok 0g altına iner.
  - *Kurtarma:* Sistem stoku 0g olarak dondurur ve "Stok tükendi! Lütfen yeni mama ekleyin" uyarısı verir.

---

## 4. Veri Akışı 4: SOS Acil Kayıp İlanı Yayını

### 4.1 Olası Hata Durumları & Çözüm Stratejileri
- **Hata: Cihaz Konum İzninin Kapalı Olması**
  - *Sistem Reaksiyonu:* Kullanıcının son konumu alınamaz.
  - *Kurtarma:* Sistem pet profilinde tanımlı ev adresini / semti varsayılan SOS merkezi kabul eder.
