# Odi Pet - User Journeys & Screen-by-Screen Flow Map

> **Doküman Tipi:** Comprehensive User Journey Documentation  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kapsam:** 12 Kritik Kullanıcı Yolculuğu (Screen-by-Screen)  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`

---

## 1. Onboarding & User Registration Journey
- **GOAL:** Kullanıcının hesapsız durumdan 30 saniyede doğrulanmış kullanıcıya dönüşmesi ve ilk evcil hayvanını eklemeye yönlendirilmesi.
- **ENTRY:** `/login` (`src/app/login/page.tsx`) veya `/register` (`src/app/register/page.tsx`)
- **STEPS:**
  1. **Ekran:** Register Page (`/register`)  
     - *User Action:* E-posta, şifre ve ad-soyad bilgilerini doldurup "Hesap Oluştur" butonuna basar.  
     - *System Response:* Form doğrulanır, Supabase Auth `signUp` çağrılır ve kullanıcı oturumu açılır.
  2. **Ekran:** Onboarding Gate (`/owner/dashboard`)  
     - *User Action:* Sistem ilk oturum açılışında `pets` tablosunu kontrol eder; 0 pet tespit eder.  
     - *System Response:* `DashboardOnboardingWrapper` bileşeni üzerinden `OnboardingWizard` modalını otomatik tetikler.
  3. **Ekran:** Onboarding Welcome Modal  
     - *User Action:* "İlk Can Dostunu Ekle" CTA butonuna basar.  
     - *System Response:* Kullanıcıyı `/owner/pets/add` rotasına yönlendirir.
- **DECISIONS:** E-posta/şifre veya sosyal login (Google/Apple) seçimi.
- **FRICTION:** E-posta aktivasyon bağlantısı beklenmesi durumunda kullanıcı beklemesi.
- **DROP-OFF RISK:** Yüksek — Şifre kısıtlamaları veya form hatalarında kullanıcının uygulamayı kapatması.
- **SUCCESS:** `profiles` kaydı oluşur, ilk pet ekleme ekranına geçilir.
- **FAILURE:** "Geçersiz e-posta" veya "Zaten kayıtlı" hatası.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/register/page.tsx`, `src/components/onboarding/OnboardingGate.tsx`

---

## 2. Add Pet Flow (Single & Multi-Pet Journey)
- **GOAL:** Evcil hayvanın tür (kedi/köpek), ırk, yaş, cinsiyet ve başlangıç kilo verilerinin sürtünmesiz kaydedilmesi.
- **ENTRY:** `/owner/pets/add` (`src/app/owner/pets/add/page.tsx`) veya Dashboard "Pet Ekle" butonu.
- **STEPS:**
  1. **Adım 1:** Tür Seçimi — Kedi veya Köpek kartına tıklanır (`StepChip`).
  2. **Adım 2:** İsim & Cinsiyet — Pet ismi yazılır, Erkek/Dişi seçilir (`StepText`, `StepChip`).
  3. **Adım 3:** Doğum Tarihi & Kısırlaştırma — Doğum tarihi seçilir, Kısır mı? (Evet/Hayır) işaretlenir (`StepDate`).
  4. **Adım 4:** Irk & Kilo — Irk arama kutusundan (`BreedCombobox`) ırk seçilir, mevcut kilo (kg) girilir (`StepNumber`).
  5. **Adım 5:** Onay & Kaydet — "Kaydı Tamamla" butonuna basılır.  
     - *System Response:* `pets` ve `weight_logs` tablolarına veri yazılır; `vaccination-algorithm.ts` çalışır ve otomatik aşı planı oluşturulur.
  6. **Ekran:** Başarı Ekranı (`/owner/pets/add/success`) — "Tebrikler! [Pet İsim] aileye katıldı" mesajı gösterilir.
- **DECISIONS:** Irkın karışık/melez (Karma) seçilmesi veya bilinen ırk seçilmesi.
- **FRICTION:** Irk listesinde aranan ırkın bulunamaması.
- **DROP-OFF RISK:** Orta — Doğum tarihi tam bilinmiyorsa kullanıcının kararsız kalması.
- **SUCCESS:** Pet profili oluşur, otomatik aşı takvimi hazır olur.
- **FAILURE:** Validation hatası (ör. gelecek doğum tarihi).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/add/page.tsx`, `src/app/owner/pets/add/success/page.tsx`

---

## 3. Daily Dashboard Check & Quick Task Logging Journey
- **GOAL:** Evcil hayvan sahibinin günlük rutin görevlerini (aşı, ilaç, banyo, mama) 5 saniyede kontrol edip tamamlandı olarak işaretlemesi.
- **ENTRY:** `/owner/dashboard` (`src/app/owner/dashboard/DashboardClient.tsx`)
- **STEPS:**
  1. **Ekran:** Dashboard  
     - *User Action:* Sayfayı açar; Pet Slider üzerinden aktif petini seçer.  
     - *System Response:* Üst barda dijital pet kartı özet verileri, altında "Bugünün Görevleri" ve "Yaklaşan Etkinlikler" yüklenir.
  2. **Ekran:** Görev Kartı  
     - *User Action:* "Karma Aşı - Doz 2" görevinin yanındaki yeşil tık (Check) ikonuna basar.  
     - *System Response:* `completeTask` API çağrılır; görev yeşil rozetle "Tamamlandı" durumuna geçer; timeline güncellenir.
  3. **Ekran:** Hızlı Günlük widget'ı (`QuickJournalWidget`)  
     - *User Action:* Not veya fotoğraf eklemek için "+" butonuna basar.  
     - *System Response:* `LogbookSheet` alttan açılır.
- **DECISIONS:** Görevi erteleme veya hemen tamamlama seçimi.
- **FRICTION:** Yavaş mobil internet durumunda check butonunda geçici yükleme dönmesi.
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Sağlık skoru güncellenir, tamamlanan görev ajandaya işlenir.
- **FAILURE:** Görev güncelleme hatası -> Toast uyarısı.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/dashboard/DashboardClient.tsx`, `src/components/dashboard/QuickJournalWidget.tsx`

---

## 4. Health Setup & Medical Record Onboarding Journey
- **GOAL:** Evcil hayvanın geçmiş hastalıkları, geçirdiği operasyonlar ve aktif alerjilerinin sisteme işlenmesi.
- **ENTRY:** `/owner/pets/[id]/health-history` veya `/owner/pets/[id]/treatments`
- **STEPS:**
  1. **Ekran:** Health History Wizard  
     - *User Action:* "Tıbbi Geçmiş Ekle" butonuna basar.  
     - *System Response:* `HealthHistoryWizard` modali açılır.
  2. **Ekran:** Hastalık / Alerji Seçim Formu  
     - *User Action:* Hastalık adı (örn: Gastrit), Teşhis tarihi ve Ciddiyet derecesi seçilir.  
     - *System Response:* Form validasyonundan geçer; `health_diseases` tablosuna eklenir.
  3. **Ekran:** Alerji Yönetimi (`AllergyManager`)  
     - *User Action:* "Tavuk Etine Alerji" girişi yapılır.  
     - *System Response:* Pet Detay Sağlık sekmesinde kırmızı uyarı çipi (`badge-danger`) belirir.
- **DECISIONS:** Kronik hastalık mı geçici enfeksiyon mu seçimi.
- **FRICTION:** Tıbbi terimlerin teknik gelmesi.
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Sağlık karne özeti güncellenir.
- **FAILURE:** Veritabanı kayıt hatası.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/HealthHistoryWizard.tsx`, `src/components/pets/AllergyManager.tsx`

---

## 5. Vaccination Logging Journey (Manual & OCR Scanner)
- **GOAL:** Geçmiş veya yeni yapılan aşının el ile yazarak veya aşı karnesi fotoğrafı taranarak kaydedilmesi.
- **ENTRY:** `/owner/pets/[id]/vaccines` (`VaccinesClient.tsx`)
- **STEPS:**
  1. **Ekran:** Aşılar Sayfası  
     - *User Action:* "Aşı Karnesi Tara (AI OCR)" veya "Manuel İşlem Ekle" butonuna basar.
  2. **Yol A (AI OCR Scanner):**  
     - *User Action:* `SmartScanner` bileşeni ile aşı karnesinin fotoğrafını çeker.  
     - *System Response:* Gemini OCR motoru aşı adı (örn. Nobivac DHPPi) ve tarihi çıkarır; "Review & Confirm Modal" ekrana gelir.  
     - *User Action:* Verileri kontrol edip "Onayla ve Kaydet" butonuna basar.
  3. **Yol B (Manuel Form):**  
     - *User Action:* Aşı adı, uygulama tarihi, veteriner klinik adı girilir.  
     - *System Response:* `vaccine_records_v2` tablosuna `status = 'completed'` olarak yazılır.
- **DECISIONS:** Fotoğraf çekimi mi yoksa el ile veri girişi mi?
- **FRICTION:** Fotoğrafın bulanık çıkması durumunda OCR'ın yanlış okuması.
- **DROP-OFF RISK:** Orta.
- **SUCCESS:** Aşı tamamlandı durumuna geçer, sonraki doz tarihi otomatik hesaplanır.
- **FAILURE:** `OCR_PARSING_ERROR` veya geçersiz tarih uyarısı.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/[id]/vaccines/page.tsx`, `src/components/ui/SmartScanner.tsx`

---

## 6. Parasite Treatment & Auto-Repeat Setup Journey
- **GOAL:** İç ve dış parazit uygulamalarının kaydedilmesi ve otomatik 2 aylık tekrarlama döngüsünün kurulması.
- **ENTRY:** `/owner/pets/[id]/parasite` (`src/app/owner/pets/[id]/parasite/page.tsx`)
- **STEPS:**
  1. **Ekran:** Parazit Takip Sayfası  
     - *User Action:* "İç/Dış Parazit Uygula" butonuna basar.
  2. **Ekran:** Parazit Kayıt Formu  
     - *User Action:* Uygulama Türü (İç Parazit Damlası), İlaç Markası (Bravecto/Stronghold) ve Uygulama Tarihi seçilir. Tekrarlama periyodu (60 gün) onaylanır.
  3. **Ekran:** Plan Tamamlama Modalı (`ParasitePlanCompletionModal`)  
     - *User Action:* "Kaydet ve Hatırlatıcı Kur" butonuna basar.  
     - *System Response:* Uygulama kaydedilir, 60 gün sonrasına otomatik `planned` durumlu yeni görev oluşturulur.
- **DECISIONS:** İç ve dış parazitin kombine ilaçla mı yoksa ayrı mı yapıldığı.
- **FRICTION:** İlaç markalarının listede eksik olması (Serbest metin girişi ile çözülür).
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Parazit rozeti yeşile döner, gelecekteki görev ajandaya işlenir.
- **FAILURE:** Form onay hatası.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/ParasitePlanCompletionModal.tsx`

---

## 7. Nutrition Setup & Food Refill Tracking Journey
- **GOAL:** Mama markasının ve günlük gramajın tanımlanarak paket stok bitiş tarihinin otomatik takibi.
- **ENTRY:** `/owner/pets/[id]/nutrition` (`NutritionClient.tsx`)
- **STEPS:**
  1. **Ekran:** Beslenme Sayfası  
     - *User Action:* "Yeni Mama Tanımla" butonuna basar.
  2. **Ekran:** Mama Formu  
     - *User Action:* Mama Markası (Royal Canin Medium Adult), Paket Gramajı (12 kg) ve Günlük Verilen Miktar (300 gr) girilir.  
     - *System Response:* `StockTimeline` motoru paketin 40 günde biteceğini hesaplar (`estimated_end_date`).
  3. **Ekran:** Stok Çizelgesi (`StockTimeline`)  
     - *User Action:* Kalan gün sayısını ve stok yüzdesini grafikte görüntüler.
- **DECISIONS:** Yaş mama mı kuru mama mı?
- **FRICTION:** Ölçü kabı gramajının bilinmemesi.
- **DROP-OFF RISK:** Orta.
- **SUCCESS:** Stok uyarı radarı aktifleşir.
- **FAILURE:** Gramaj alanının boş bırakılması.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/nutrition/StockTimeline.tsx`, `NutritionClient.tsx`

---

## 8. Plan Yap (Custom Task & Routine Planning Journey)
- **GOAL:** Kullanıcının evcil hayvanı için özel tekrarlayan görevler (banyo, diş fırçalama, tüy tarama, özel eğitim) tanımlaması.
- **ENTRY:** `/owner/plan-yap` (`src/app/owner/plan-yap/page.tsx`)
- **STEPS:**
  1. **Ekran:** Plan Yap Kategori Seçimi  
     - *User Action:* Kategori seçer (Sağlık / Bakım / Beslenme / Eğitim).
  2. **Ekran:** Görev Detay Sihirbazı (`SmartTaskWizard`)  
     - *User Action:* Görev adı ("Haftalık Diş Fırçalama"), Başlangıç tarihi ve Tekrarlama Sıklığı (Her Pazar) seçilir.
  3. **Ekran:** Onay & Kaydet  
     - *User Action:* "Planı Oluştur" butonuna basar.  
     - *System Response:* `plans` ve `plan_occurrences` tablolarına tekrarlayan kayıtlar işlenir; ajandada görünür.
- **DECISIONS:** Haftalık, aylık veya özel gün aralıklı tekrarlama seçimi.
- **FRICTION:** Karmaşık tekrarlama kurallarının kafa karıştırması.
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Özel plan ajandaya ve bildirim motoruna eklenir.
- **FAILURE:** Geçersiz tarih periyodu.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/plan-yap/page.tsx`, `src/components/tasks/SmartTaskWizard.tsx`

---

## 9. Lost Pet (SOS) Emergency Reporting Journey
- **GOAL:** Evcil hayvan kaybolduğunda 1 dakikada resmi kayıp ilanı oluşturup harita ve acil bildirim ağına yayınlama.
- **ENTRY:** `/owner/lost-report` (`src/app/owner/lost-report/page.tsx`) veya Pet Detay -> Kayıp Bildir.
- **STEPS:**
  1. **Ekran:** Kayıp İlanı Sihirbazı (`LostPetWizard`)  
     - *User Action:* Kaybolan petini seçer.
  2. **Ekran:** Konum & Tarih Formu (`LocationForm`)  
     - *User Action:* Harita üzerinden son görüldüğü konum işaretlenir, kaybolma saati girilir.
  3. **Ekran:** Fotoğraf & Ödül Formu (`PhotoUpload`, `PublishSummary`)  
     - *User Action:* Güncel kayıp fotoğrafı doğrulanır, Varsa Ödül miktarı (TL) ve İletişim telefonu girilir.
  4. **Ekran:** OTP Doğrulama (`OTPVerification`)  
     - *User Action:* Telefona gelen SMS doğrulama kodunu girer.  
     - *System Response:* İlan aktifleşir (`status = 'active'`); SOS uyarısı haritada ve yakındaki kullanıcılara yayınlanır.
- **DECISIONS:** Ödül miktarı koyma veya koymama.
- **FRICTION:** Acil durumda OTP SMS kodunun gecikmesi.
- **DROP-OFF RISK:** Yüksek (Kullanıcının panik anı).
- **SUCCESS:** İlan yayına girer, kamusal `/sos/[id]` bağlantısı oluşur.
- **FAILURE:** SMS doğrulama hatası veya geocoding hatası.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/LostPetWizard.tsx`, `src/app/owner/lost-report/page.tsx`

---

## 10. SOS Beacon & Public QR Scan Journey
- **GOAL:** Yoldan geçen bir vatandaşın kayıp petin tasmasındaki QR kodu taratarak veya paylaşılan linke tıklayarak sahibine ulaşması.
- **ENTRY:** Public URL `/sos/[id]` (Herkes erişebilir, login gerektirmez).
- **STEPS:**
  1. **Ekran:** Public SOS Landing (`/sos/[id]`)  
     - *User Action:* QR kodu taratır veya linke tıklar.  
     - *System Response:* Acil durum kırmızı-turuncu temalı kayıp pet kartı, büyük fotoğrafı, kaybolduğu konum haritası ve "Sahibini Ara" / "WhatsApp'tan Yaz" butonları açılır.
  2. **Ekran:** Konum Bildir Butonu  
     - *User Action:* "Pet'i Burada Gördüm - Konum Gönder" butonuna basar.  
     - *System Response:* Tarayıcı GPS konumu alınarak pet sahibine anlık SOS bildirimi ve harita pini iletilir.
- **DECISIONS:** Telefonla arama mı yoksa anonim konum gönderme mi?
- **FRICTION:** Tarayıcının konum izni istemesi.
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Pet sahibi ve bulan kişi doğrudan iletişime geçer.
- **FAILURE:** GPS izni reddedilmesi -> Adres tarif formu açılır.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/sos/[id]/page.tsx`, `src/app/sos/[id]/matches/page.tsx`

---

## 11. Sitter / Co-Owner Invite & Access Journey
- **GOAL:** Evcil hayvan sahibinin petin bakımını geçici olarak bakıcıya veya aile üyesine devretmesi.
- **ENTRY:** Pet Detay -> Family Tab -> "Üye / Bakıcı Davet Et".
- **STEPS:**
  1. **Ekran:** Davet Oluşturma Modalı  
     - *User Action:* Davet edilecek kişinin e-posta adresi yazılır ve Rol seçilir (`Co-Owner` / `Caregiver`).  
     - *System Response:* Benzersiz davet bağlantısı (`https://odi.pet/invite/abc123token`) üretilir.
  2. **Ekran:** Davet Alıcısının Ekranı (`/invite/[token]`)  
     - *User Action:* Linke tıklar.  
     - *System Response:* Pet adı, fotoğrafı ve verilen yetki kapsamı gösterilir. "Daveti Kabul Et" butonu yer alır.
  3. **Ekran:** Onay Ekranı  
     - *User Action:* Butona basar.  
     - *System Response:* `pet_owners` tablosuna kayıt atılır; bakıcının dashboard'una ilgili pet otomatik eklenir.
- **DECISIONS:** Co-owner (Tam Yetki) mi Caregiver (Sadece Gör/İşle) mi?
- **FRICTION:** Alıcının önceden hesabı yoksa önce kayıt sayfasına yönlendirilmesi.
- **DROP-OFF RISK:** Orta.
- **SUCCESS:** Bakıcı pet kartını kendi uygulamasında görmeye başlar.
- **FAILURE:** Süresi dolmuş token (Expired Token).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/family/PendingInviteModal.tsx`, `src/app/invite/[token]/page.tsx`

---

## 12. AI Vet Assistant Consultation & Review-Confirm Journey
- **GOAL:** Pet sahibinin acil olmayan semptom ve beslenme sorularını AI Veteriner Danışmanına sorarak güvenli tavsiye alması.
- **ENTRY:** `/owner/ai-vet` (`src/app/owner/ai-vet/page.tsx`)
- **STEPS:**
  1. **Ekran:** AI Vet Chat Sayfası  
     - *User Action:* Örnek sorulardan birine tıklar veya sohbet kutusuna yazar: "Kedim bugün iştahsız ve su içmiyor, ne yapmalıyım?".
  2. **Ekran:** AI Cevaplama State'i  
     - *System Response:* Mor Yıldız (`Sparkles`) ikonu eşliğinde Gemini AI yanıtı üretilir. Yanıt altında Güven Skoru (%88 Güven) ve Tıbbi Sorumluluk Reddi ibaresi görünür.
  3. **Ekran:** Aksiyon & Hatırlatıcı Kartı  
     - *User Action:* AI'nın "Su tüketimini takip et ve yarın randevu al" tavsiyesini "Ajandama Ekle" butonuna basarak onaylar.  
     - *System Response:* Human-in-the-Loop onay modalı açılır; kullanıcı onaylayınca görevi ajandaya işler.
- **DECISIONS:** Tavsiyeyi ajandaya ekleme veya sadece okuyup geçme.
- **FRICTION:** AI yanıt süresi (2-3 saniye).
- **DROP-OFF RISK:** Düşük.
- **SUCCESS:** Kullanıcı doğru yönlendirilir, tıbbi sorumluluk sınırı korunur.
- **FAILURE:** API bağlantı hatası -> "Şu an AI servisine ulaşılamıyor" mesajı.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/ai-vet/page.tsx`, `AGENTS.md` (Cilt 13 AI Governance)
