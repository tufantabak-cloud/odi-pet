# Odi.Pet Proje Yol Haritası (Roadmap) & PRD

## 🚀 Yayın Öncesi (Pre-launch) - KRİTİK EKSİKLER
- [ ] **Google Maps API Key Alınması:** Google Cloud üzerinden Places API key alınarak `.env.local` dosyasına eklenecek. (Backend ve Frontend altyapısı kodlandı, sadece API Key bekliyor).
  - Canlı puanlama (ratings) ve yorumlar.
  - Fotoğraflar ve anlık açılış/kapanış saatleri.
  - Mesafe bazlı Google Navigasyon entegrasyonu.
  - *Not: Bu görev asla iptal edilmeyecek, yayın öncesi final aşamasıdır.*

## ✅ Tamamlanan Çekirdek Özellikler (Premium MVP)

### 🐾 Evcil Hayvan & Sağlık Yönetimi (Core Ecosystem)
- [x] **Sağlık ve Aşı Sistemi (Vaccine OS):** Aşı/parazit alias sistemi, otomatik matris takibi ve akıllı hatırlatıcılar.
- [x] **Tedavi Takibi:** İlaç, dozaj, süre ve hastalık kayıtları, çoklu ilaç yönetimi.
- [x] **Gelişim (Kilo & Boy) Takibi:** Sağlık geçmişine entegre veri girişi ve grafiksel raporlama.
- [x] **Acil Durum (SOS):** Pet bazlı özel JSONB entegrasyonu ile 2 acil durum kişisi atama.
- [x] **Beslenme ve Bakım:** Temel stok, mama markası ve bakım rutinleri takibi.
- [x] **Progressive Profiling:** Mikroçip, kayıt numarası vb. bilgilerin kullanıcıyı yormadan adım adım toplanması.

### 🏥 Veteriner Rehberi (v1)
- [x] **Statik Veritabanı:** Türkiye genelindeki ~4.500 kliniğin sisteme aktarılması.
- [x] **Hibrit Arama:** GPS bazlı yakınlık arama ve manuel Şehir/İlçe filtreleme.
- [x] **Sağlık Merkezi Entegrasyonu:** Sağlık dashboard'undan doğrudan erişim.

### ⚙️ Altyapı ve Güvenlik
- [x] **Kimlik Doğrulama:** Google OAuth entegrasyonu ve güvenli kayıt akışı.
- [x] **RBAC & Veritabanı:** Admin rolleri yönetimi, Supabase RPC fonksiyonları ve RLS korumaları.
- [x] **CI/CD & DevOps:** Vercel üzerine hatasız dağıtım (Next.js konfigürasyonları).
- [x] **Tasarım Sistemi:** Yeni marka kimliği, premium arayüz ve pürüzsüz UX.

## 🗂 Backlog

## Vaccine Record Architecture Refactor — P0 Completed ✅

- Brand/protocol separation (vaccine_name = protocol, brand_id = product)
- Private vaccine-documents bucket (signed URLs, RLS protected)
- DB-level brand validation trigger (brand must match vaccine_code)
- administration_route structured dropdown
- valid_until date capture
- Normalized brand input (brand_id OR free_text, never both)

### Remaining (P1):
- UI click-through test (4 scenarios)
- Edit/update akışı yeni alanlarla test edilmeli
- Delete → Storage dosyası da silinmeli
- Mobile UX validation
- vaccine_code string matching → vaccine_protocol_id FK (gelecek sprint)

### Sprint B — Aşı Karnesi Tarama Entegrasyonu — Tamamlandı ✅
**Amaç:** Akıllı Tarama (OCR, `/api/scan-document`, Gemini Vision — çalışıyor) şu an `vaccine_card` sonuçlarını `vaccine_records_v2` yerine `health_treatments` tablosuna yazıyor ([ScannerClient.tsx](src/app/owner/scanner/ScannerClient.tsx)). Bu, P0/P1'de kurulan aşı mimarisinden (brand_id, vaccine_protocols trigger'ı, plan eşleştirme) tamamen kopuk. Not: Akıllı Tarama'nın kendisi (OCR) çalışıyor ve "yakında" değil — sadece kayıt hedefi yanlış tabloya gidiyor.

İlk işler:
1. `ScannerClient.tsx`'teki `record_type === 'vaccine_card'` dalını `/api/pets/{id}/treatments` yerine `vaccine_records_v2` insert'ine yönlendir.
2. OCR'dan gelen `brand` alanını `vaccine_brands`'te ara; bulunamazsa `brand_free_text`'e yaz.
3. `vaccine_code` OCR'dan çıkmıyorsa `CUSTOM` fallback'i kullan.
4. P0-2 trigger'ının (brand/vaccine_code uyumu) bu yeni akışı da kapsadığını test et.

### Sprint B.1 — Taranan Aşı Belgesi Saklama — Tamamlandı ✅
- Taranan görüntüyü vaccine-documents bucket'ına yükle
- document_storage_path alanına yaz
- Kayıt silinince belge yaşam döngüsünü yönet
- Yalnızca pet sahibi erişimi (RLS)
- Yükleme başarısız olunca kayıt politikası

**Teknik Not:** vaccine_protocols'ta category kolonu yok — ileride farklı protokol türleri eklenirse VaccineSelectorSheet picker'ı gereğinden fazla kayıt gösterebilir.

## Sprint B.2 — Orphan Scanner Document Cleanup
- 24 saatten eski + vaccine_records_v2'de referansı olmayan
  vaccine-documents dosyalarını temizle
- Vercel cron job veya Supabase scheduled function
- Cleanup logu (kaç dosya silindi, toplam boyut)
- Prod'da run etmeden önce dry-run modu

### Sprint C — Ortak Aşı Kayıt Servisi
**Amaç:** Şu an 3 ayrı, birbirinden habersiz aşı yazma yolu var: `VaccinesClient.tsx` (manuel form), `SmartTaskWizard.tsx` (plan akışı), `ScannerClient.tsx` (OCR, Sprint B sonrası). Her biri kendi brand normalizasyonu / plan eşleştirme mantığını ayrı ayrı tekrarlıyor.

İlk işler:
1. Ortak bir `createVaccineRecord()` servis fonksiyonu çıkar (brand_id/free_text normalizasyonu, plan eşleştirme, insert tek yerde).
2. Üç çağıran noktayı da bu servise yönlendir.
3. Tekrarlanan mantığı sil, tek kaynak kalsın.

### Sprint C.4 — Gerçek Aşı Doz Takvimi Üretimi — Tamamlandı ✅
`vaccine_protocols.doses` JSON'undaki birth/prev_dose zincirini gerçek anlamda okuyan saf bir fonksiyon (`build-vaccination-schedule.ts`) ve bunu kullanan `create-plan` endpoint'i. Yavru/yetişkin ayrımı, mevcut kayda göre kaldığı yerden devam etme, çok dozlu protokoller için toplu/atomik plan insert'i.

### Sprint C.4.1 — Geçmiş Tarihli Dozlar için Overdue Durumu — Tamamlandı ✅
Yavru pet'lerde `birth_date + days_offset` geçmişte kalan ilk doz `active` yerine `overdue` olarak işaretleniyor artık. `plans.status` CHECK kısıtlaması `'overdue'` değerini kabul edecek şekilde genişletildi; duplicate kontrolü ve "aktif plan var" göstergeleri `overdue` durumunu da kapsıyor.

### Sprint C.4.2 — Kısmen Tamamlanmış Seri Düzeltmesi — Tamamlandı ✅
Bir protokolün ilk dozu tamamlanmış ama serinin geri kalanı bitmemişken "Hemen Plan Oluştur" tetiklenince doğrudan yıllık booster'a atlanıyordu. Artık tamamlanan en yüksek `dose_number` protokolün toplam doz sayısıyla karşılaştırılıp seri bitmemişse yalnızca bir sonraki doz üretiliyor.

## Sprint C.5 — Aktif Planların Otomatik Overdue Geçişi — Tamamlandı ✅
`markOverduePlans` (Europe/Istanbul takvim günü baz alınarak, tüm plan kategorileri — sadece 'asi' değil) `orchestratorAgent.ts`'e eklendi, günlük 03:00 orchestrator cron'u üzerinden çalışıyor. Orchestrator endpoint'i fail-closed auth'a çevrildi: `CRON_SECRET` tanımlı değilse 500, yanlış token'da 401. Gerçek veri üzerinde doğrulandı (9 gerçekten geçmiş tarihli 'active' plan doğru şekilde 'overdue'ya çevrildi).

### Sprint C.5.1 — Data Quality Mock İzolasyonu — Tamamlandı ✅
`dataQualityAgent.ts`'teki `runBatchQualityScan`, `writeEvent(null, ...)` çağrısı yüzünden her çalıştığında çöken test/mock kodu içeriyordu — bu da `user_health` adımını da bloke ediyordu. Mock kod kaldırılıp `{status:'disabled', reason:'not_implemented'}` döndüren dürüst bir stub'a çevrildi; orchestrator artık bunu `agents_failed` değil `agents_skipped` olarak işaretliyor. `user_health`'in `data_quality`'e bağımlılığı kaldırıldı — artık her zaman çalışıyor. `writeEvent` tipi `supabase: any`'den `SupabaseClient | null`'a sıkılaştırıldı, `null` gelirse çökmeden erken dönüyor.

### Sprint C.5.2 — Cron Güvenlik Borcu Temizliği (weekly-report, expire-cards) — Tamamlandı ✅
`weekly-report` cron'u (auth'suz + işlevsiz stub) hem `vercel.json`'dan hem gerçek işlevinden emekliye ayrıldı — artık sadece fail-closed auth'lu bir `disabled` yanıtı dönüyor. `expire-cards`'ın gerçek işi (`shared_pet_cards.is_active` pasifleştirme) `expireSharedPetCards()` servisine taşınıp orchestrator'a 5. adım olarak eklendi; eski route fail-closed auth'la `disabled, reason:'moved_to_orchestrator'` dönüyor.

## Cron Teknik Borç (Devam)
- 7 ölü cron route temizliği (vaccine-check, plans, anomaly-detector vb.)
- Data Quality Agent gerçek implementasyonu
- C.5 bildirim üretimi (overdue geçişinde kullanıcıya uyarı)
- C.5 dry-run modu

### Sprint 4.3B — Confidence Level Normalization
**Amaç:** `confidence_level` yazım değerlerini tekilleştirmek. (Sprint 4.3A'da mimariye dokunulmadı, bilinçli olarak ertelendi — bkz. [ODIPET_AUDIT_CURRENT.md](ODIPET_AUDIT_CURRENT.md) Sprint 4.3 analizi.)

İlk işler:
1. Ortak `CONFIDENCE_LEVELS` sabiti oluştur.
2. `'high'` değerini geçerli bir değere çevir ([src/app/api/pets/[id]/vaccines/route.ts](src/app/api/pets/[id]/vaccines/route.ts)).
3. `ConfidenceBadge` gerçekten kullanılacak mı karar ver (şu an [VaccinesClient.tsx](src/app/owner/pets/[id]/vaccines/VaccinesClient.tsx) içinde tanımlı ama hiç render edilmiyor).
4. `vaccine_records_v2` yeni kayıtlarında sadece izinli değerler yazılsın.
5. DB check constraint sonraki aşamada değerlendirilsin.
