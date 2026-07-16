# Kızgınlık (Estrus) Modülü Nihai Durum Belgesi

Bu belge, Odi.Pet bünyesinde geliştirilen **Kızgınlık (Estrus) Takip, Tahmin, Bildirim ve Takvim Entegrasyonu** modülünün nihai teknik mimarisini, güvenlik önlemlerini ve bilinen sınırlamalarını açıklamaktadır.

---

## 1. Tamamlanan Özellikler
- **Döngü Yönetimi:** Dişi köpekler ve kediler için aktif kızgınlık dönemi başlatma, sonlandırma ve geçmişe dönük döngü kaydı ekleme/düzenleme/silme.
- **Belirti Takibi:** Günlük bazda belirti ve semptomların (miyavlama, yuvarlanma, iştahsızlık vb.) şiddet derecelendirmesi (1-3) ile sisteme kaydedilmesi.
- **Tıbbi Test Entegrasyonu:** Progesteron değeri (ng/mL veya nmol/L) ile vajinal sitoloji test sonuçlarının (doküman yükleme dahil) eklenmesi.
- **Akıllı Tahmin Motoru:** Son 3 döngü başlangıç tarihi, belirti yoğunluğu ve test sonuçlarına dayanarak bir sonraki tahmini kızgınlık penceresini (`nextHeatWindow`) hesaplayan kural tabanlı tahmin motoru.
- **Sanal Takvim Entegrasyonu:** Tahmin edilen aralığı veritabanına kalıcı olarak yazmadan takvim timeline arayüzüne enjekte eden salt okunur dinamik olay yapısı.
- **Kızgınlık Bildirimleri:**
  - `estrus_forecast_upcoming`: Yaklaşan tahmin dönemi uyarısı (başlangıçtan 7 gün önce).
  - `estrus_cycle_review`: 21 gündür açık olan döngülerin kontrol uyarısı.

---

## 2. Veritabanı Şeması
- **`pet_estrus_cycles`**: Döngü sürelerini ve genel notları tutar.
- **`pet_estrus_observations`**: Döngüye bağlı günlük semptom kayıtlarını tutar.
- **`pet_reproductive_tests`**: Progesteron ve sitoloji test sonuçlarını depolar.
- **`pet_estrus_preferences`**: Pet bazlı bildirim tercihlerini yönetir (`reminders_enabled`).
- **`notifications` (Genişletildi):** `idempotency_key` (UNIQUE CONSTRAINT) alanı eklenerek mükerrer bildirim gönderimi engellenmiştir.

---

## 3. API Uç Noktaları ve Servisler
- `/api/pets/[id]/estrus-cycles`: CRUD döngü işlemleri.
- `/api/pets/[id]/estrus-cycles/[cycleId]/observations`: CRUD gözlem işlemleri.
- `/api/pets/[id]/estrus-cycles/[cycleId]/reproductive-tests`: CRUD tıbbi test işlemleri.
- `/api/pets/[id]/estrus-preferences`: Bildirim ayarları.
- `lib/estrus/virtual-events.ts`: İstemci ve sunucu taraflı takvim akışlarına sanal olayları N+1 sorgu problemi olmadan enjekte eden ortak yardımcı katman.

---

## 4. Güvenlik ve Yetkilendirme
- **CRUD Güvenliği:**
  - Tüm backend rotalarında `pet_owners` tablosu üzerinden sahiplik kontrolü yapılır (Sahiplik doğrulaması geçemeyen istekler `403 Forbidden` alır).
  - İstemci (client-side) doğrudan `pet_estrus_preferences` tablosuna yazamaz. Tercihler backend API rotaları üzerinden yönetilir.
- **Sanal Olay Kilidi:** `virtual_` ile başlayan tüm olay kimlikleri için `/api/tasks/assign` rotalarında patch/delete işlemleri `400 Bad Request` ile reddedilir. Arayüzde (ActionSheet) tamamlandı/sil butonları sanal kartlar için gizlenmiştir.
- **Verified Koruması:** `verification_status` değeri `verified` (onaylı) olan test kayıtları üzerinde güncelleme veya silme işlemleri backend seviyesinde engellenmiştir.

---

## 5. Test ve Doğrulama
- **Unit Testler:** `tests/reproductive-forecast.spec.ts` altındaki 18 testin tamamı başarılı bir şekilde çalışmaktadır. Kedi, erkek ve kısırlaştırılmış evcil hayvanların algoritma dışı kalması ve tahmin üretilmemesi garanti edilmiştir.
- **TypeScript:** Modül bileşenlerinin derleme aşamasında hiçbir TypeScript hatası bulunmamaktadır.

---

## 6. Bilinen Sınırlamalar
- **Tıbbi Teşhis Değildir:** Kızgınlık tahmin motoru sadece ürün UX sezgisellerini kullanarak bilgilendirme sağlar, kesinlikle tıbbi bir ovulasyon veya üreme günü tespiti yapmaz.
- **Çiftleşme Dili Yasağı:** Arayüzde veya bildirimlerde "kesin yumurtlama", "en iyi çiftleşme günü", "çiftleşmeye hazır" veya "bugün çiftleştirin" gibi yönlendirici ifadeler kesinlikle yer almaz.
- **Metadata Zorunluluğu Yoktur:** Teknik tıbbi test detayları (laboratuvar adı, analiz cihazı vb.) kullanıcıya zorunlu tutulmamıştır.
- **OCR Eksikliği:** Yüklenen test rapor belgelerinden otomatik veri çıkarma (OCR) altyapısı henüz modülde bulunmamaktadır.
- **Storage Temizliği:** Silinen testlere ait dosya eklerinin Supabase Storage üzerinden otomatik silinmesi (orphaned files) henüz implemente edilmemiştir.
- **Sezgisel Değerler:** Bildirim planlamasında kullanılan 7 günlük yaklaşan dönem ve 21 günlük açık dönem kontrol süreleri bilimsel veterinere dayalı değil, ürün UX sezgiselleridir.
- **Sorgu Maliyeti:** Kızgınlık takvim entegrasyonu pet sayısından bağımsız olarak ek 3 toplu sorgu (IN filtresiyle) üretir. Veri miktarı büyüklüğüne göre işlenme süresi artabilir.
