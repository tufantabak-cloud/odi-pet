# Odi Pet - Forensic UX Decision Log

> **Doküman Tipi:** UI/UX Architecture & Product Decision Audit  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kapsam:** Kritik UX Kararları, Tasarım Gerekçeleri ve Mimari Sebepler  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`

---

## 1. Progressive Profiling vs Long Onboarding Forms

- **KARAR:** Kayıt anında upuzun formlar doldurtmak yerine yalnızca minimum verileri (Tür, İsim, Yaş, Cinsiyet) almak; eksik verileri uygulama içi bağlamlarda (SmartCardBanner / Question Cards) aşamalı olarak talep etmek.
- **PRODUCT & UX RATIONALE:** 
  - Kayıt anındaki sürtünmeyi (friction) ve terk etme (bounce rate) oranını %60+ azaltmak.
  - Kullanıcının değeri (değerli aşı takvimi) ilk 30 saniyede görmesini sağlamak.
  - Veri talebini bir "kullanıcı faydasının bedeli" olarak bağlamsal olarak sunmak.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `AGENTS.md` (Progressive Profiling Kuralı), `src/components/profiling/SmartCardBanner.tsx`, `src/app/owner/pets/add/page.tsx`

---

## 2. Single Source of Truth & Read-Only Dashboard/Timeline

- **KARAR:** Dashboard, Ajanda (Takvim), Özet Kartlar ve Zaman Çizelgelerinin doğrudan veritabanı mutasyonu yapmasını engellemek; bu alanları yalnızca kanonik verilerden beslenen Read-Only Aggregation olarak kurgulamak.
- **PRODUCT & UX RATIONALE:** 
  - Veri tekrarı (redundancy) ve parçalanmış durum (fragmented state) krizlerini engellemek.
  - Kullanıcının aynı aşıyı veya kiloyu farklı iki ekranda farklı değerlerle görmesini önleyerek güven tesis etmek.
  - Tüm mutasyonların tek bir kanonik servis (`createVaccineRecord.ts`, `createPet.ts`) üzerinden yapılmasını sağlamak.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `AGENTS.md` (Cilt 5 & 6 Canonical Data Rules), `src/app/owner/dashboard/DashboardClient.tsx`, `src/app/owner/takvim/TakvimClient.tsx`

---

## 3. Glassmorphic Soft Tonal Elevation vs Heavy Dark Shadows

- **KARAR:** Derinliği simsiyah, kalın gölgeler (`shadow-2xl`, `shadow-black`) yerine yarı saydam cam efektleri (`backdrop-blur-xl`), hairline border'lar (`border-white`) ve çok yayvan (diffused) yumuşak gölgeler (`--shadow-soft`) ile sağlamak.
- **PRODUCT & UX RATIONALE:** 
  - Evcil hayvan bakımında yumuşak, dost canlısı, modern ve premium bir mobil uygulama hissiyatı (iOS Apple HIG standartlarında) yaratmak.
  - Göz yorgunluğunu azaltmak ve içeriğin ön plana çıkmasını sağlamak.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `src/app/globals.css` (line 35, 151), `src/components/ui/primitives/GlassCard.tsx`

---

## 4. 50px Button Ergonomics & Touch Target Standards

- **KARAR:** Ana eylem butonlarında kesin olarak 50px yüksekliğe (`h-[50px]`) ve dokunmatik cihazlarda en az 44x44px dokunma alanına (touch target) uymak.
- **PRODUCT & UX RATIONALE:** 
  - Mobil cihazlarda başparmak kullanım bölgesinde (thumb zone) yanlış tıklamaları (mis-taps) engellemek.
  - Tek elle hızlı kullanım imkanı sunmak.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `src/app/login/page.tsx` (`h-[50px]`), `AGENTS.md` (Foundations Token Anayasası), Audit Raporları (`bug_report_dashboard.md`).

---

## 5. Human-in-the-Loop AI Governance & Review-Confirm UI

- **KARAR:** Yapay zekanın (Gemini OCR / AI Vet) hiçbir koşulda kullanıcıdan habersiz veritabanına otomatik kayıt (mutation) yapmasına izin vermemek; tüm çıktılı verileri "Taslak İnceleme ve Onay Modalı (Review & Confirm UI)" ile kullanıcı onayına sunmak.
- **PRODUCT & UX RATIONALE:** 
  - Yapay zeka simülasyon hatalarının (hallucination) veya yanlış OCR okumalarının yanlış tıbbi aşı dozlarına/tarihlerine yol açmasını %100 engellemek.
  - Yasal tıbbi sorumluluk reddi (Medical Disclaimer) sınırlarını korumak.
  - Kullanıcıya kontrolün kendisinde olduğu hissini vermek.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `AGENTS.md` (Cilt 13 AI Governance), `src/components/ui/SmartScanner.tsx`, `src/app/owner/ai-vet/page.tsx`

---

## 6. Non-Destructive Archival for Health Records

- **KARAR:** Evcil hayvanların aşı, parazit, hastalık, reçete ve kilo verilerinin veritabanından kalıcı olarak silinmesini (Hard Delete) KESİNLİKLE YASAKLAMAK; silme taleplerinde verileri yalnızca pasife/arşive almak (`is_archived = true`).
- **PRODUCT & UX RATIONALE:** 
  - Evcil hayvanın tıbbi geçmiş bütünlüğünü, veteriner incelemelerinde geriye dönük güvenilirliği korumak.
  - Yanlışlıkla silinen aşı kayıtlarının petin sağlığını riske atmasını engellemek.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `AGENTS.md` (Cilt 5 Health Archival Rule), `ODIPET_AUDIT_CURRENT.md`

---

## 7. Responsive Navigation: BottomNav Mobile / Sidebar Desktop

- **KARAR:** Mobil cihazlarda başparmak erişim alanına uygun 5 sekmeli Bottom Navigation (`Anasayfa`, `Takvim`, `+`, `Bildirim`, `Profil`); Masaüstü ekranlarda ise sol genişletilmiş Sidebar kullanmak.
- **PRODUCT & UX RATIONALE:** 
  - Mobil ekranda hamburger menüye gizlenmiş kritik özelliklerin kullanımını kaybetmemek.
  - Masaüstünde geniş ekran alanını etkili değerlendirerek çoklu pet yönetimine imkan tanımak.
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `src/app/owner/layout.tsx`, `src/components/onboarding/OnboardingGate.tsx`

---

## 8. Modal vs Sheet vs Dedicated Page Trade-off Architecture

- **KARAR:** 
  - **Bottom Sheet (Slide-over):** Bağlamsal hızlı aksiyonlar (Hızlı Not Ekle, Görev İşaretle) için.
  - **Modal (Dialog):** Kritik onaylar ve uyarılar (Silme Onayı, Davet Kabul, AI İnceleme) için.
  - **Dedicated Page (Tam Sayfa):** Derinleşmiş iş akışları (Add Pet Wizard, Lost Pet Wizard, AI Vet Chat) için tercih edilmiştir.
- **PRODUCT & UX RATIONALE:** 
  - Kullanıcıyı ana akışından koparmadan hızlı aksiyon aldırmak (Sheet & Modal).
  - Karmaşık adımlı formlarda kullanıcının dikkatini tamamen göreve odaklamak (Dedicated Page/Wizard).
- **EVIDENCE & SOURCE LOCATION:** `CONFIRMED` — `src/components/ui/Modal.tsx`, `src/components/health-tracker/ActionSheet.tsx`, `src/components/wizard/WizardShell.tsx`
