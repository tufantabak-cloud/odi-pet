# Odi Pet — Notification & Scheduling Engine

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\08_NOTIFICATION_SYSTEM.md`  
> **Kapsam:** Web Push, VAPID, Cron Dispatch, İdemopotensi ve Bildirim Kanalları  

---

## 1. Bildirim Mimarisi ve Kanallar (Notification Architecture)

Odi Pet bildirim sistemi, evcil hayvan sahiplerine kritik aşı, parazit, mama yenileme ve acil durum uyarılarını **tam zamanında** iletmek üzere tasarlanmıştır.

```
[Cron Job / Database Event]
           ↓
[Notification Jobs Kuyruğu (`notification_jobs`)]
           ↓ (Idempotency Key Check)
[Push Dispatch Worker (VAPID Web Push Engine)]
    ├── Web Push API (iOS & Android PWA Service Worker)
    └── In-App Notifications (`notifications` tablosu)
```

---

## 2. Bildirim Tipleri ve Zamanlama Kuralları

| Bildirim Tipi | Tetiklenme Zamanı | Mesaj Şablonu | Öncelik (Priority) |
| :--- | :--- | :--- | :--- |
| **Aşı Yaklaşıyor (Upcoming Vaccine)** | 7 Gün Önce & 1 Gün Önce | *"{pet_name} için {vaccine_name} aşısının zamanı yaklaşıyor. Randevunuzu almayı unutmayın!"* | Yüksek (High) |
| **Gecikmiş Aşı Uyarısı (Overdue Alert)** | Tarihten 1 Gün Sonra | *"{pet_name} için {vaccine_name} aşısının tarihi geçti! Lütfen veterinerinizle iletişime geçin."* | Kritik (Urgent) |
| **Parazit Damlası Zamanı** | 3 Gün Önce & Gününde | *"{pet_name} için iç/dış parazit damlası uygulama günü geldi."* | Yüksek |
| **Mama Stok Yenileme (Refill)** | Stok <= 4 Günlük kaldığında | *"{pet_name}'in mamasından yaklaşık 4 günlük kaldı. Stok yenilemeyi unutmayın."* | Orta (Medium) |
| **SOS Kayıp İlanı (Emergency SOS)** | İlan yayınlandığı an | *"[ACİL SOS] {location} çevresinde kayıp pet ilanı! Lütfen kontrol edin."* | En Yüksek (Emergency) |
| **Doğum Günü & Kutlama** | Doğum Günü Gününde | *"Mutlu Yıllar! {pet_name} bugün {age} yaşına girdi! 🎉"* | Düşük (Info) |

---

## 3. Cron Dispatch Motoru ve İdemopotensi Garantisi

### 3.1 Idempotency Key Formatı
Tüm bildirim işleri benzersiz bir anahtar taşır:  
`key = {type}_{pet_id}_{schedule_id}_{due_date}`  
Örnek: `vac_upg_9b1deb4d_karma2_20260815`

### 3.2 Dispatch İş Akışı
1. Cron worker `notification_jobs` tablosunda `status = 'queued'` ve `scheduled_for <= NOW()` olan satırları çeker.
2. Satıra `processing` kilidi koyar.
3. VAPID Web Push servisine POST isteği atar.
4. Başarılı ise durum `delivered` yapılır; hata oluşursa retry counter artırılır.

### 3.3 Yeniden Deneme (Retry & Dead Letter) Politikası
- **Maksimum Deneme:** 3 Kez
- **Bekleme Süresi:** Üstel Geri Çekilme (Exponential Backoff: 5dk, 15dk, 60dk)
- **Dead Letter State:** 3 denemeden sonra başarısız olan bildirimler `failed` durumuna alınır ve admin uyarısı üretilir.

---

## 4. Kullanıcı Tercihleri ve Sessiz Saatler (User Preferences)

- Kullanıcı ayarlar sayfasından bildirim türlerini (Aşı, Parazit, Mama, Sosyal) ayrı ayrı açıp kapatabilir.
- **Sessiz Saatler (Quiet Hours):** Varsayılan olarak 23:00 - 08:00 saatleri arasında (Emergency SOS hariç) Web Push bildirimleri ertelenir ve sabah 08:30'da iletilir.
