```mermaid
flowchart TD
    %% TEMA VE GÖRSEL STİLLER
    classDef mainRoute fill:#4CAF50,stroke:#fff,stroke-width:2px,color:#fff;
    classDef modalStyle fill:#FFF59D,stroke:#FBC02D,stroke-width:2px,color:#000;
    classDef actionStyle fill:#FF5722,stroke:#fff,stroke-width:2px,color:#fff;
    classDef databaseStyle fill:#BBDEFB,stroke:#1976D2,stroke-width:2px,color:#000;
    classDef aiStyle fill:#E040FB,stroke:#fff,stroke-width:2px,color:#fff;
    classDef errorStyle fill:#E53935,stroke:#fff,stroke-width:2px,color:#fff;

    %% ==========================================
    %% 1. ANA GİRİŞ, ROTA KATMANI & ONBOARDING
    %% ==========================================
    subgraph RootLayer [1. Giriş, Rota & İlk Kurulum]
        Start(["Uygulama Giriş Noktası: /"]) --> AuthCheck{Oturum Durumu?}
        
        AuthCheck -->|"Oturum Yok"| Login["Login (/owner/login)"]
        Login -->|"Kayıt Ol"| Register["Register (/register)"]
        Login -->|"Şifremi Unuttum"| ResetPwd["Reset Password (/reset-password)"]
        
        AuthCheck -->|"Oturum Var"| RoleCheck{Kullanıcı Rolü?}
        
        RoleCheck -->|"owner"| OwnerCheck{Evcil Hayvan Var mı?}
        OwnerCheck -->|"Hayır / İlk Giriş"| SpotlightTour["SpotlightTour (OnboardingWizard)"]
        
        SpotlightTour -->|"1. Adım"| SpotlightFAB[+ Butonu Vurgulanır]
        SpotlightFAB -->|"2. Adım"| SpotlightPlan[Plan Yap Vurgulanır]
        SpotlightPlan -->|"Tur Bitti"| PetAddWizard["Pet Ekleme Sihirbazı (/owner/pets/add)"]
        
        PetAddWizard -->|"Adım 1: Tür"| PetType[Kedi / Köpek 3D Kart Seçimi]
        PetType -->|"Adım 2: Kimlik"| PetIdentity[İsim, Irk, Cinsiyet, Doğum Tarihi, Kısırlaştırma, Kilo]
        PetIdentity -->|"Adım 3: Fotoğraf"| PetPhoto[Profil Resmi Seçimi & Önizleme]
        PetPhoto -->|"Adım 4: SOS Ağı"| PetSOSNet[1. Derece Yakın İsim, Telefon, Yakınlık Derecesi]
        PetSOSNet -->|"Başarı"| OwnerDash["Dashboard (/owner/dashboard)"]
        
        RoleCheck -->|"vet"| VetDash["Klinik Dashboard (/clinic/dashboard)"]
        RoleCheck -->|"admin"| AdminCheck{Kliniğe Üye mi?}
        AdminCheck -->|"Evet"| VetDash
        AdminCheck -->|"Hayır"| AdminPan["Admin Paneli (/admin)"]
        RoleCheck -->|"founder"| AdminPan
    end

    %% ==========================================
    %% 2. ANA SEKMELER, PAYWALL & LİMİTLER
    %% ==========================================
    subgraph OwnerInterface [2. Evcil Hayvan Sahibi Arayüzü & Paywall]
        OwnerDash --> Tab1[Sekme 1: Anasayfa]
        OwnerDash --> Tab2[Sekme 2: Hizmetler]
        OwnerDash --> Tab3["Sekme 3: (+) FAB Aksiyon"]
        OwnerDash --> Tab4[Sekme 4: Sosyal]
        OwnerDash --> Tab5[Sekme 5: Profil]

        subgraph PaywallLogic [Abonelik Kontrol Sistemi]
            Tab5 --> Subscription["Abonelik Yönetimi (/owner/profile/subscription)"]
            FamilyTab["FamilyTab (Aile Sekmesi)"] --> PLAN_LIMITS{Plan Slot Sınırı?}
            PLAN_LIMITS -->|"free"| FreeSlot[Max 2 Üye/Bakıcı Slotu]
            PLAN_LIMITS -->|"pro"| ProSlot[Max 5 Üye/Bakıcı Slotu]
            PLAN_LIMITS -->|"ai_plus"| AIPlusSlot[Sınırsız Bakıcı Slotu]
            ReportsTab --> Rep_Check{"POST /api/reports/petId - Plan Kontrolü"}
            Rep_Check -->|"reportRank > userRank"| PaywallModal["Paywall / Yükseltme Ekranı"]
            PaywallModal -->|"Yönlendir"| Subscription
            Subscription -->|"Başarılı / İptal"| ProfilePage["Profil Sayfası (/owner/profile)"]
            ProfilePage -->|"Geri Dön"| PetDetail["Pet Detay (/owner/pets/id)"]
        end

        subgraph Tab1_Details [Anasayfa İçeriği]
            Tab1 --> PetSlider[Pet Slider Kartları] -->|"Tıkla"| PetDetail
            Tab1 --> SmartCards[Smart Cards: Akıllı Hatırlatıcılar]
            Tab1 --> QuickJournal[Pet Günlüğü Hızlı Aksiyon Kartı] -->|"Tıkla +"| LogbookSheet
            Tab1 --> Timeline[Yaklaşan Etkinlikler Timeline] -->|"Tıkla Öğe"| PetTasks["/owner/pets/id#pet-tasks"]
        end

        subgraph Tab3_FAB_Details [Hızlı Aksiyon Menüsü & Süreçleri]
            Tab3 --> FABOverlay[Backdrop-Blur Menü Overlay]
            FABOverlay -->|"Plan Yap"| PlanYap["Plan Yap (/owner/plan-yap)"]
            PlanYap -->|"Adım 1"| PY_Cat{8 Ana Kategori Seçimi}
            PY_Cat -->|"State"| PY_Sub[Adım 2: SubCategoryChips]
            PY_Sub -->|"Dallanma"| PY_Check{Tıbbi veya Parazit mi?}
            PY_Check -->|"Evet"| VaccineSelectorSheet["Adım 3: VaccineSelectorSheet"]
            PY_Check -->|"Hayır"| TaskFormAdvanced["Adım 4: TaskFormAdvanced"]
            VaccineSelectorSheet -->|"Hesapla"| TaskFormAdvanced
            FABOverlay -->|"Durum Kaydet"| LogbookSheet["LogbookSheet Modalı"]
            LogbookSheet -->|"Adım 1"| LG_Type{İştah, Ruh Hali, Beslenme, Aktivite, Genel Not}
            LG_Type -->|"Adım 2"| LG_Forms[Form Alanları]
            LG_Forms -->|"Entegrasyon"| Scanner["Akıllı Tarama (/owner/scanner)"]
            FABOverlay -->|"Akıllı Tarama"| Scanner
            Scanner -->|"Adım 1"| SInput{getUserMedia Başarılı mı?}
            SInput -->|"Hayır"| SFile[fileInputRef Seçici]
            SInput -->|"Evet"| SCrop[Adım 2: Kırpma]
            SCrop -->|"Adım 3"| SAI["POST /api/scan-document"]
            
            SAI -->|"Hata"| S_Error[Adım 3.B: step = error]
            S_Error -->|"Tekrar Dene"| SCrop
            S_Error -->|"Vazgeç"| PetDetail
            S_Error -->|"Günlük"| LG_Forms
            
            SAI -->|"Başarı"| SConfirm[Adım 4: Doğrulama Formu]
        end
    end

    %% ==========================================
    %% 3. PET DETAY SEKMELERİ & SOS SÜREÇLERİ
    %% ==========================================
    subgraph PetDetailZone [3. Evcil Hayvan Detay & İç Aksiyonlar]
        PetDetail --> EnrichPanel[Enrich Panel: Profil Tamamlama Chips]
        EnrichPanel -->|"Tıkla"| QuickUpdateModal[QuickUpdateModal]
        PetDetail --> CategoryTabs{8 Kategori Sekmesi}
        CategoryTabs -->|"1. Sağlık"| HealthTab["Sağlık (/treatments)"]
        CategoryTabs -->|"2. Aşı"| VaccineTab["Aşı (/vaccines)"]
        CategoryTabs -->|"3. Bakım"| CareTab["Bakım (/care)"]
        CategoryTabs -->|"4. Beslenme"| NutritionTab["Beslenme (/nutrition)"]
        CategoryTabs -->|"5. Hijyen"| HygieneTab[Hijyen Sekmesi]
        CategoryTabs -->|"6. Aktivite"| ActivityTab[Aktivite Sekmesi]
        CategoryTabs -->|"7. Veteriner"| VetTab[Veteriner Sekmesi]
        CategoryTabs -->|"8. Diğer"| OtherTab[Diğer Sekmesi]
        PetDetail --> ReportsTab["Raporlar Tab"]
        ReportsTab -->|"1. Derleme"| Rep_Fin[Harcama Hesabı]
        Rep_Fin -->|"2. Seçenek"| Rep_Opt[Rapor Türü]
        Rep_Opt -->|"3. POST"| Rep_Gen[Uyum Skoru Hesabı]
        PetDetail --> FamilyTab
        FamilyTab -->|"Davet"| Invite_Post["POST /api/pets/family"]
        Invite_Post -->|"Link"| Invite_Link["Paylaşım Linki"]
        PetDetail --> FloatingSOS[Floating SOS Butonu]
        FloatingSOS -->|"Kayıp"| LostPetWizard["LostPetWizard Modalı"]
        LostPetWizard -->|"Adım 1"| LP_Contact[Telefon Teyidi]
        LP_Contact -->|"Adım 2"| LP_GPSCheck{Mevcut Konum?}
        LP_GPSCheck -->|"Evet"| LP_OSM[Reverse-Geocoding]
        LP_GPSCheck -->|"Hayır"| LP_Manual[Manuel İl/İlçe]
    end

    %% ==========================================
    %% 4. HARİCİ GELEN DAVET KABUL ROTASI
    %% ==========================================
    subgraph InviteAcceptFlow [4. Davet Kabul Sistemi]
        Invite_Link -->|"Tıkla"| Invite_Get["GET /api/invite/accept"]
        Invite_Get -->|"Kabul"| Invite_Auth{Oturum Açık mı?}
        Invite_Auth -->|"Hayır"| Invite_Login["/login"]
        Invite_Auth -->|"Evet"| Invite_Guards{Fraud Guards Kontrolü}
        
        Invite_Guards -->|"Sahibi / Kendisi"| Invite_Block[İşlem Engellenir]
        Invite_Guards -->|"Üye"| Invite_Redirect[Pet Sayfasına Git]
        Invite_Guards -->|"Temiz"| Invite_Success["INSERT pet_members & Ödül"]
        Invite_Success -->|"Kabul Edildi"| PetDetail
    end

    %% ==========================================
    %% 5. PWA PUSH BİLDİRİM & SESSİZ SAATLER SİSTEMİ
    %% ==========================================
    subgraph PWANotificationSystem [5. PWA Bildirim Altyapısı]
        CronTrigger[["/api/cron Tetiklemesi"]] --> EdgeFunc["Supabase Edge Function"]
        EdgeFunc --> RPC_Gen[generate_schedule_notifications]
        RPC_Gen --> DB_Notif_Write[INSERT notifications]
        
        DB_Notif_Write --> QuietHourCheck{istanbulHour >= 22 VEYA < 8?}
        QuietHourCheck -->|"Evet"| QuietSkip[Gönderimleri Atla]
        QuietHourCheck -->|"Hayır"| PushSend[Web Push Gönder]
        
        QuietSkip -->|"Sabah 08:05"| PushSend
        PushSend --> SW_Receive["Service Worker - push"]
        SW_Receive --> SW_OS[showNotification]
        SW_OS -->|"Tıkla"| SW_Click{Sekme Açık mı?}
        SW_Click -->|"Evet"| SW_Focus[Sekmeye Odaklan]
        SW_Click -->|"Hayır"| SW_NewWindow[Yeni Pencere Aç]
    end

    %% ==========================================
    %% 6. ARKA PLAN DB KAYIT VE REAKSİYON AKIŞLARI
    %% ==========================================
    subgraph DataAndReactionZone [6. Veritabanı Kayıt Akışları]
        TaskFormAdvanced -->|"Submit"| DB_Plan_Check{Mükerrerlik?}
        DB_Plan_Check -->|"Çakışma"| PY_Warn[setError Uyarı Bandı]
        DB_Plan_Check -->|"Planlı"| DB_Plan_Plan[INSERT health_plans]
        DB_Plan_Check -->|"Normal"| DB_Plan_Sched[INSERT health_schedules]
        DB_Plan_Check -->|"Geçmiş"| DB_Plan_Vac[INSERT vaccine_records]
        LG_Forms -->|"Kaydet"| DB_Journal["INSERT pet_journal_entries"]
        DB_Journal -->|"Tetik"| Timeline
        SConfirm -->|"Confirm"| SRoute{Belge Türü?}
        SRoute -->|"Aşı"| DB_Scan_Vac[INSERT health_schedules]
        SRoute -->|"Mama"| DB_Scan_Nut[UPDATE nutrition/profile]
        SRoute -->|"İlaç"| DB_Scan_Med[INSERT health_medications]
        LP_OSM & LP_Manual -->|"POST"| DB_Lost[INSERT lost_reports]
        DB_Lost -->|"Tetikleyici"| FloatingLostBanner["FloatingLostPets Banner"]
        FloatingLostBanner -->|"Göster"| OwnerDash
        OwnerDash -->|"Buldum"| LP_Found["PATCH /api/pets/[id]/lost"]
        LP_Found -->|"Doğrulama"| DB_Found_Update["UPDATE lost_reports status=found"]
        DB_Found_Update -->|"Realtime"| FloatingLostBanner
        QuickUpdateModal -->|"Kaydet"| DB_Quick["POST/PATCH /api/pets/id"]
        DB_Quick -->|"Yenile"| EnrichPanel
        Rep_Gen -->|"Yazdır"| Print_UI["window.print()"]
        Rep_Gen -->|"Kopyala"| Clipboard[Pano URL Kopyalama]
    end

    %% SINIF ATAMALARI
    class Start,OwnerDash,VetDash,PetDetail,Login mainRoute;
    class SpotlightTour,PetAddWizard,PlanYap,LogbookSheet,Scanner,LostPetWizard,QuickUpdateModal,PaywallModal modalStyle;
    class FloatingSOS,SpotlightFAB,SpotlightPlan actionStyle;
    class DB_Plan_Sched,DB_Journal,DB_Scan_Vac,DB_Lost,DB_Quick,DB_Notif_Write,DB_Plan_Plan,DB_Found_Update databaseStyle;
    class SAI,Rep_Gen,RPC_Gen aiStyle;
    class PY_Warn,S_Error,Invite_Block errorStyle;