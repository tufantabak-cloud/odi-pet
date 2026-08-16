# Odi Pet - Empirical Catalog of Verified Current Problems

> **Doküman Tipi:** Verified Bug & UX/UI Problem Catalog  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kaynak:** Forensic Code Audit, Audit Logs, QA Reports, `ODIPET_AUDIT_CURRENT.md`, `bug_report_*.md`  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`

---

## 1. Core Logic & Algorithm Issues

### ERR-MED-001: Rabies (Kuduz) Mandatory Vaccine Automation Gap
- **ID:** `ERR-MED-001`
- **PROBLEM:** Yasal olarak zorunlu Kuduz aşısı (`RABIES`, `RABIES_CAT`) otomatik aşı planlama algoritması tarafından takvime otomatik olarak eklenmiyor.
- **DOMAIN:** `Preventive Health Domain`
- **USER IMPACT:** Evcil hayvan sahibi Kuduz aşısını yaptırdığı halde sistemde otomatik hatırlatma çıkmadığı için aşısını geciktirebilir veya sigorta uygunluk kontrolünden kalabilir.
- **BUSINESS IMPACT:** Yasal aşı uyumsuzluğu ve sigorta poliçesi hesaplamalarında hatalı "Rabies Eksik" skoru üretimi.
- **TECHNICAL IMPACT:** `api/insurance/[petId]/route.ts` içindeki `hasRabiesVaccine` kontrolü tamamlanmış kayıt bulamaz.
- **ROOT CAUSE:** `vaccination-algorithm.ts` dosyası şu an yalnızca `mandatory_level === 'core'` olan aşıları otomatik planlıyor; `legal_required` statüsündeki Kuduz aşısını filtre dışı bırakıyor.
- **EVIDENCE:** `CONFIRMED` — `ODIPET_AUDIT_CURRENT.md` (line 5-7), `src/lib/vaccines/vaccination-algorithm.ts`
- **SEVERITY:** `P1` (High)
- **CURRENT STATUS:** `Identified / Pending Fix`
- **KNOWN FIX:** `vaccination-algorithm.ts` filtresine `mandatory_level === 'core' || mandatory_level === 'legal_required'` veya `is_legal_required === true` şartı eklenmeli.
- **RISK:** Var olan planlarda Kuduz aşısının yinelenerek 2 kez planlanması riski (Idempotency denetimi yapılmalıdır).

---

### ERR-MED-002: Combination Vaccine Multi-Task Duplication (Karma Aşı Görev Çoğaltması)
- **ID:** `ERR-MED-002`
- **PROBLEM:** Tek bir enjeksiyonla yapılan Karma Aşı (DHPP / Cat Trio), sistemde 3 ayrı hastalık kodu (`DOG_CDV`, `DOG_CAV1`, `DOG_CPV`) olarak modellendiği için aynı günde kullanıcının önüne 3 ayrı görev kartı olarak çıkmaktadır.
- **DOMAIN:** `Preventive Health Domain` & `Planning & Agenda Domain`
- **USER IMPACT:** Kullanıcı aynı gün, aynı aşı için 3 ayrı "Aşı Yap" görevi görerek kafa karışıklığı ve sistem karmaşası yaşar.
- **BUSINESS IMPACT:** "Kullanıcının kolay ve anlaşılır hissetmesi" birincil ürün kuralının ihlal edilmesi.
- **TECHNICAL IMPACT:** `vaccine_templates` seviyesinde üst 'Combination Vaccine' grubunun olmaması.
- **ROOT CAUSE:** `vaccine_templates` veritabanı tablosunun tekil hastalık antijenleri bazında modellenmiş olması.
- **EVIDENCE:** `CONFIRMED` — `ODIPET_AUDIT_CURRENT.md` (line 24-27)
- **SEVERITY:** `P2` (Medium)
- **CURRENT STATUS:** `Identified / Workaround Applied`
- **KNOWN FIX:** Veritabanına `combination_vaccine_id` üst grubu eklenerek arayüzde 3 tekil görevin tek bir "Köpek Karma Aşısı (DHPP)" kartında birleştirilmesi (Aggregation).
- **RISK:** Geriye dönük tamamlanmış aşı kayıtlarının gruptan kopması.

---

## 2. UX/UI & Touch Target Violations

### ERR-UX-001: 50px Button Height & Touch Target Violations
- **ID:** `ERR-UX-001`
- **PROBLEM:** Uygulama genelinde bazı butonlar ve sekme elemanları sabit `h-[50px]` yerine padding (`py-2`, `py-2.5`) ile oluşturulduğu için dokunma alanı 32px - 40px seviyesinde kalmakta ve Apple/Google HIG 44x44px dokunma alan kuralını ihlal etmektedir.
- **DOMAIN:** `UI / UX Foundations`
- **USER IMPACT:** Mobil ekranda küçük butonlara dokunurken yanlış tıklama veya basamama stresi.
- **BUSINESS IMPACT:** Mobil kullanılabilirlik puanının düşmesi ve kullanıcı memnuniyetsizliği.
- **TECHNICAL IMPACT:** `globals.css` içinde `.btn-primary` sınıfında net `h-[50px]` zorlamasının olmaması.
- **ROOT CAUSE:** `src/app/owner/pets/[id]/PetDetailClient.tsx` (Profili Düzenle İkonu `w-8 h-8` 32px), `TreatmentsClient.tsx` (Yeni Plan Ekle `py-2` 36px), `VaccinesClient.tsx` (Manuel İşlem `py-2.5` 40px), `bug_report_dashboard.md` (Pet Ekle `py-1.5 px-3` 28px).
- **EVIDENCE:** `CONFIRMED` — `bug_report_dashboard.md`, `bug_report_medical.md`, `bug_report_pet_detail.md`, `bug_report_social_extra.md`
- **SEVERITY:** `P2` (Medium)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** Tüm tıklanabilir buton ve ikon kapsayıcılarına `min-h-[44px]` (veya `min-h-[50px]`) zorlaması eklenmelidir.
- **RISK:** Düzeltme esnasında bazı küçük bileşenlerin dikeyde hafif genişlemesi (CSS adjustment).

---

### ERR-UX-002: Missing Mobile Safe Area (`pb-safe`) on Main Containers
- **ID:** `ERR-UX-002`
- **PROBLEM:** Pet Detay, Beslenme, Aşılar, Tedaviler ve Günlük sayfalarında ana kapsayıcı div'lerde sabit `pb-20` (80px) kullanılırken iOS çentik / Home Indicator güvenli alan boşluğu (`pb-safe` / `env(safe-area-inset-bottom)`) eklenmemiştir.
- **DOMAIN:** `UI / Mobile Responsiveness`
- **USER IMPACT:** Çentikli iPhone modellerinde en alttaki "Kaydet" veya "Tamamla" butonunun alt navigasyon barının veya home çizgisinin altında kalması.
- **BUSINESS IMPACT:** Mobilde form tamamlama oranlarının düşmesi.
- **TECHNICAL IMPACT:** CSS safe-area inset eksikliği.
- **ROOT CAUSE:** Sayfa ana container'larında `className="flex flex-col gap-6 pb-20 w-full mx-auto"` kullanımı.
- **EVIDENCE:** `CONFIRMED` — `bug_report_pet_detail.md` (line 11), `bug_report_medical.md` (line 21), `bug_report_journal.md` (line 19)
- **SEVERITY:** `P2` (Medium)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** Sayfa ana kapsayıcılarına `pb-[calc(80px+env(safe-area-inset-bottom))]` veya `pb-safe` sınıfı eklenmelidir.
- **RISK:** Yok.

---

### ERR-UX-003: Cumulative Layout Shift (CLS) in Asynchronous Auth Components
- **ID:** `ERR-UX-003`
- **PROBLEM:** Login sayfasında `BiometricLogin` bileşeni `next/dynamic` ile `ssr: false` olarak asenkron yüklendiğinde, sayfa yüksekliğini aniden değiştirerek form elemanlarını aşağı itmektedir.
- **DOMAIN:** `Auth & Web Performance`
- **USER IMPACT:** Giriş yaparken butonların aniden kayması ve yanlış yere tıklama (CLS titremesi).
- **BUSINESS IMPACT:** Core Web Vitals (CLS) puanının düşmesi.
- **TECHNICAL IMPACT:** Asenkron component wrapper yüksekliğinin önceden rezerve edilmemesi.
- **ROOT CAUSE:** `src/app/login/page.tsx` içinde `BiometricLogin` wrapper div'inin yüksekliğinin olmaması.
- **EVIDENCE:** `CONFIRMED` — `bug_report_login.md` (line 10-12)
- **SEVERITY:** `P3` (Low)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** `BiometricLogin` etrafına `min-h-[50px]` kapsayıcı veya skeleton loader eklenmelidir.
- **RISK:** Yok.

---

### ERR-UX-004: SmartScanner Camera Viewport Height Overflow on Small Devices
- **ID:** `ERR-UX-004`
- **PROBLEM:** `SmartScanner.tsx` bileşeninde kamera ekranı için `h-[480px]` sabit yükseklik tanımlanmıştır; küçük ekranlı mobil cihazlarda (iPhone SE, 375px genişlik) sayfa dikeyde taşmakta ve kaydırma sorununa yol açmaktadır.
- **DOMAIN:** `AI & Scanner Domain`
- **USER IMPACT:** Küçük mobil cihaz kullanıcılarının kamera görünümünü ve altındaki "Fotoğraf Çek" butonunu ekrana sığdıramaması.
- **BUSINESS IMPACT:** OCR aşı tarama özelliğinin küçük ekranlı telefonlarda kullanılamaması.
- **TECHNICAL IMPACT:** Hardcoded pixel height (`h-[480px]`).
- **ROOT CAUSE:** `src/components/ui/SmartScanner.tsx` (Line 25).
- **EVIDENCE:** `CONFIRMED` — `bug_report_journal.md` (line 25-27)
- **SEVERITY:** `P2` (Medium)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** Sabit `h-[480px]` yerine `aspect-[3/4] max-h-[60vh] w-full` gibi esnek oran kullanımı.
- **RISK:** Kamera görünüm oranının (aspect ratio) cihazlar arasında değişmesi.

---

### ERR-UX-005: Textarea Fixed Height & Disabled Auto-Resize in Journal Forms
- **ID:** `ERR-UX-005`
- **PROBLEM:** Günlük ve not alma formlarındaki metin alanları `min-h-[100px] resize-none` olarak sabitlenmiş; kullanıcı uzun notlar yazdığında metin dar bir kaydırma alanına hapsedilmektedir.
- **DOMAIN:** `Care & Journal Domain`
- **USER IMPACT:** Uzun açıklama yazarken yazılan metnin tamamını bir bakışta görememe.
- **BUSINESS IMPACT:** Düşük form etkileşim kalitesi.
- **TECHNICAL IMPACT:** Auto-expanding textarea yokluğu.
- **ROOT CAUSE:** `src/app/owner/pets/[id]/journal/new/[category]/JournalFormClient.tsx`.
- **EVIDENCE:** `CONFIRMED` — `bug_report_journal.md` (line 15-17)
- **SEVERITY:** `P3` (Low)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** `field-sizing: content` CSS kuralı veya `react-textarea-autosize` entegrasyonu.
- **RISK:** Yok.

---

### ERR-PERF-001: Missing Image `sizes` Attribute in Pet Card List
- **ID:** `ERR-PERF-001`
- **PROBLEM:** Pet kartlarındaki `next/image` görsellerinde `fill` niteliği kullanılmış ancak `sizes` niteliği tanımlanmadığı için mobil cihazlarda 4K çözünürlükteki orijinal fotoğraflar indirilerek hücresel veri ve bant genişliği israf edilmektedir.
- **DOMAIN:** `Performance & Media`
- **USER IMPACT:** Yavaş mobil bağlantılarda fotoğrafların geç yüklenmesi ve mobil veri tüketiminin artması.
- **BUSINESS IMPACT:** Yüksek Vercel / Supabase Storage bandwidth maliyeti.
- **TECHNICAL IMPACT:** Next.js Image Optimization ikazı.
- **ROOT CAUSE:** Dashboard ve Pet Listesi `Image` bileşenleri.
- **EVIDENCE:** `CONFIRMED` — `bug_report_dashboard.md` (line 15)
- **SEVERITY:** `P3` (Low)
- **CURRENT STATUS:** `Identified`
- **KNOWN FIX:** `<Image sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" ... />` niteliğinin eklenmesi.
- **RISK:** Yok.
