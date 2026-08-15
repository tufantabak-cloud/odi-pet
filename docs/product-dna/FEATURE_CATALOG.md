# Odi Pet - Feature Catalog 2.0

> **Doküman Tipi:** Product Intelligence & Architecture Catalog  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kapsam:** Tüm Modüller (User, Pet, Health, Nutrition, Care, Plans, Notifications, Social, AI, Admin)  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`, `UNKNOWN`, `CONTRADICTED`

---

## 1. IAM & User Identity Domain

### FEAT-IAM-001: User Registration & Authentication (OTP / Passkey / OAuth)
- **ID:** `FEAT-IAM-001`
- **NAME:** User Registration & Multi-Factor Authentication
- **DOMAIN:** `IAM & User Identity Domain`
- **USER PROBLEM:** Evcil hayvan verilerine güvenli, hızlı ve şifre hatırlama yükü olmadan mobil ve web cihazlardan erişim sağlama ihtiyacı.
- **USER VALUE:** Parolasız (passkey) veya e-posta/şifre ile 5 saniyede güvenli giriş yapabilme, oturum sürekliliği.
- **ENTRY POINT:** `/login` (`src/app/login/page.tsx`), `/register` (`src/app/register/page.tsx`)
- **PRECONDITIONS:** Yok (Unauthenticated state).
- **FLOW:** 
  1. Kullanıcı e-posta/şifre veya sosyal giriş (OAuth/Passkey) yöntemi seçer.
  2. Form validasyonundan geçer (`EmailInput`, `PasswordInput`).
  3. Supabase Auth servisine istek gönderilir (`supabase.auth.signInWithPassword` / `signUp`).
  4. Başarılı girişte `profiles` tablosunda kullanıcı profili oluşturulur/okunur ve `/owner/dashboard` rotasına yönlendirilir.
- **UI:** Glassmorphic card tasarımı, `btn-primary` (h-[50px]), inline validasyon hataları, asenkron `BiometricLogin` butonu.
- **STATE:** `idle`, `submitting`, `error` (invalid credentials), `success` (authenticated).
- **DATA:** `email`, `password`, `full_name`, `phone_number`.
- **API:** `/api/auth/login`, `/api/auth/register`
- **DATABASE:** `auth.users`, `public.profiles`
- **BUSINESS RULES:** 
  - Şifre en az 6 karakter olmalıdır.
  - Kayıt esnasında `profiles` tablosuna varsayılan `role = 'owner'` atanır.
- **EVENTS:** `user_signed_up`, `user_logged_in`
- **NOTIFICATIONS:** Hoş geldin e-postası (Varsa).
- **PERMISSIONS:** Public / Anonymous.
- **EDGE CASES:** 
  - E-posta adresinin zaten kayıtlı olması.
  - Zayıf internet bağlantısı nedeniyle auth timeout.
- **ERRORS:** `AuthApiError: Invalid login credentials` -> Inline kırmızı hata mesajı.
- **ANALYTICS:** `auth_login_success`, `auth_register_failed`
- **DEPENDENCIES:** Supabase Auth SDK.
- **TEST COVERAGE:** `tests/auth.test.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** `BiometricLogin` bileşeninin `ssr: false` ile yüklenirken skeleton olmaması sebebiyle CLS (Layout Shift) yaratması (`bug_report_login.md` line 10).
- **IMPROVEMENT OPPORTUNITIES:** Skeleton wrapper eklenerek CLS tamamen sıfırlanabilir.
- **EVIDENCE RATING:** `CONFIRMED` — `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/lib/auth/`

---

### FEAT-IAM-002: Family Sharing & Multi-Owner Management
- **ID:** `FEAT-IAM-002`
- **NAME:** Co-Owner & Caregiver Invite System
- **DOMAIN:** `IAM & User Identity Domain`
- **USER PROBLEM:** Aile bireylerinin veya evcil hayvan bakıcılarının aynı pet verilerine erişip aşı ve beslenme takibi yapamaması.
- **USER VALUE:** Tek bir pet profiline birden fazla yetkili kullanıcı bağlayarak ortak bakım sorumluluğu oluşturma.
- **ENTRY POINT:** `/owner/pets/[id]` -> Family Tab (`src/components/pets/FamilyTab.tsx`), Davet Bağlantısı (`/invite/[token]`, `/caregiver/[token]`)
- **PRECONDITIONS:** Kullanıcının ilgili pet üzerinde `primary_owner` veya `co_owner` rolüne sahip olması.
- **FLOW:** 
  1. Ana sahip `FamilyTab` üzerinden e-posta veya telefon ile davet bağlantısı üretir.
  2. Sistem benzersiz bir davet token'ı oluşturur (`pet_memberships` / `invites`).
  3. Davet edilen kişi `/invite/[token]` adresine tıklar.
  4. Davet kabul edildiğinde veritabanında `pet_owners` veya `pet_memberships` tablosuna rol kaydedilir.
- **UI:** Davet modalları (`PendingInviteModal.tsx`, `TransferPrimaryOwnerModal.tsx`), üye listesi satırları.
- **STATE:** `idle`, `generating_link`, `invite_pending`, `accepted`, `revoked`.
- **DATA:** `pet_id`, `invited_email`, `role` (`co_owner` | `caregiver`), `token`, `expires_at`.
- **API:** `/api/pets/[id]/invite`, `/api/invite/accept`
- **DATABASE:** `public.pet_owners`, `public.pet_memberships`
- **BUSINESS RULES:** 
  - Yalnızca `primary_owner` sahiplik devri (`TransferPrimaryOwner`) yapabilir.
  - Bakıcı (`caregiver`) rolü tıbbi veri ekleyebilir fakat pet profilini silemez.
- **EVENTS:** `family_member_invited`, `invite_accepted`
- **NOTIFICATIONS:** Uygulama içi notification + Push: "X petine erişim daveti aldınız."
- **PERMISSIONS:** Primary Owner, Co-Owner.
- **EDGE CASES:** Davet linkinin süresinin dolması (24-72 saat), petin silinmiş olması.
- **ERRORS:** `INVALID_INVITE_TOKEN`, `ALREADY_MEMBER`.
- **ANALYTICS:** `family_invite_sent`, `family_invite_accepted`
- **DEPENDENCIES:** FEAT-PET-001 (Pet Core).
- **TEST COVERAGE:** `tests/family.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Caregiver hesaplarında RLS politikalarının bazı legacy endpoint'lerde tam denetlenmemesi.
- **IMPROVEMENT OPPORTUNITIES:** QR kod ile anında yakından eşleşme (Quick Caregiver QR).
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/pets/family/`, `src/app/invite/[token]/page.tsx`

---

## 2. Pet Core Domain

### FEAT-PET-001: Progressive Pet Profile Creation & Onboarding
- **ID:** `FEAT-PET-001`
- **NAME:** Pet Add & Onboarding Wizard
- **DOMAIN:** `Pet Core Domain`
- **USER PROBLEM:** Uzun ve sıkıcı kayıt formları yüzünden kullanıcıların terk etmesi.
- **USER VALUE:** 30 saniyede pet adı, türü ve yaşını girerek anında sisteme başlama (Progressive Profiling).
- **ENTRY POINT:** `/owner/pets/add` (`src/app/owner/pets/add/page.tsx`), Onboarding Wizard (`src/components/onboarding/OnboardingWizard.tsx`)
- **PRECONDITIONS:** Authenticated User.
- **FLOW:** 
  1. Adım 1: Tür Seçimi (Kedi / Köpek).
  2. Adım 2: İsim ve Cinsiyet (Erkek / Dişi).
  3. Adım 3: Doğum Tarihi / Tahmini Yaş & Kısırlaştırma Statüsü.
  4. Adım 4: Irk Seçimi (`BreedCombobox`) & Başlangıç Kilosu.
  5. Kaydet butonuna basılır -> Kanonik `createPet` servisi çağrılır.
- **UI:** Multi-step wizard layout (`WizardShell`), `StepChip`, `StepDate`, `StepNumber`, `PetAvatar` önizlemesi.
- **STATE:** `step_1`, `step_2`, `step_3`, `step_4`, `saving`, `success`.
- **DATA:** `name`, `species` (`cat` | `dog`), `gender`, `birth_date`, `is_neutered`, `breed_id`, `weight_kg`.
- **API:** `/api/pets` (POST)
- **DATABASE:** `public.pets`, `public.pet_owners`, `public.weight_logs`
- **BUSINESS RULES:** 
  - Tür strictly `'cat'` veya `'dog'` olmalıdır (`pets_species_check`).
  - Yaş Skalası Mantığı: 0-1 Yaş (Yavru), 1-7 Yaş (Yetişkin), 7-12 Yaş (Yaşlı), 12+ Yaş (Yaşlı 12+).
  - Pet ekleme anında otomatik aşı protokol motoru (`vaccination-algorithm.ts`) tetiklenir.
- **EVENTS:** `pet_created`, `initial_protocol_triggered`
- **NOTIFICATIONS:** "Tebrikler! [Pet İsim] başarıyla kaydedildi."
- **PERMISSIONS:** Authenticated Owner.
- **EDGE CASES:** Doğum tarihinin gelecek bir tarih girilmesi (Validasyon engeller).
- **ERRORS:** `INVALID_SPECIES`, `MISSING_REQUIRED_FIELDS`.
- **ANALYTICS:** `pet_add_started`, `pet_add_step_completed`, `pet_add_finished`
- **DEPENDENCIES:** Supabase Database, Vaccination Algorithm v2.
- **TEST COVERAGE:** `tests/pet-creation.test.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** Irk aramasında yavaşlık ve internet kesintisinde adımların kaybolması.
- **IMPROVEMENT OPPORTUNITIES:** LocalStorage draft saklama (Offline Draft Wizard).
- **EVIDENCE RATING:** `CONFIRMED` — `src/app/owner/pets/add/page.tsx`, `AGENTS.md` (Yaş Skalası Kuralı)

---

### FEAT-PET-002: Pet Profile Hub & Digital Identity Card
- **ID:** `FEAT-PET-002`
- **NAME:** Pet Detail Dashboard & Digital Passport
- **DOMAIN:** `Pet Core Domain`
- **USER PROBLEM:** Evcil hayvanın tüm sağlık, bakım, beslenme ve kimlik verilerini tek bir ekranda görememe.
- **USER VALUE:** Dijital Pet Kartı (Hero Card), Biyometrik Metrikler, İnsan Yaşı Karşılığı ve Sağlık Karnesi sekmeleri.
- **ENTRY POINT:** `/owner/pets/[id]` (`src/app/owner/pets/[id]/page.tsx`)
- **PRECONDITIONS:** Pet ID sahibi veya yetkilisi olmak.
- **FLOW:** 
  1. Kullanıcı pet kartına veya navigasyondan petine tıklar.
  2. `PetDetailClient` yüklenir; Pet Hero Card (Kilitli Bölge), Sekmeler (Sağlık, Bakım, Beslenme, Bütçe, Aile, Raporlar) görüntülenir.
  3. Sekmeler arası geçiş yapılır.
- **UI:** Glassmorphic Hero Card, `HumanAgeCalculator`, `MinimalGrowthChart`, `WeightGoalBand`, `AllergyManager`, Sekme çubuğu.
- **STATE:** `loading`, `data_loaded`, `active_tab_changed`, `error`.
- **DATA:** `pet` nesnesi, `weight_logs`, `health_summary`, `vaccine_records`.
- **API:** `/api/pets/[id]`
- **DATABASE:** `public.pets`, `public.weight_logs`, `public.health_diseases`
- **BUSINESS RULES:** 
  - `PetHeroCard.tsx` ve `PetDetailClient.tsx` kapak alanı KİLİTLİ BÖLGEDİR (Kullanıcı Tufan onayı olmadan değiştirilemez).
  - İnsan yaşı hesabı tür bazında özel katsayılar ile yapılır.
- **EVENTS:** `pet_profile_viewed`, `tab_switched`
- **NOTIFICATIONS:** Eksik profil bilgisi uyarısı (SmartCardBanner).
- **PERMISSIONS:** Primary Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Fotoğrafı yüklenmemiş petler için cins/tür ikonlu avatar placeholder gösterilir.
- **ERRORS:** `PET_NOT_FOUND` (404 Error State).
- **ANALYTICS:** `pet_detail_view`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `e2e/pet-detail.spec.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** "Profili Düzenle" ikonunun 32x32px boyutunda olması (44x44px dokunma kuralı ihlali — `bug_report_pet_detail.md` line 17).
- **IMPROVEMENT OPPORTUNITIES:** İkon hitbox genişletilmesi.
- **EVIDENCE RATING:** `CONFIRMED` — `src/app/owner/pets/[id]/PetHeroCard.tsx`, `AGENTS.md`

---

## 3. Preventive Health Domain (Vaccine & Parasite)

### FEAT-VAC-001: Automatic Vaccine Protocol Engine v2
- **ID:** `FEAT-VAC-001`
- **NAME:** Auto Vaccine Schedule Generator v2
- **DOMAIN:** `Preventive Health Domain`
- **USER PROBLEM:** Hangi aşının ne zaman yaptırılacağını, doz aralıklarını ve yavru/yetişkin kurallarını bilmeme.
- **USER VALUE:** Petin türü, yaşı ve geçmiş kayıtlarına göre WSAVA uyumlu otomatik aşı takvimi üretimi.
- **ENTRY POINT:** Pet ekleme anında otomatik veya `/owner/pets/[id]/vaccines` -> Plan Oluştur.
- **PRECONDITIONS:** Petin tür, cinsiyet ve doğum tarihi verilerinin mevcut olması.
- **FLOW:** 
  1. `vaccination-algorithm.ts` çalışır.
  2. `vaccine_templates` tablosundaki WSAVA kuralları okunur.
  3. Yavru kedi/köpek için 21 gün aralıklı 3 doz karma + 1 doz Kuduz kuralı hesaplanır.
  4. Gelecek tarihler için `vaccine_records_v2` tablosuna `status = 'planned'` olarak görevler yazılır.
- **UI:** `VaccinesClient.tsx`, Aşı Zaman Çizelgesi kartları, `TimelineChip`.
- **STATE:** `calculating`, `plan_generated`, `records_created`.
- **DATA:** `pet_id`, `template_id`, `dose_number`, `due_date`, `status`.
- **API:** `/api/vaccines/generate-plan`
- **DATABASE:** `public.vaccine_templates`, `public.vaccine_records_v2`
- **BUSINESS RULES:** 
  - Sağlık verileri KESİNLİKLE silinemez, hard delete yasaktır (`is_archived = true`).
  - Karma aşılar (DHPP / Cat Trio) tekrarlayan doz aralığına tabidir.
- **EVENTS:** `vaccine_plan_generated`, `vaccine_due_soon`
- **NOTIFICATIONS:** Aşıya 7 gün ve 1 gün kala otomatik Push Bildirim gönderilir.
- **PERMISSIONS:** Primary Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Erken yaptırılan veya geciken aşıların bir sonraki dozu kaydırması.
- **ERRORS:** `ALGORITHM_EXECUTION_FAILED`.
- **ANALYTICS:** `vaccine_plan_auto_created`
- **DEPENDENCIES:** `src/lib/vaccines/vaccination-algorithm.ts`
- **TEST COVERAGE:** `src/lib/health-tracker/lib/__tests__/expired-recurring-missed.test.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** Kuduz (`legal_required`) aşısının algoritma tarafından otomatik plana dahil edilmemesi boşluğu (`ODIPET_AUDIT_CURRENT.md` line 5). Karma aşıların 3 ayrı görev kartı üretmesi.
- **IMPROVEMENT OPPORTUNITIES:** Kuduz aşısı kuralının `legal_required` kontrolüne bağlanması.
- **EVIDENCE RATING:** `CONFIRMED` — `src/lib/vaccines/vaccination-algorithm.ts`, `ODIPET_AUDIT_CURRENT.md`

---

### FEAT-VAC-002: Internal & External Parasite Tracker
- **ID:** `FEAT-VAC-002`
- **NAME:** Parasite Prevention & Refill Protocol
- **DOMAIN:** `Preventive Health Domain`
- **USER PROBLEM:** İç ve dış parazit damla/hap uygulamalarının (genellikle 2-3 ayda bir) unutulması.
- **USER VALUE:** Parazit uygulama zamanlayıcısı, otomatik tekrarlama mantığı ve parazit planı tamamlama modalı.
- **ENTRY POINT:** `/owner/pets/[id]/parasite` (`src/app/owner/pets/[id]/parasite/page.tsx`)
- **PRECONDITIONS:** Pet seçimi.
- **FLOW:** 
  1. Kullanıcı iç veya dış parazit uygulamasını kaydeder (Tarih + İlaç/Marka Adı).
  2. Tekrarlama periyodu seçilir (örn. 60 gün).
  3. Tamamlama anında `ParasitePlanCompletionModal` açılır ve gelecek dönem için otomatik hatırlatıcı kurulur.
- **UI:** `ParasitePlanCompletionModal.tsx`, Parazit durumu rozeti (Tamamlandı / Yaklaşıyor / Gecikti).
- **STATE:** `up_to_date`, `due_soon`, `overdue`.
- **DATA:** `pet_id`, `parasite_type` (`internal` | `external` | `combined`), `application_date`, `next_due_date`.
- **API:** `/api/health/parasites`
- **DATABASE:** `public.parasite_records`, `public.parasite_protocols`
- **BUSINESS RULES:** 
  - Parazit geçmişi kanonik tablodan okunur; hard delete yapılmaz.
- **EVENTS:** `parasite_logged`, `parasite_overdue`
- **NOTIFICATIONS:** "İç/Dış parazit zamanı geldi!" Push ve In-App uyarısı.
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** İç ve dış parazitin aynı gün farklı ilaçlarla yapılması.
- **ERRORS:** `INVALID_DATE`.
- **ANALYTICS:** `parasite_record_created`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `tests/parasite.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Buton dokunma alanlarının 44px altında kalması.
- **IMPROVEMENT OPPORTUNITIES:** Parazit hapı/damlası fotoğraf tespiti (OCR).
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/pets/ParasitePlanCompletionModal.tsx`

---

## 4. General Medical & Health History Domain

### FEAT-MED-001: Medical History & Illness/Allergy Manager
- **ID:** `FEAT-MED-001`
- **NAME:** Medical History Wizard, Disease & Allergy Tracker
- **DOMAIN:** `General Medical & Health History Domain`
- **USER PROBLEM:** Evcil hayvanın kronik rahatsızlıkları, alerjileri ve geçirdiği ameliyatların acil durumlarda hatırlanamaması.
- **USER VALUE:** Tüm tıbbi geçmişin, alerji listesinin ve aktif ilaçların dijital ortamda düzenli tutulması.
- **ENTRY POINT:** `/owner/pets/[id]/health-history`, `/owner/pets/[id]/treatments`
- **PRECONDITIONS:** Pet sahibi olmak.
- **FLOW:** 
  1. Kullanıcı "Hastalık/Alerji Ekle" butonuna basar.
  2. `AllergyManager` veya `MedicationManager` bileşeni açılır.
  3. Teşhis tarihi, ciddiyet derecesi (Hafif/Orta/Şiddetli) ve doktor notu girilir.
  4. Kanonik `health_diseases` / `health_allergies` tablolarına kaydedilir.
- **UI:** `HealthHistoryWizard.tsx`, `AllergyManager.tsx`, `MedicationManager.tsx`, `TreatmentsClient.tsx`.
- **STATE:** `viewing`, `adding`, `saving`, `archived`.
- **DATA:** `disease_name`, `diagnosis_date`, `allergen`, `severity`, `is_active`.
- **API:** `/api/health/diseases`, `/api/health/allergies`
- **DATABASE:** `public.health_diseases`, `public.health_allergies`, `public.health_medications`
- **BUSINESS RULES:** 
  - Tıbbi geçmiş verileri silinemez, pasife alınır (`is_active = false` veya `is_archived = true`).
- **EVENTS:** `medical_record_added`
- **NOTIFICATIONS:** Alerjik reaksiyon uyarı çipi.
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** İlaç kullanım süresinin bitmesi durumunda otomatik arşivlenme.
- **ERRORS:** `SAVE_FAILED`.
- **ANALYTICS:** `medical_history_updated`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `tests/medical.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** `TreatmentsClient` üzerindeki "Yeni Sağlık Planı Ekle" butonunun `py-2` ile ~36px kalarak 44px dokunma standardının altında kalması (`bug_report_medical.md` line 19).
- **IMPROVEMENT OPPORTUNITIES:** Minimum height zorlaması (`min-h-[50px]`).
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/pets/AllergyManager.tsx`, `src/components/pets/MedicationManager.tsx`

---

## 5. Nutrition & Weight Management Domain

### FEAT-NUT-001: Nutrition, Portion & Refill Stock Tracking
- **ID:** `FEAT-NUT-001`
- **NAME:** Nutrition Plan & Smart Food Refill Engine
- **DOMAIN:** `Nutrition & Weight Management Domain`
- **USER PROBLEM:** Mamanın ne zaman biteceğini hesaplayamama ve son dakika mamasız kalma stresi.
- **USER VALUE:** Günlük porsiyon takibi, pakette kalan mama stoğu geri sayımı ve otomatik bitiş tahmini (`StockTimeline`).
- **ENTRY POINT:** `/owner/pets/[id]/nutrition` (`src/app/owner/pets/[id]/nutrition/page.tsx`)
- **PRECONDITIONS:** Pet kaydı ve mama tanımı.
- **FLOW:** 
  1. Kullanıcı mama markasını, paket gramajını ve günlük verilen porsiyonu (gr/gün) tanımlar.
  2. Stok motoru (`StockTimeline`) günlük tüketimi stoktan düşer.
  3. Stok %20'nin altına düştüğünde sipariş verme hatırlatıcı kartı ve bildirimi tetiklenir.
- **UI:** `NutritionClient.tsx`, `StockTimeline.tsx`, porsiyon Stepper / Slider bileşeni.
- **STATE:** `sufficient_stock`, `low_stock`, `out_of_stock`.
- **DATA:** `brand_name`, `package_weight_kg`, `daily_portion_grams`, `start_date`, `estimated_end_date`.
- **API:** `/api/nutrition/assignments`
- **DATABASE:** `public.pet_food_assignments`, `public.food_brands`
- **BUSINESS RULES:** 
  - Kedi ve köpek porsiyon tavsiyeleri yaş ve kiloya göre AI tarafından ayarlanabilir.
- **EVENTS:** `food_assigned`, `food_stock_low`
- **NOTIFICATIONS:** "Mamanız bitmek üzere! 3 günlük stok kaldı."
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Birden fazla petin aynı mamayı tüketmesi.
- **ERRORS:** `INVALID_PORTION`.
- **ANALYTICS:** `nutrition_plan_created`, `stock_refill_clicked`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `tests/nutrition.test.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** Tab menüsü sekmelerinin `py-2.5` ile ~40px kalarak dokunma kuralını ihlal etmesi (`bug_report_pet_detail.md` line 20).
- **IMPROVEMENT OPPORTUNITIES:** Barkod OCR ile mamayı anında tanıma.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/nutrition/StockTimeline.tsx`, `NutritionClient.tsx`

---

### FEAT-NUT-002: Weight Tracking & Goal Band Chart
- **ID:** `FEAT-NUT-002`
- **NAME:** Weight Progress & Target Band Calculator
- **DOMAIN:** `Nutrition & Weight Management Domain`
- **USER PROBLEM:** Aşırı kilo alımı/kaybının fark edilememesi ve ideal kilo aralığının bilinmemesi.
- **USER VALUE:** Grafik üzerinde kilo değişimi, ideal hedef bandı (`WeightGoalBand`) ve kilo değişim uyarısı.
- **ENTRY POINT:** Pet Detay -> Sağlık Sekmesi veya `/owner/pets/[id]/nutrition`
- **PRECONDITIONS:** En az 1 kilo kaydı.
- **FLOW:** 
  1. Kullanıcı tartım sonucunu girer (kg).
  2. `WeightChangeChart` ve `WeightGoalBand` bileşenleri yeni veriyi çizer.
  3. İdeal kilonun dışına çıkıldığında veteriner tavsiye rozeti gösterilir.
- **UI:** `WeightChangeChart.tsx`, `WeightGoalBand.tsx`, `RulerPicker.tsx`.
- **STATE:** `normal_weight`, `underweight`, `overweight`.
- **DATA:** `pet_id`, `weight_kg`, `measured_at`.
- **API:** `/api/pets/[id]/weight`
- **DATABASE:** `public.weight_logs`
- **BUSINESS RULES:** 
  - Kilo ölçümleri zaman serisi olarak saklanır; geçmiş ölçüm silinemez.
- **EVENTS:** `weight_logged`, `weight_alert_triggered`
- **NOTIFICATIONS:** Aylık kilo ölçüm hatırlatması (`SmartMonthlyGrowthPrompt`).
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Hatalı aşırı yüksek kilo girişi (örn. 500 kg -> validasyon kuralı).
- **ERRORS:** `OUT_OF_RANGE_WEIGHT`.
- **ANALYTICS:** `weight_log_added`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `src/components/pets/WeightChangeChart.test.tsx` (`CONFIRMED`)
- **CURRENT ISSUES:** Yok.
- **IMPROVEMENT OPPORTUNITIES:** Akıllı tartı entegrasyonu.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/pets/WeightChangeChart.tsx`, `WeightGoalBand.tsx`

---

## 6. Care & Hygiene Domain

### FEAT-CAR-001: Routine Care & Grooming Management
- **ID:** `FEAT-CAR-001`
- **NAME:** Care & Hygiene Scheduler
- **DOMAIN:** `Care & Hygiene Domain`
- **USER PROBLEM:** Banyo, tırnak kesimi, kulak temizliği ve tarama gibi rutin bakım işlemlerinin aksatılması.
- **USER VALUE:** Bakım takvimi, tekrarlayan görev oluşturma ve bakım geçmişi kaydı.
- **ENTRY POINT:** `/owner/pets/[id]/care` (`src/app/owner/pets/[id]/care/page.tsx`)
- **PRECONDITIONS:** Pet seçimi.
- **FLOW:** 
  1. Kullanıcı bakım kategorisi seçer (Banyo / Tırnak / Kulak / Diş).
  2. Tekrarlama periyodu belirlenir (örn. Her 2 haftada bir).
  3. Bakım günü geldiğinde ajandaya ve dashboard'a görev düşer.
- **UI:** `CareClient.tsx`, Kategori ikonlu bakım kartları, tamamlama checkbox'ları.
- **STATE:** `scheduled`, `completed`, `overdue`.
- **DATA:** `care_type`, `frequency_days`, `last_performed_at`, `next_due_date`.
- **API:** `/api/care/plans`
- **DATABASE:** `public.care_plans`, `public.care_events`
- **BUSINESS RULES:** 
  - Bakım tamamlandığında yeni `next_due_date` otomatik hesaplanır.
- **EVENTS:** `care_task_completed`
- **NOTIFICATIONS:** Bakım zamanı uyarısı.
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Erken yapılan bakımın periyodu sıfırlaması.
- **ERRORS:** `CARE_SAVE_ERROR`.
- **ANALYTICS:** `care_task_logged`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `tests/care.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Yok.
- **IMPROVEMENT OPPORTUNITIES:** Kuaför / Groomer randevu entegrasyonu.
- **EVIDENCE RATING:** `CONFIRMED` — `CareClient.tsx`

---

## 7. Planning & Agenda Domain (Plan Yap)

### FEAT-PLN-001: Central Planning & Calendar Engine (Plan Yap & Takvim)
- **ID:** `FEAT-PLN-001`
- **NAME:** Dynamic Plan Builder & Agenda Orchestrator
- **DOMAIN:** `Planning & Agenda Domain`
- **USER PROBLEM:** Aşı, bakım, ilaç ve beslenme görevlerinin dağınık olması ve haftalık/aylık ajandanın bir arada görülememesi.
- **USER VALUE:** Tek noktadan özel rutin planlama (`/owner/plan-yap`), birleşik takvim ajandası (`/owner/takvim`).
- **ENTRY POINT:** `/owner/plan-yap`, `/owner/takvim` (`src/app/owner/takvim/TakvimClient.tsx`)
- **PRECONDITIONS:** Authenticated User.
- **FLOW:** 
  1. Kullanıcı "Plan Yap" sihirbazından kategori ve sıklık seçer veya Ajanda sayfasını açar.
  2. Sistem tüm kanonik tablolardan (Aşı, Parazit, İlaç, Bakım, Beslenme) gelen görevleri `TakvimClient` üzerinde tarihe göre birleştirir (Read-Only Aggregation).
  3. Kullanıcı göreve tıklayarak tamamlandı işaretler.
- **UI:** Interaktif Takvim Görünümü (`TakvimClient`), `SmartTaskWizard`, `DeletePlanConfirmationModal`.
- **STATE:** `calendar_view`, `day_selected`, `task_completing`.
- **DATA:** `schedule_id`, `category`, `due_date`, `is_completed`, `source_entity_id`.
- **API:** `/api/plans`, `/api/calendar/events`
- **DATABASE:** `public.health_schedules`, `public.plans`, `public.plan_occurrences`
- **BUSINESS RULES:** 
  - Takvim katmanı VERİ ÜRETMEZ veya kanonik veriyi bozmaz (Read-Only Aggregation — Cilt 5 & 6 kuralı).
- **EVENTS:** `plan_created`, `task_marked_done`
- **NOTIFICATIONS:** Günlük ajanda özeti bildirimi.
- **PERMISSIONS:** Owner, Co-Owner, Caregiver.
- **EDGE CASES:** Tamamlanan görevin geri alınması (Uncheck).
- **ERRORS:** `PLAN_UPDATE_FAILED`.
- **ANALYTICS:** `calendar_viewed`, `task_completed`
- **DEPENDENCIES:** Tüm Sağlık ve Bakım Modülleri.
- **TEST COVERAGE:** `tests/takvim.test.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** Silme modalındaki onay aksiyonunun bazen çift tetiklenmesi.
- **IMPROVEMENT OPPORTUNITIES:** Google Calendar / Apple iCal senkronizasyon dışa aktarımı (.ics).
- **EVIDENCE RATING:** `CONFIRMED` — `src/app/owner/takvim/TakvimClient.tsx`, `src/app/owner/plan-yap/page.tsx`

---

## 8. Notifications & Engine Domain

### FEAT-NOT-001: Multi-Channel Web Push & Cron Engine
- **ID:** `FEAT-NOT-001`
- **NAME:** Automated Push Notification & Reminder Engine
- **DOMAIN:** `Notification & Engine Domain`
- **USER PROBLEM:** Uygulama kapalıyken kritik aşı veya ilaç zamanlarının kaçırılması.
- **USER VALUE:** Web Push (VAPID) ve uygulama içi anlık bildirimler, kişiselleştirilmiş hatırlatma saatleri.
- **ENTRY POINT:** `/owner/notifications`, Profil -> Bildirim Ayarları (`NotificationSettings.tsx`)
- **PRECONDITIONS:** Tarayıcı push izninin verilmiş olması.
- **FLOW:** 
  1. `PushNotificationPrompt` kullanıcının karşısına çıkar.
  2. İzin alındığında VAPID subscription veritabanına (`device_push_subscriptions`) kaydedilir.
  3. Arka plan cron işi (`src/lib/cron/`) geciken veya yaklaşan görevleri tarar.
  4. Web Push API aracılığıyla kullanıcının cihazına bildirim gönderilir.
- **UI:** `NotificationsClient.tsx`, `PushNotificationPrompt.tsx`, Bildirim ayarları anahtarları.
- **STATE:** `permission_default`, `permission_granted`, `permission_denied`.
- **DATA:** `subscription_endpoint`, `keys_p256dh`, `keys_auth`, `user_id`.
- **API:** `/api/notifications/subscribe`, `/api/cron/send-reminders`
- **DATABASE:** `public.notifications`, `public.device_push_subscriptions`
- **BUSINESS RULES:** 
  - Gece saatlerinde (22:00 - 08:00) acil durum hariç rahatsız etmeme modu (DND) uygulanabilir.
- **EVENTS:** `push_permission_granted`, `notification_dispatched`
- **NOTIFICATIONS:** Push & In-App Notification.
- **PERMISSIONS:** All User Roles.
- **EDGE CASES:** Kullanıcının tarayıcı ayarlarından bildirimleri sonradan engellemesi.
- **ERRORS:** `PUSH_DISPATCH_FAILED` (Expired subscription cleanup).
- **ANALYTICS:** `push_opt_in_rate`, `notification_clicked`
- **DEPENDENCIES:** VAPID Keys, Service Worker (`sw.js`).
- **TEST COVERAGE:** `tests/notifications.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Yok.
- **IMPROVEMENT OPPORTUNITIES:** SMS ve WhatsApp API entegrasyonu.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/notifications/PushNotificationPrompt.tsx`, `src/app/owner/notifications/NotificationsClient.tsx`

---

## 9. AI & Document Intelligence Domain

### FEAT-AI-001: AI Vet Assistant & OCR Document Scanner
- **ID:** `FEAT-AI-001`
- **NAME:** AI Veterinary Assistant & Smart Scanner (Gemini Powered)
- **DOMAIN:** `AI & Document Intelligence Domain`
- **USER PROBLEM:** Veteriner raporları ve aşı karnelerindeki karmaşık terimleri anlamama ve elle girmede zorlanma.
- **USER VALUE:** Aşı karnesi fotoğrafından otomatik veri çıkarma (OCR), 7/24 AI Veteriner Danışmanı (`/owner/ai-vet`).
- **ENTRY POINT:** `/owner/ai-vet`, `SmartScanner.tsx` (Kamera/Dosya yükleme)
- **PRECONDITIONS:** Fotoğraf erişim izni.
- **FLOW:** 
  1. Kullanıcı aşı karnesi fotoğrafını çeker veya yükler (`SmartScanner`).
  2. OCR motoru (Gemini Vision) resmi analiz eder.
  3. Çıkarılan aşı adı ve tarih verileri "Review & Confirm Modal" ile kullanıcıya sunulur (Human-in-the-Loop).
  4. Kullanıcı onayladığında kanonik tabloya yazılır.
- **UI:** `/owner/ai-vet` Sohbet Ekranı, `SmartScanner.tsx`, Mor Yıldız (`Sparkles`) AI ikonu, Taslak İnceleme Modalı.
- **STATE:** `capturing`, `processing_ocr`, `reviewing_draft`, `confirmed`.
- **DATA:** `image_base64`, `extracted_json`, `confidence_score`, `medical_disclaimer_accepted`.
- **API:** `/api/ai/vet-chat`, `/api/ai/ocr-scan`
- **DATABASE:** `public.content_generation_jobs`
- **BUSINESS RULES:** 
  - AI YÖNETİŞİMİ KURALI (Cilt 13): AI Habersiz Veri Kaydı Yapamaz! Kullanıcı onayı şarttır.
  - Mor Yıldız (`Sparkles`) ve Mor renk teması AI içeriklerinde zorunludur.
  - Tıbbi Sorumluluk Reddi (Medical Disclaimer) gösterilmesi zorunludur.
- **EVENTS:** `ocr_scan_completed`, `ai_chat_query`
- **NOTIFICATIONS:** "Aşı taramanız hazır! Lütfen verileri kontrol edin."
- **PERMISSIONS:** Authenticated Users.
- **EDGE CASES:** Bulanık veya okunamayan aşı karnesi fotoğrafı (%70 altı güven skoru uyarısı).
- **ERRORS:** `OCR_PARSING_ERROR`.
- **ANALYTICS:** `ocr_scans_total`, `ai_vet_messages_sent`
- **DEPENDENCIES:** Google Gemini API.
- **TEST COVERAGE:** `ux_audit_report_ai_vet.md` (`CONFIRMED`)
- **CURRENT ISSUES:** `SmartScanner` kamera container'ının `h-[480px]` sabit yüksekliği sebebiyle küçük mobil ekranlarda taşma yapması (`bug_report_journal.md` line 25).
- **IMPROVEMENT OPPORTUNITIES:** Dynamic aspect ratio (`max-h-[60vh]`).
- **EVIDENCE RATING:** `CONFIRMED` — `src/app/owner/ai-vet/page.tsx`, `src/components/ui/SmartScanner.tsx`, `AGENTS.md` (Cilt 13)

---

## 10. Reproductive & Estrus Domain

### FEAT-REP-001: Estrus Cycle & Reproductive Forecast Tracker
- **ID:** `FEAT-REP-001`
- **NAME:** Female Pet Estrus & Reproductive Health Cycle Tracker
- **DOMAIN:** `Reproductive & Estrus Domain`
- **USER PROBLEM:** Dişi kedi ve köpeklerde kızgınlık dönemlerinin takip edilememesi, eşleşme zamanının kaçırılması veya istenmeyen gebelikler.
- **USER VALUE:** Tahmini kızgınlık dönemi takvimi, semptom gözlem formu ve üreme tahmini kartı (`ReproductiveForecastCard`).
- **ENTRY POINT:** Pet Detay -> Ekstra / Kızgınlık Sekmesi (`src/components/estrus-tracker/EstrusTracker.tsx`)
- **PRECONDITIONS:** Dişi ve kısırlaştırılmamış pet sahibi olmak.
- **FLOW:** 
  1. Kullanıcı son kızgınlık başlangıç tarihini ve semptomları girer (`EstrusObservationForm`).
  2. Tahmin motoru (`useReproductiveForecast.ts`) tür kuralına göre (Kedi ~14-21 gün, Köpek ~6 ay) gelecek dönemi hesaplar.
  3. `ForecastConfidenceBadge` ile güven skoru gösterilir.
- **UI:** `EstrusTracker.tsx`, `ReproductiveForecastCard.tsx`, `EstrusObservationForm.tsx`, `EstrusPreferencesToggle.tsx`.
- **STATE:** `normal_phase`, `approaching_estrus`, `active_estrus`, `post_estrus`.
- **DATA:** `cycle_start_date`, `cycle_end_date`, `symptoms_array`, `confidence_level`.
- **API:** `/api/estrus/cycles`
- **DATABASE:** `public.pet_estrus_cycles`
- **BUSINESS RULES:** 
  - Kısırlaştırılmış (`is_neutered = true`) dişi petlerde modül otomatik gizlenir.
- **EVENTS:** `estrus_logged`, `estrus_forecast_updated`
- **NOTIFICATIONS:** "Kızgınlık dönemi yaklaşıyor!" uyarısı.
- **PERMISSIONS:** Owner, Co-Owner.
- **EDGE CASES:** Düzensiz döngü süreleri.
- **ERRORS:** `INVALID_CYCLE_DATES`.
- **ANALYTICS:** `estrus_cycle_recorded`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `test-estrus-db.js`, `test_estrus_notifications.ts` (`CONFIRMED`)
- **CURRENT ISSUES:** Yok.
- **IMPROVEMENT OPPORTUNITIES:** Veteriner sitoloji testi yükleme alanı.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/estrus-tracker/EstrusTracker.tsx`, `docs/estrus-module-final-status.md`

---

## 11. Social, SOS & Services Domain

### FEAT-SOC-001: SOS Lost Pet Emergency Beacon & Wizard
- **ID:** `FEAT-SOC-001`
- **NAME:** 7/24 Emergency Lost Pet Report & Beacon System
- **DOMAIN:** `Social, SOS & Services Domain`
- **USER PROBLEM:** Evcil hayvan kaybolduğunda hızlıca dijital ve konum tabanlı ilan oluşturup çevredeki kullanıcılara duyuramama.
- **USER VALUE:** 1 dakikada kayıp ilanı sihirbazı (`LostPetWizard`), harita üzerinde son görülme konumu ve SMS/Sosyal paylaşım kartı.
- **ENTRY POINT:** `/owner/lost-report` (`src/app/owner/lost-report/page.tsx`), Public SOS Sayfası (`/sos/[id]`)
- **PRECONDITIONS:** Pet kaydı.
- **FLOW:** 
  1. Kullanıcı kaybolma tarihini, son görüldüğü adresi/harita konumunu ve ödül miktarını girer (`WizardForm`).
  2. İlan yayınlanır -> Çevredeki kullanıcılara SOS acil durum push bildirimi tetiklenir.
  3. Kamusal QR/Web bağlantısı (`/sos/[id]`) ile herkes detayları ve sahibinin iletişim butonunu görür.
- **UI:** `LostPetWizard.tsx`, `LocationForm.tsx`, `OTPVerification.tsx`, `OfficialRegistrationModal.tsx`, `LostMapView.tsx`.
- **STATE:** `draft`, `verifying_otp`, `active_sos`, `resolved_found`.
- **DATA:** `pet_id`, `last_seen_lat`, `last_seen_lng`, `last_seen_address`, `reward_amount`, `contact_phone`, `is_active`.
- **API:** `/api/lost-reports`, `/api/lost-reports/sos`
- **DATABASE:** `public.lost_reports`
- **BUSINESS RULES:** 
  - İlan oluştururken OTP doğrulaması istenebilir.
  - Pet bulunduğunda ilan "Bulundu" statüsüne çekilip arşive alınır.
- **EVENTS:** `lost_report_published`, `sos_alert_broadcasted`, `pet_found`
- **NOTIFICATIONS:** Yarıçap bazlı SOS Acil Push Bildirimi.
- **PERMISSIONS:** Public View, Owner Management.
- **EDGE CASES:** Asılsız ilan bildirimi (Kullanıcı raporlama mekanizması).
- **ERRORS:** `GEOCODING_FAILED`.
- **ANALYTICS:** `lost_report_created`, `sos_viewed`
- **DEPENDENCIES:** Google Maps / Leaflet Map Engine.
- **TEST COVERAGE:** `tests/lost-pet.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Çip numarası zorunluluğunun formda isteğe bağlı bırakılması.
- **IMPROVEMENT OPPORTUNITIES:** Otomatik afiş (PDF) oluşturucu.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/pets/LostPetWizard.tsx`, `src/app/owner/lost-report/page.tsx`, `src/app/sos/[id]/page.tsx`

---

### FEAT-SOC-002: Social Marketplace, Adoption & Breeding Feed
- **ID:** `FEAT-SOC-002`
- **NAME:** Pet Community Marketplace & Adoption Hub
- **DOMAIN:** `Social, SOS & Services Domain`
- **USER PROBLEM:** Güvenilir sahiplendirme veya eş bulma platformlarının eksikliği.
- **USER VALUE:** Doğrulanmış sahiplendirme ilanları (`AdoptionFeedCard`), eş bulma başvuruları ve topluluk akışı.
- **ENTRY POINT:** `/owner/social` (`src/app/owner/social/page.tsx`), Pet Detay -> Eşleşme Sekmesi (`/owner/pets/[id]/match`)
- **PRECONDITIONS:** Authenticated User.
- **FLOW:** 
  1. Kullanıcı Sosyal sekmesine girer.
  2. Sahiplendirme, Eşleşme veya Kayıp kartları arasında geçiş yapar (`SocialTabs`).
  3. Başvuru yap butonuna tıklar -> `CreateListingPetSelectorModal` açılır.
- **UI:** `SocialTabs.tsx`, `AdoptionFeedCard.tsx`, `BreedingFeedCard.tsx`, `AdoptionApplicationsManager.tsx`.
- **STATE:** `feed_loading`, `filtering`, `application_submitted`.
- **DATA:** `listing_type` (`adoption` | `breeding`), `pet_id`, `description`, `status`.
- **API:** `/api/social/listings`, `/api/social/applications`
- **DATABASE:** `public.breeding_listings`, `public.breeding_applications`, `public.social_posts`
- **BUSINESS RULES:** 
  - Ücretli satış yasaktır; yalnızca yasal sahiplendirme ve eşleşme ilanlarına izin verilir.
- **EVENTS:** `listing_created`, `application_sent`
- **NOTIFICATIONS:** "İlanınıza yeni bir başvuru geldi!"
- **PERMISSIONS:** Authenticated Users.
- **EDGE CASES:** İlan sahibinin kendi ilanına başvurması (Engellenir).
- **ERRORS:** `LISTING_NOT_FOUND`.
- **ANALYTICS:** `social_feed_viewed`, `social_application_created`
- **DEPENDENCIES:** FEAT-PET-001.
- **TEST COVERAGE:** `ux_audit_report_social_extra.md` (`CONFIRMED`)
- **CURRENT ISSUES:** "Ana Sayfaya Dön" linkinin dokunma alanının 44px altında kalması (`bug_report_social_extra.md` line 30).
- **IMPROVEMENT OPPORTUNITIES:** İlan filtreleme seçeneklerinin zenginleştirilmesi.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/social/`, `src/app/owner/social/page.tsx`

---

## 12. Admin & Experience Orchestrator Domain

### FEAT-ADM-001: Dynamic Experience Engine & Feature Registry
- **ID:** `FEAT-ADM-001`
- **NAME:** Admin Orchestrator, Feature Flags & Profiling Rules
- **DOMAIN:** `Admin & Experience Orchestrator Domain`
- **USER PROBLEM:** Uygulamadaki yeni özelliklerin tüm kullanıcılara bir anda açılması veya A/B testlerinin yönetilememesi.
- **USER VALUE:** Yönetici panelinden dinamik modül açma/kapama, akıllı anket kuralları (`DynamicExperienceEngine`).
- **ENTRY POINT:** `/admin/features`, `/admin/orchestrator` (`src/app/admin/orchestrator/page.tsx`)
- **PRECONDITIONS:** Admin Rolüne sahip olmak (`role = 'admin'`).
- **FLOW:** 
  1. Admin panel üzerinden bir bayrak (Feature Flag) güncellenir.
  2. `DynamicExperienceEngine` istemci tarafında kuralı anında uygular (Canlı modül güncellemesi).
  3. Profilleme pop-up'ları (`SmartQuestionCard`) soru yorgunluğu kotalarını denetler.
- **UI:** Admin Dashboard panelleri, Feature Toggle listeleri, Orchestrator kural kartları.
- **STATE:** `enabled`, `disabled`, `gradual_rollout`.
- **DATA:** `feature_key`, `is_enabled`, `rules_json`, `target_user_percentage`.
- **API:** `/api/admin/features`, `/api/orchestrator/eval`
- **DATABASE:** `public.feature_registry`, `public.experience_rules`, `public.user_survey_stats`
- **BUSINESS RULES:** 
  - Kritik güvenlik bayrakları admin onayı olmadan değiştirilemez.
  - Soru yorgunluğu (Ad-Fatigue) kuralları kullanıcıyı günde max 1 soru ile sınırlar.
- **EVENTS:** `feature_flag_toggled`, `orchestrator_rule_updated`
- **NOTIFICATIONS:** Yok.
- **PERMISSIONS:** Strictly Admin Only.
- **EDGE CASES:** Ağ hatası durumunda istemcinin varsayılan bayrak değerlerine düşmesi (Fallback).
- **ERRORS:** `UNAUTHORIZED_ADMIN_ACCESS` (403 Forbidden).
- **ANALYTICS:** `feature_eval_executed`
- **DEPENDENCIES:** Supabase RLS Policy (`role = 'admin'`).
- **TEST COVERAGE:** `tests/admin.test.ts` (`HIGH CONFIDENCE`)
- **CURRENT ISSUES:** Yok.
- **IMPROVEMENT OPPORTUNITIES:** Real-time WebSocket bayrak yayınlama.
- **EVIDENCE RATING:** `CONFIRMED` — `src/components/orchestrator/DynamicExperienceEngine.tsx`, `src/app/admin/orchestrator/page.tsx`
