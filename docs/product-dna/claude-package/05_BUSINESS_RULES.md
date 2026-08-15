# Odi Pet — Complete Business Rules Engine

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\05_BUSINESS_RULES.md`  
> **Kapsam:** Tüm Modüller için Kural ID'leri, Koşullar, Çıktılar ve Kısıtlar  

---

## 1. Pet Core & Kimlik Kuralları

### `BR-PET-01`: Tür Kısıtlaması (Species Constraint)
- **Koşul:** Yeni bir pet eklenirken veya güncellenirken.
- **Girdi:** `species` (string)
- **Çıktı / Kısıt:** `species IN ('cat', 'dog')`. Başka bir tür girilmeye çalışılırsa veritabanı `pets_species_check` kısıtlaması hata döndürür.

### `BR-PET-02`: Progressive Profiling Onboarding Kuralı
- **Koşul:** Kullanıcı kayıt akışında pet profili oluştururken.
- **Girdi:** `name`, `species`, `birth_date` (veya yaş), `gender`
- **Kısıt:** İlk aşamada microchip no, pasaport no, veteriner adı, kilo gibi alanlar **zorunlu tutulamaz**. Aksi halde onboarding terk riski oluşur.

### `BR-PET-03`: Yaş Gruplandırma Standart Kuralı
- **Koşul:** Pet doğum tarihine göre yaş kategorisi hesaplanırken.
- **Formül & Çıktı:**
  - `0 - 1 Yaş` → **Yavru** (Puppy / Kitten)
  - `1 - 7 Yaş` → **Yetişkin** (Adult)
  - `7 - 12 Yaş` → **Yaşlı** (Senior)
  - `12+ Yaş` → **Yaşlı (12+)** (Super Senior)

---

## 2. Aşı & Koruyucu Sağlık Kuralları

### `BR-VAC-01`: Protokol Sıralama Kuralı (Protocols v2)
- **Koşul:** Yavru petler için karma veya kuduz aşısı planlanırken.
- **Kısıt:** Seri aşılarında (Karma 1, Karma 2) birinci doz yapılmadan ikinci doz planlanamaz. İki doz arası minimum 21 gün, maksimum 28 gün olmak zorundadır.

### `BR-VAC-02`: Sağlık Verisi Koruma ve Arşivleme Kuralı
- **Koşul:** Kullanıcı geçmiş bir aşı veya tıbbi kaydı sildiğinde.
- **Kısıt:** Tıbbi veritabanı tablolarında `DELETE` (Hard Delete) yapmak KESİNLİKLE YASAKTIR. Kayıt `is_archived = true` ve `archived_at = CURRENT_TIMESTAMP` ile arşivlenir.

### `BR-VAC-03`: Single Source of Truth (SSOT) Kuralı
- **Koşul:** Dashboard veya Takvim ekranları sağlık özeti oluştururken.
- **Kısıt:** Dashboard kartları kendi verisini üretemez veya saklayamaz. Veriler strictly kanonik `vaccine_records_v2` ve `health_schedules` tablolarından okuma (Read-Only Aggregation) yoluyla türetilir.

---

## 3. Beslenme & Stok Kuralları

### `BR-NUT-01`: Yaşa Uygun Mama Güvenlik Uyarısı
- **Koşul:** Pet için mama atanırken (`pet_food_assignments`).
- **Kısıt:** Yaş grubu `Yavru` olan bir pete `Yetişkin` maması atanmaya çalışılırsa kullanıcıya "Yavru kedi/köpekler için yüksek gelişimli yavru maması önerilir" uyarısı verilir (İşlem engellenmez, uyarılır).

### `BR-NUT-02`: Otomatik Stok Yenileme (Refill Alert) Kuralı
- **Koşul:** Günlük porsiyon düşümlerinden sonra kalan mama stok miktarı hesaplanırken.
- **Formül:** `kalan_gun = kalan_stok_gram / gunluk_porsiyon_gram`
- **Kısıt:** `kalan_gun <= 4` veya `kalan_stok <= %15` olduğunda sistem `Refill Alert Notification` tetikler.

---

## 4. Yapay Zeka & OCR Kuralları

### `BR-AI-01`: Human-in-the-Loop (HITL) Onay Kuralı
- **Koşul:** AI / OCR servisi (`/api/scan-document`) aşı belgesi taradığında.
- **Kısıt:** Yapay zeka hiçbir koşulda veritabanına **otomatik kayıt yazamaz**. Çıkarılan veriler `AI Taslak İnceleme Modalı` üzerinden kullanıcıya sunulur. Kullanıcı "Onayla ve Kaydet" butonuna basmadan mutasyon gerçekleşmez.

### `BR-AI-02`: Tıbbi Sorumluluk Reddi (Medical Disclaimer) Kuralı
- **Koşul:** Yapay zeka sağlık tavsiyesi, semptom analizi veya OCR sonucu gösterilirken.
- **Kısıt:** Ekranın altında görünür biçimde şu ibare yer almak zorundadır: *"Bu bir klinik teşhis değildir. Acil durumlarda mutlaka lisanslı bir veteriner hekime danışınız."*

### `BR-AI-03`: Güven Skoru (Confidence Score) Eşik Kuralı
- **Koşul:** OCR ile tarih veya aşı adı ayrıştırıldığında.
- **Kısıt:** OCR güven skoru `< %70` ise ilgili alan turuncu uyarı çerçevesine alınır ve kullanıcıya manuel doğrulama yapması söylenir.

---

## 5. Güvenlik & Yetkilendirme Kuralları

### `BR-SEC-01`: Private Storage & İmzalı URL Kuralı
- **Koşul:** Aşı karnesi, reçete veya kan tahlili görselleri yüklenirken veya görüntülenirken.
- **Kısıt:** Sağlık belgeleri kesinlikle `public` bucket'larda saklanamaz. Erişim yalnızca Supabase `createSignedUrl` fonksiyonu ile üretilen zaman sınırlı (ör. 60 dakika) geçici imzalı URL'ler üzerinden sağlanır.

### `BR-SEC-02`: Çoklu Sahiplik RLS Kuralı
- **Koşul:** Kullanıcı bir petin sağlık kayıtlarını okumak veya değiştirmek istediğinde.
- **Kısıt:** PostgreSQL RLS politikaları, istek atan kullanıcının `pet_owners` veya `pet_memberships` tablosunda yetkili olduğunu doğrulamak zorundadır. Yetkisiz istekler 403 Forbidden alır.
