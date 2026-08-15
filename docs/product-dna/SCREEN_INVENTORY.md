# Odi Pet - Screen Inventory & Route Map

> **Doküman Tipi:** Production Screen & Route Inventory  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kapsam:** Tüm Sayfalar (Owner, Clinic, Groomer, Hotel, Trainer, Admin, SOS, Auth, Legal, Invite)  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`

---

## 1. Authentication & Identity Screens

### SCR-AUTH-001: Login Screen
- **SCREEN:** Login Screen
- **ROUTE:** `/login` (`src/app/login/page.tsx`)
- **PURPOSE:** Kullanıcının e-posta/şifre, biyometrik giriş veya OAuth ile oturum açması.
- **ENTRY:** Başlangıç rotası, Çıkış Yap butonu, Yetkisiz sayfa yönlendirmesi.
- **EXIT:** Form gönderimi -> `/owner/dashboard` veya Onboarding Gate.
- **LAYOUT:** Minimal Auth Container (No BottomNav / No Sidebar).
- **HEADER:** Minimal Odi Pet Logosu + Slogan.
- **NAVIGATION:** Yok.
- **PRIMARY CTA:** "Giriş Yap" (`btn-primary`, h-[50px]).
- **SECONDARY CTA:** "Şifremi Unuttum", "Kayıt Ol", Biyometrik Giriş (`BiometricLogin`).
- **DATA:** Form local state (`email`, `password`), Supabase Auth Client.
- **COMPONENTS:** `Input`, `Button`, `BiometricLogin` (dynamic import).
- **STATES:** `loading` (`loading.tsx`), inline error ("Hatalı şifre"), success (redirect).
- **MODALS / SHEETS:** Yok.
- **RESPONSIVE:** 375px - 1024px ortalanmış kart (max-w-md).
- **ACCESSIBILITY:** Touch target 44px+ (Şifre göster butonunda 32px sorunu tespiti — `bug_report_login.md`).
- **DEPENDENCIES:** Supabase Auth SDK.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/login/page.tsx`

---

### SCR-AUTH-002: User Registration Screen
- **SCREEN:** User Registration Screen
- **ROUTE:** `/register` (`src/app/register/page.tsx`)
- **PURPOSE:** Yeni bireysel pet sahibi hesabı oluşturulması.
- **ENTRY:** Login sayfasındaki "Kayıt Ol" linki.
- **EXIT:** Form kaydı -> `/owner/pets/add` (Onboarding).
- **LAYOUT:** Minimal Auth Container.
- **HEADER:** "Odi Pet'e Hoş Geldiniz" başlığı.
- **NAVIGATION:** Yok.
- **PRIMARY CTA:** "Hesap Oluştur" (`btn-primary`, h-[50px]).
- **SECONDARY CTA:** "Zaten hesabınız var mı? Giriş Yap", "Kurumsal Kayıt".
- **DATA:** `email`, `password`, `full_name`.
- **COMPONENTS:** `FormField`, `Input`, `Button`, `Checkbox` (KVKK & Şartlar).
- **STATES:** `loading` (`loading.tsx`), error ("Bu e-posta zaten kullanımda").
- **MODALS / SHEETS:** KVKK / Kullanım Şartları Modal (`src/app/legal/kvkk/page.tsx`).
- **RESPONSIVE:** Mobil uyumlu duyarlı form.
- **ACCESSIBILITY:** Form input aria-describedby etiketleri.
- **DEPENDENCIES:** Supabase Auth Service.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/register/page.tsx`

---

## 2. Owner Core & Dashboard Screens

### SCR-OWN-001: Main Owner Dashboard
- **SCREEN:** Pet Owner Dashboard
- **ROUTE:** `/owner/dashboard` (`src/app/owner/dashboard/page.tsx`, `DashboardClient.tsx`)
- **PURPOSE:** Tüm petlerin durumunu, yaklaşan görevleri ve hızlı sağlık metriklerini gösteren ana kumanda merkezi.
- **ENTRY:** Başarılı giriş sonrası varsayılan rota, BottomNav "Anasayfa" sekmesi.
- **EXIT:** Pet kartına tıklama -> `/owner/pets/[id]`, Görev ekle -> `/owner/plan-yap`.
- **LAYOUT:** `owner/layout.tsx` (BottomNav Mobil / Sidebar Desktop).
- **HEADER:** Karşılama Başlığı + Profil Avatarı + Bildirim Çanı.
- **NAVIGATION:** BottomNav (`BottomNav.tsx`) / Sidebar.
- **PRIMARY CTA:** "İlk Can Dostunu Ekle" (Boş durumda) / "Görev Ekle" FAB.
- **SECONDARY CTA:** Quick Journal Widget, Social Shortcuts, Pet Slider.
- **DATA:** Server Queries (`dashboard-queries.ts`), Client State, `pets`, `health_schedules`, `weight_logs`.
- **COMPONENTS:** `PetSlider`, `DashboardSmartCards`, `QuickJournalWidget`, `PetRecommendationsCard`, `EmptyState`.
- **STATES:** `loading` (`loading.tsx`), empty (`EmptyDashboard`), error (`error.tsx`), populated.
- **MODALS / SHEETS:** `OnboardingWizard` (İlk girişte), `LogbookSheet` (Hızlı not ekle).
- **RESPONSIVE:** Mobil (Tek sütun) -> Masaüstü (3 sütunlu grid).
- **ACCESSIBILITY:** BottomNav Safe Area (`pb-safe`) desteği tam.
- **DEPENDENCIES:** Auth Session, En az 1 pet kaydı (yoksa EmptyState gösterir).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/dashboard/DashboardClient.tsx`

---

### SCR-OWN-002: Pet Detail Hub & Digital Passport
- **SCREEN:** Pet Profile & Health Hub
- **ROUTE:** `/owner/pets/[id]` (`src/app/owner/pets/[id]/page.tsx`, `PetDetailClient.tsx`)
- **PURPOSE:** Seçili evcil hayvanın tüm dijital karne verilerinin, sekmelerinin ve hero kartının görüntülenmesi.
- **ENTRY:** Dashboard Pet Slider, Pet Listesi (`/owner/pets`).
- **EXIT:** Profili Düzenle -> `/owner/pets/[id]/edit`, Aşılar -> `/owner/pets/[id]/vaccines`.
- **LAYOUT:** `owner/layout.tsx`.
- **HEADER:** `SmartBackButton` + Pet İsim Başlığı + Düzenle İkonu.
- **NAVIGATION:** BottomNav / Sidebar.
- **PRIMARY CTA:** "Aşı / Sağlık Ekle" Hızlı Buton.
- **SECONDARY CTA:** Sekme Değiştiricileri (Sağlık, Bakım, Beslenme, Bütçe, Aile, Raporlar).
- **DATA:** `pet` nesnesi, `weight_logs`, `diseases`, `allergies`, `vaccine_records`.
- **COMPONENTS:** `PetHeroCard` (KİLİTLİ BÖLGE), `HumanAgeCalculator`, `MinimalGrowthChart`, `WeightGoalBand`, `AllergyManager`, `HealthTab`, `CareTab`, `FamilyTab`.
- **STATES:** `loading` (`loading.tsx`), error (404 Pet Bulunamadı).
- **MODALS / SHEETS:** `PendingInviteModal`, `TransferPrimaryOwnerModal`, `ParasitePlanCompletionModal`.
- **RESPONSIVE:** Mobil (Dikey sıralı sekmeler) -> Masaüstü (Genişletilmiş grid).
- **ACCESSIBILITY:** "Profili Düzenle" ikonunda 32px hitbox uyarısı (`bug_report_pet_detail.md`).
- **DEPENDENCIES:** Geçerli `pet_id` parametresi ve sahiplik yetkisi.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/[id]/PetHeroCard.tsx`, `PetDetailClient.tsx`

---

### SCR-OWN-003: Add Pet Wizard
- **SCREEN:** Add Pet Wizard
- **ROUTE:** `/owner/pets/add` (`src/app/owner/pets/add/page.tsx`)
- **PURPOSE:** Yeni bir evcil hayvanın 4 adımlı sihirbaz ile sisteme eklenmesi.
- **ENTRY:** Dashboard "Pet Ekle" butonu, Profil "Yeni Pet Ekle".
- **EXIT:** Tamamlama -> `/owner/pets/add/success`.
- **LAYOUT:** `WizardShell` (Header + Stepper + Progress Bar).
- **HEADER:** Geri Buton + Stepper İlerleme Adımı (%25, %50, %75, %100).
- **NAVIGATION:** Gizli (Wizard odaklı görünüm).
- **PRIMARY CTA:** "Devam Et" / "Kaydı Tamamla" (`btn-primary`, h-[50px]).
- **SECONDARY CTA:** "Önceki Adım".
- **DATA:** Wizard Form State (`step_1` to `step_4`), `BreedCombobox` API verisi.
- **COMPONENTS:** `WizardShell`, `StepChip`, `StepDate`, `StepNumber`, `StepText`, `BreedCombobox`, `RulerPicker`.
- **STATES:** `step_active`, `submitting`, `error`.
- **MODALS / SHEETS:** Yok.
- **RESPONSIVE:** Mobil odaklı dikey adım tasarımı.
- **ACCESSIBILITY:** Klavyeyle adımlar arası geçiş (Tab key).
- **DEPENDENCIES:** Auth Session.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/add/page.tsx`

---

## 3. Preventive Health & Medical Screens

### SCR-MED-001: Vaccines & Protocols Screen
- **SCREEN:** Vaccines Management
- **ROUTE:** `/owner/pets/[id]/vaccines` (`src/app/owner/pets/[id]/vaccines/page.tsx`, `VaccinesClient.tsx`)
- **PURPOSE:** Aşı geçmişinin, otomatik planlanan aşıların gösterimi ve yeni aşı ekleme.
- **ENTRY:** Pet Detay -> Sağlık Sekmesi -> "Aşılar".
- **EXIT:** Manuel Ekle Modal, AI OCR Tara -> `SmartScanner`.
- **LAYOUT:** `owner/layout.tsx`.
- **HEADER:** Geri Buton + "Aşılar ve Protokoller".
- **NAVIGATION:** BottomNav.
- **PRIMARY CTA:** "Aşı Karnesi Tara (AI OCR)" / "Manuel Aşı Ekle".
- **SECONDARY CTA:** "Takvim Görünümüne Geç".
- **DATA:** `vaccine_records_v2`, `vaccine_templates`.
- **COMPONENTS:** `VaccinesClient`, `TimelineChip`, `VaccineScanner`, `SmartScanner`, `Badge`.
- **STATES:** `loading`, `empty` ("Henüz aşı kaydı yok"), `error`.
- **MODALS / SHEETS:** Manuel Aşı Kayıt Modalı, AI Review & Confirm Modalı.
- **RESPONSIVE:** Mobil kart listesi -> Masaüstü tablo/kart grid.
- **ACCESSIBILITY:** "Manuel İşlem" butonunda 40px hitbox uyarısı (`bug_report_medical.md`).
- **DEPENDENCIES:** Pet ID context.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/[id]/vaccines/page.tsx`

---

### SCR-MED-002: Treatments & Health Plans
- **SCREEN:** Treatments & Medical Care Plans
- **ROUTE:** `/owner/pets/[id]/treatments` (`src/app/owner/pets/[id]/treatments/page.tsx`, `TreatmentsClient.tsx`)
- **PURPOSE:** Aktif tedavi planları, operasyonlar ve klinik reçetelerin takibi.
- **ENTRY:** Pet Detay -> Sağlık Sekmesi.
- **EXIT:** Geri -> Pet Detay.
- **LAYOUT:** `owner/layout.tsx`.
- **HEADER:** Geri Buton + "Tedaviler ve Sağlık Planları".
- **NAVIGATION:** BottomNav.
- **PRIMARY CTA:** "Yeni Sağlık Planı Ekle".
- **SECONDARY CTA:** "Geçmiş Tedaviler Arşivi".
- **DATA:** `health_medications`, `health_reports`.
- **COMPONENTS:** `TreatmentsClient`, `ListRow`, `StatusBanner`, `Badge`.
- **STATES:** `loading` (`loading.tsx`), `error` (`error.tsx`), `populated`.
- **MODALS / SHEETS:** Yeni Tedavi Ekleme Modalı.
- **RESPONSIVE:** Mobil uyumlu liste.
- **ACCESSIBILITY:** "Yeni Sağlık Planı Ekle" butonunda 36px hitbox uyarısı (`bug_report_medical.md`).
- **DEPENDENCIES:** Pet ID context.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/[id]/treatments/TreatmentsClient.tsx`

---

## 4. Nutrition & Care Screens

### SCR-NUT-001: Nutrition & Stock Management
- **SCREEN:** Nutrition & Food Refill Tracker
- **ROUTE:** `/owner/pets/[id]/nutrition` (`src/app/owner/pets/[id]/nutrition/page.tsx`, `NutritionClient.tsx`)
- **PURPOSE:** Mama markası tanımı, günlük porsiyon ve stok yenileme takibi.
- **ENTRY:** Pet Detay -> Beslenme Sekmesi.
- **EXIT:** Mama Değiştir -> Form Modal.
- **LAYOUT:** `owner/layout.tsx`.
- **HEADER:** Geri Buton + "Beslenme ve Mama Stoğu".
- **NAVIGATION:** BottomNav.
- **PRIMARY CTA:** "Mama Paketini Yenile / Ekle".
- **SECONDARY CTA:** Porsiyon Hesaplama Sihirbazı.
- **DATA:** `pet_food_assignments`, `food_brands`, `weight_logs`.
- **COMPONENTS:** `NutritionClient`, `StockTimeline`, `WeightGoalBand`, `StepperInput`.
- **STATES:** `loading` (`loading.tsx`), `sufficient_stock`, `low_stock_warning`.
- **MODALS / SHEETS:** Mama Tanımlama Modalı.
- **RESPONSIVE:** Stok çubuğu ve porsiyon istatistik kartları.
- **ACCESSIBILITY:** Tab menüsünde ~40px dokunma alanı uyarısı (`bug_report_pet_detail.md`).
- **DEPENDENCIES:** Pet ID context.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/pets/[id]/nutrition/NutritionClient.tsx`

---

## 5. Planning & Calendar Screens

### SCR-PLN-001: Calendar & Agenda (Takvim)
- **SCREEN:** Agenda & Integrated Calendar
- **ROUTE:** `/owner/takvim` (`src/app/owner/takvim/page.tsx`, `TakvimClient.tsx`)
- **PURPOSE:** Tüm petlerin aşı, parazit, ilaç, banyo ve mama görevlerinin tarihe göre entegre ajandası (Read-Only Aggregation).
- **ENTRY:** BottomNav "Takvim" sekmesi.
- **EXIT:** Göreve Tıkla -> Detay Pop-up / Tamamla.
- **LAYOUT:** `owner/layout.tsx`.
- **HEADER:** "Sağlık ve Bakım Ajandası" + Ay/Hafta Görünüm Anahtarı.
- **NAVIGATION:** BottomNav.
- **PRIMARY CTA:** "Yeni Görev / Plan Yap".
- **SECONDARY CTA:** Bugün Butonu, Filtreleme Çipleri.
- **DATA:** Read-Only Aggregation (`health_schedules`, `plans`, `plan_occurrences`).
- **COMPONENTS:** `TakvimClient`, `TimelineChip`, `CategoryGrid`, `DeletePlanConfirmationModal`.
- **STATES:** `loading`, `empty_day`, `task_completing`.
- **MODALS / SHEETS:** `DeletePlanConfirmationModal`, `VaccineSelectorSheet`, `LogbookSheet`.
- **RESPONSIVE:** Mobil takvim şeridi (Horizontal Swipe) -> Masaüstü Tam Ay Grid.
- **ACCESSIBILITY:** Dokunmatik takvim gün hücreleri (min 44x44px).
- **DEPENDENCIES:** Auth Session.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/takvim/TakvimClient.tsx`

---

## 6. AI & Emergency Screens

### SCR-AI-001: AI Vet Consultation Screen
- **SCREEN:** AI Veterinary Assistant Chat
- **ROUTE:** `/owner/ai-vet` (`src/app/owner/ai-vet/page.tsx`)
- **PURPOSE:** 7/24 AI Veteriner danışmanı ile mesajlaşma ve semptom/sağlık analizi.
- **ENTRY:** Navigasyon "AI Vet", Dashboard Smart Card.
- **EXIT:** Geri -> Dashboard.
- **LAYOUT:** `owner/layout.tsx` (Chat view container).
- **HEADER:** Geri Buton + Mor Yıldız (`Sparkles`) + "AI Veteriner Asistanı".
- **NAVIGATION:** BottomNav.
- **PRIMARY CTA:** "Gönder" (`btn-primary`).
- **SECONDARY CTA:** Hızlı Soru Çipleri (Quick Prompts).
- **DATA:** Chat History State, Gemini API Integration.
- **COMPONENTS:** `Sparkles` icon, Chat Bubble, Follow-up Chips, Medical Disclaimer Banner.
- **STATES:** `idle`, `thinking` (AI Typing Indicator), `error` (`error.tsx`).
- **MODALS / SHEETS:** AI Tavsiye Ajandaya Ekle Onay Modalı.
- **RESPONSIVE:** Mobil klavye açıldığında `env(safe-area-inset-bottom)` koruması var.
- **ACCESSIBILITY:** Header geri butonunda 40px hitbox uyarısı (`bug_report_social_extra.md`).
- **DEPENDENCIES:** Gemini API Key.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/ai-vet/page.tsx`

---

### SCR-SOS-001: Lost Pet Emergency Wizard & Public Beacon
- **SCREEN:** Lost Pet Emergency Wizard & SOS Page
- **ROUTE:** `/owner/lost-report` (`src/app/owner/lost-report/page.tsx`), `/sos/[id]` (`src/app/sos/[id]/page.tsx`)
- **PURPOSE:** Kayıp pet ilanı oluşturma ve kamuya açık acil durum SOS sayfasının gösterimi.
- **ENTRY:** Dashboard SOS Butonu, QR Kod Taraması, Sosyal Paylaşım Linki.
- **EXIT:** İlanı Tamamla / Bulundu İşaretle.
- **LAYOUT:** Public SOS Layout (Kırmızı-Turuncu acil durum başlığı).
- **HEADER:** "ACİL KAYIP İLANI" + SOS İkonu.
- **NAVIGATION:** Yok (Kriz durum odaklı görünüm).
- **PRIMARY CTA:** "Sahibini Ara" / "Harita Konumunu Gönder".
- **SECONDARY CTA:** "İlanı Paylaş (WhatsApp/Social)".
- **DATA:** `lost_reports` tablosu.
- **COMPONENTS:** `LostPetWizard`, `LocationForm`, `PhotoUpload`, `OTPVerification`, `LostMapView`.
- **STATES:** `loading`, `active_sos`, `resolved_found`.
- **MODALS / SHEETS:** `OfficialRegistrationModal`.
- **RESPONSIVE:** Mobil cihazlarda harita ve arama butonu sticky footer.
- **ACCESSIBILITY:** Yüksek kontrastlı acil durum metinleri (WCAG AA).
- **DEPENDENCIES:** Location Service (GPS).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/owner/lost-report/page.tsx`, `src/app/sos/[id]/page.tsx`

---

## 7. Admin & System Management Screens

### SCR-ADM-001: Admin Master Dashboard & Orchestrator
- **SCREEN:** Admin Orchestrator & Feature Registry
- **ROUTE:** `/admin`, `/admin/orchestrator` (`src/app/admin/orchestrator/page.tsx`)
- **PURPOSE:** Sistem metriklerinin, dinamik modül bayraklarının (Feature Flags) ve kullanıcıların yönetimi.
- **ENTRY:** `/admin` doğrudan erişim (Admin oturumu gerekli).
- **EXIT:** Admin alt modülleri (`/admin/users`, `/admin/features`, `/admin/health`).
- **LAYOUT:** Admin Sidebar Layout.
- **HEADER:** "Odi Pet Admin - System Orchestrator".
- **NAVIGATION:** Admin Sol Sidebar.
- **PRIMARY CTA:** "Feature Flag Kaydet" / "Kural Güncelle".
- **SECONDARY CTA:** Veri Kalitesi & Funnel Analizi Linkleri.
- **DATA:** `feature_registry`, `experience_rules`, `profiles`, `pets`.
- **COMPONENTS:** Admin Data Tables, Toggle Switches, System Health Widgets.
- **STATES:** `loading`, `updating`, `access_denied` (Non-admin 403).
- **MODALS / SHEETS:** Flag Düzenleme Modalı.
- **RESPONSIVE:** Masaüstü odaklı geniş veri tabloları (1024px+).
- **ACCESSIBILITY:** Keyboard accessible table rows & toggles.
- **DEPENDENCIES:** Admin Role (`role = 'admin'`).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/app/admin/orchestrator/page.tsx`, `src/app/admin/features/page.tsx`
