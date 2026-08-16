# Odi Pet — Consolidated Feature Specifications

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\03_FEATURES.md`  
> **Kapsam:** Tüm Modüller için Akışlar, Önkoşullar, İş Kuralları ve UI Durumları  

---

## 1. Onboarding & Pet Profil Yönetimi

### 1.1 Özellik Tanımı
Yeni kullanıcının sisteme hızlıca dahil olmasını ve evcil hayvanı (Kedi veya Köpek) için temel dijital kimliği oluşturmasını sağlar. Progressive Profiling kuralına sadıktır.

### 1.2 Önkoşullar & Bağımlılıklar
- Geçerli Supabase Auth oturumu (OAuth, Magic Link veya OTP).
- Cihaz kamera/galeri erişim izni (opsiyonel pet fotoğrafı için).

### 1.3 Adım Adım Kullanıcı Akışı
1. Kullanıcı kaydolur veya giriş yapar.
2. Tür Seçimi Ekranı: **Kedi** veya **Köpek** ikon seçeneği sunulur (Kedi/Köpek harici seçenek yoktur).
3. Temel Bilgiler: Pet İsmi, Doğum Tarihi (veya tahmini yaş), Cinsiyet (Erkek/Dişi), Kısırlaştırma Durumu (Evet/Hayır).
4. Irk Seçimi: Tür bazlı dinamik arama ve açılır liste.
5. Tamamla: Pet profili oluşturulur (`pets` tablosuna kayıt) ve kullanıcı doğrudan Pet Dashboard ekranına yönlendirilir.

### 1.4 İş Kuralları & Kısıtlamalar
- `BR-PET-01`: `species` alanı veritabanı kısıtlaması nedeniyle yalnızca `'cat'` veya `'dog'` olabilir.
- `BR-PET-02`: İlk kayıtta mikroçip numarası, pasaport no veya kilo zorunlu TUTULAMAZ (Progressive Profiling).

### 1.5 UI Durumları (States)
- **Empty State:** Profil resmi yoksa pastel arka planlı varsayılan tür avatarı gösterilir.
- **Loading State:** Profil oluşturulurken buton üzerinde dairesel spinner belirir.
- **Error State:** İnternet kopması durumunda Toast ile "Profil kaydedilemedi, tekrar deneyin" uyarısı verilir.

---

## 2. Preventive Health (Aşı & Parazit Protokol Motoru)

### 2.1 Özellik Tanımı
Evcil hayvanın türüne ve yaşına uygun aşı ile iç/dış parazit uygulama tarihlerini otomatik hesaplar, geçmiş uygulamaları saklar ve gelecek dozları zamanlar.

### 2.2 Önkoşullar & Bağımlılıklar
- `ACTIVE` durumunda bir Pet Profilinin varlığı.
- Tür bazlı aşı protokol şablonları (`vaccine_protocols`, `parasite_protocols`).

### 2.3 Adım Adım Kullanıcı Akışı
1. Kullanıcı Sağlık sekmesinden "Aşı Ekle" veya "Parazit Ekle" butonuna basar.
2. Aşı Türü/Markası seçilir (Örn: Karma Aşı, Kuduz, İç Parazit Damlası).
3. Uygulama Tarihi ve Yapan Veteriner bilgisi girilir (veya varsayılan bugün seçilir).
4. Otomatik Doz Hesaplama: Sistem protokol tablosuna bakarak sonraki dozu (Örn: 21 gün sonra veya 1 yıl sonra) hesaplar.
5. Onay: Kanonik `vaccine_records_v2` kaydı açılır ve `health_schedules` tablosunda `UPCOMING` durumu oluşturulur.

### 2.4 İş Kuralları & Kısıtlamalar
- `BR-VAK-01`: Yavru kedi/köpeklerde Karma 1 aşısı yapılmadan Karma 2 aşısı planlanamaz (Protocols v2).
- `BR-VAK-02`: Aşı verileri veritabanından kesinlikle silinemez; sadece `is_archived = true` yapılabilir.

### 2.5 UI Durumları
- **Empty State:** "Henüz tanımlı aşı kaydı yok. + Aşı Ekle butonuyla başlayın." (OPOS 07.13 Empty State).
- **Active State:** Yeşil rozetli "Karma Aşı - Tamamlandı" veya Sarı rozetli "İç Parazit - 5 Gün Kaldı" kartları.
- **Overdue State:** Kırmızı vurgulu alert kartı: "Gecikmiş Aşı! Lütfen veteriner hekiminizle görüşün."

---

## 3. Nutrition & Food Stock Engine (Mama & Stok Motoru)

### 3.1 Özellik Tanımı
Petin mamasını, günlük porsiyon miktarını (gram) ve mevcut stok paket ağırlığını takip ederek stok tükenme tarihini otonom hesaplar ve refill hatırlatıcısı sunar.

### 3.2 Önkoşullar & Bağımlılıklar
- Mama markası kataloğu (`food_brands`).
- Petin kilo bilgisi (`weight_logs`).

### 3.3 Adım Adım Kullanıcı Akışı
1. Kullanıcı Beslenme sekmesinden "Mama Tanımla" seçeneğini tıklar.
2. Katalogdan veya arama çubuğundan mama markası ve ürün tipi seçilir (Örn: Royal Canin Kitten 2kg).
3. Günlük Porsiyon (örn. 60g) veya Öğün Sayısı girilir.
4. Paket başlama tarihi ve net kilosu girilir.
5. Stok Takibi: Sistem her gün otomatik porsiyon düşer. Stok %15'in altına indiğinde Refill Notification tetiklenir.

### 3.4 İş Kuralları & Kısıtlamalar
- `BR-NUT-01`: Yavru (0-1 yaş) petler için yetişkin maması seçildiğinde "Yavru petler için yüksek proteinli yavru maması önerilir" uyarısı belirir.
- `BR-NUT-02`: Stok eksiye düşerse sistem stoku 0g olarak dondurur ve "Stok tükendi" uyarısı verir.

---

## 4. AI Smart Scanner & OCR Belge Okuyucu

### 4.1 Özellik Tanımı
Fiziksel aşı karnesinin veya veteriner reçetesinin fotoğrafını Gemini AI ile analiz eder; aşı adı, tarihi ve markasını otomatik tespit eder. Human-in-the-Loop UI ile onaylatır.

### 4.2 Adım Adım Kullanıcı Akışı
1. Kullanıcı Akıllı Tarayıcı ikonuna (`Sparkles`) basar.
2. Kameradan aşı karnesi sayfasının fotoğrafını çeker.
3. OCR İşleme: Yükleme ekranında shimmer animasyonu eşliğinde metinler ayrıştırılır.
4. AI Review Modalı: Tespit edilen veriler (Aşı: Karma 2, Tarih: 10.05.2026, Güven Skoru: %92) mor yıldız vurgusu ile gösterilir.
5. Kullanıcı "Onayla ve Kaydet" butonuna basana kadar veritabanına kayıt yapılmaz.

### 4.3 İş Kuralları & Kısıtlamalar
- `BR-AI-01`: Güven skoru %70'in altında olan alanlar turuncu uyarı ile vurgulanır ve manuel kontrol istenir.
- `BR-AI-02`: Ekranın altında standart Medical Disclaimer ("Bu bir klinik teşhis değildir...") yer almak zorundadır.

---

## 5. SOS Emergency & Kayıp Pet Sihirbazı

### 5.1 Özellik Tanımı
Kayıp evcil hayvan durumlarında 7/24 hızlı kayıp ilanı (Lost Report) oluşturarak çevredeki kullanıcılara bildirim ve harita uyarısı gönderir.

### 5.2 Adım Adım Akış
1. Ana ekrandaki yüzen FAB butonundan "Kayıp Bildir (SOS)" seçilir.
2. Kaybolduğu konum, zaman ve üzerindeki tasma/künye detayları girilir.
3. "İlanı Yayınla": Sistem anında civardaki aktif PWA kullanıcılarına yüksek öncelikli SOS bildirimi iletir.
4. Kayıp haritasında kırmızı dairesel alan işaretlenir.

---

## 6. Dinamik Yönetim Paneli & Feature Registry

### 6.1 Özellik Tanımı
Admin panelinden kod canlıya alınmadan yeni modüllerin (örn. Estrus tracker, Sosyal Akış) kullanıcı gruplarına açılıp kapatılmasını (Feature Flags) sağlar.
