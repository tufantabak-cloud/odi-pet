# Odi Pet — Complete User Journeys & Experience Maps

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\04_USER_JOURNEYS.md`  
> **Kapsam:** Uçtan Uca Kullanıcı Senaryoları, Sürtünme Noktaları ve Optimal Yollar  

---

## 1. Yolculuk 1: Onboarding ve İlk Aşı Kurulumu (Primary Owner)

### 1.1 Akış Şeması
```
[Giriş / Kayıt (OTP/OAuth)]
           ↓
[Tür Seçimi: Kedi mi Köpek mi?] ──(Tek Tık)──> [İsim & Doğum Tarihi]
           ↓
[Dinamik Irk Arama] ──(Opsiyonel Fotoğraf)──> [Dashboard Açılışı]
           ↓
[Smart Card: "Henüz aşı eklenmedi"] ──> [Aşı Ekle Modalı] ──> [Takvim Otomasyonu]
```

### 1.2 Sürtünme Noktaları ve Önlemler
- **Risk:** Kullanıcının ilk girişte mikroçip numarası veya eski veteriner adresi gibi detaylarla yorulması.
- **Çözüm (Progressive Profiling):** İlk girişte yalnızca 4 alan istenebilir: Tür, İsim, Doğum Tarihi (veya yaş), Cinsiyet. Diğer tüm alanlar atlanabilir (Skip).

### 1.3 Mikro Etkileşim & Estetik
- Butonlara basıldığında dokunsal basılma hissi: `active:scale-[0.98]`
- Tür kartlarına dokunulduğunda hafif mor parlama ve büyüme: `hover:scale-[1.05]`

---

## 2. Yolculuk 2: OCR Belge Tarama ve AI İnceleme (Smart Scanner)

### 2.1 Akış Şeması
```
[Dashboard FAB / Sağlık Sekmesi]
           ↓
[Akıllı Tarayıcı 'Sparkles' Butonuna Dokunma]
           ↓
[Kamera Açılışı & Aşı Karnesi Fotoğrafı Çekimi]
           ↓
[Shimmer Loading & Gemini OCR İşleme]
           ↓
[Mor Vurgulu 'AI Taslak İnceleme Modalı']
  ├── Tespit Edilen Aşılar & Tarihler (%94 Güven Skoru)
  ├── Düzenlenebilir Input Alanları
  └── Medical Disclaimer İbresi
           ↓
["Onayla ve Kaydet" Butonu] ──> [Kanonik Veritabanına Yazım]
```

### 2.2 Optimal Yol
- Kullanıcı tek fotoğrafla 4 farklı geçmiş aşıyı aynı anda sisteme aktarır. Sistem her bir aşı için ayrı ayrı kayıt ve gelecek doz hatırlatıcısı üretir.

---

## 3. Yolculuk 3: Mama Takibi ve Stok Yenileme Döngüsü (Refill Engine)

### 3.1 Akış Şeması
```
[Mama Markası ve Paket Ağırlığı Tanımlama (Örn: 3kg)]
           ↓
[Günlük Porsiyon Belirleme (Örn: 80g/gün)]
           ↓
[Otonom Günlük Stok Düşümü (Sistem Arka Planı)]
           ↓
[Stok %15 Seviyesine Ulaştığında Push Bildirimi: "Luna'nın mamasından 4 günlük kaldı!"]
           ↓
["Tek Tıkla Yenile" veya "Stok Ekle" Aksiyonu] ──> [Stok Miktarı Sıfırlanır]
```

### 3.2 UX Dokunuşu
- Mama çubuğu visual indicator: Yeşil (%100-30) → Sarı (%30-15) → Kırmızı Uyarısı (%15-0).

---

## 4. Yolculuk 4: Ortak Sahiplik ve Aile İçi Paylaşım (Multi-Owner Flow)

### 4.1 Akış Şeması
```
[Ana Sahip: Pet Ayarları > "Aile Üyesi Davet Et"]
           ↓
[Davet Kodu / QR Code Üretimi]
           ↓
[Eş / Ev Arkadaşı: Kodu Girer veya Linke Tıklar]
           ↓
[`pet_owners` Tablosunda İkincil İlgili Oluşumu]
           ↓
[Ortak Dashboard, Paylaşımlı Zaman Çizelgesi ve Eşzamanlı Bildirimler]
```

### 4.2 Engellenen Sürtünme
- Bir sahip aşıyı "Tamamlandı" olarak işaretlediğinde veya mamayı verdiğini bildirdiğinde diğer sahibin ekranındaki durum eşzamanlı (Realtime Supabase subscription) olarak yeşile döner. Çift mama verilmesi önlenir.

---

## 5. Yolculuk 5: Acil Durum Kayıp İlanı (SOS Broadcast)

### 5.1 Akış Şeması
```
[Yüzen SOS Butonu (Kırmızı Vurgulu)]
           ↓
[Son Görüldüğü Konum & Tasma Bilgisi Onayı]
           ↓
["Kayıp İlanını Yayınla"]
           ↓
[Çevredeki Tüm Odi Pet Kullanıcılarına Web Push Alert & Harita İşaretçisi]
           ↓
[Bulunduğunda "Pet Bulundu" Aksiyonu ile SOS İptali]
```

---

## 6. Yolculuk 6: Veteriner Randevusu ve Klinik Paylaşımı

### 6.1 Akış Şeması
```
[Veteriner Arama / Haritadan Seçim] ──> [Randevu Saati Seçimi]
           ↓
[Sistem: Pet Dijital Aşı Karnesi Erişim İzni İster]
           ↓
[Veteriner Klinik Paneli: Petin Geçmiş Aşı ve Alerjilerini Görür]
           ↓
[Klinik İşlem Sonrası Aşı Onayı / Sisteme Vet İmzası Düşmesi]
```
