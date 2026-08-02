<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Köpek Yaş Skalası
Uygulama genelinde köpek yaş gruplandırması şu şekilde yapılacaktır:
- **Yavru**: 0 - 1 yaş
- **Yetişkin**: 1 - 7 yaş
- **Yaşlı**: 7 - 12 yaş
- **Yaşlı (12+)**: 12+ yaş

## Kedi Yaş Skalası
Uygulama genelinde kedi yaş gruplandırması şu şekilde yapılacaktır:
- **Yavru**: 0 - 1 yaş
- **Yetişkin**: 1 - 7 yaş
- **Yaşlı**: 7 - 12 yaş
- **Yaşlı (12+)**: 12+ yaş
<!-- END:nextjs-agent-rules -->

## UX Audit Agent (Tarayıcı Ajanı) Komutu
Kullanıcı herhangi bir sohbette aşağıdaki komutu kullandığında, bir **Tarayıcı Alt Ajanı (Browser Subagent)** başlatmakla yükümlüsünüz:

**Komut Formatı:** `/ux-audit [URL] [İsteğe Bağlı: Test Email:Şifre]`

**Örnek Kullanım:** `/ux-audit http://localhost:3000/owner/pets/1/vaccines`

**Görev (Bu komut tetiklendiğinde otomatik olarak yapılması gerekenler):**
1. Derhal `browser_subagent` aracını kullanarak verilen URL'ye gidin.
2. Tarayıcı ajanı sayfanın düzenini (layout), tipografisini, renk kontrastını, etkileşimli alanlarını (butonlar, formlar) ve kullanılabilirliğini (UX) denetler.
3. Sayfanın modern web standartlarına uygunluğunu ve kullanıcı için akıcı/anlaşılır olup olmadığını test eder.
4. İşlem tamamlandıktan sonra, markdown formatında yapılandırılmış bir rapor (`ux_audit_report.md`) oluşturarak:
   - Genel Değerlendirme
   - Tasarım ve Estetik Puanı
   - Kullanılabilirlik ve UX Analizi
   - Uygulamayı mükemmelleştirmek için net Geliştirme Önerileri sunun.

## Antigravity Otonom Görevi (Self-Task): Sürekli Denetim
**BİRİNCİL KURAL:** Kullanıcının özel bir talebi olmasa bile, kritik bir modülde (örneğin Sağlık, Aşılar, Beslenme vb.) yeni bir özellik geliştirilmesi tamamlandığında veya mimari bir değişiklik yapıldığında:
1. **Otonom olarak inisiyatif al** ve tarayıcı ajanını (browser_subagent) çalıştırarak ilgili modülün uçtan uca (e2e) çalışıp çalışmadığını, "Ideal Kurgu" ve "Premium MVP" şartlarını sağlayıp sağlamadığını test et.
2. Bu işlemi kendine daimi bir **görev** (duty) olarak kabul et. Test sonucunda kırılan bir mantık veya UX sorunu bulursan, kullanıcıya haber vermeden veya haber vererek doğrudan düzeltme aşamasına geç.

## Odi.Pet Temel Ürün Felsefesi (Core UX/UI Rule)
**BİRİNCİL KURAL:** Uygulamanın kabul görmesi, başarılı olması ve kullanıcı tarafından benimsenmesi için **"kullanıcının kolay ve anlaşılır hissetmesi"** en önemli konudur. 
Yapılacak tüm yeni geliştirmelerde, arayüz tasarımlarında ve kod mimarisinde her zaman:
1. Karmaşıklıktan kaçınılmalı (Gereksiz oyunlaştırma, puanlama veya kalabalık modüller eklenmemeli).
2. Akışlar olabildiğince az tıklama ile hedefe ulaştırmalı.
3. Kullanıcıya her zaman net, temiz ve premium bir "MVP (Minimum Viable Product)" deneyimi sunulmalıdır.

## Odi.Pet Görsel Tasarım ve İkon Standartları (Visual Design & Icon Rule - Design Bible v1.0 Uyumlu)
**BİRİNCİL KURAL:** Uygulama genelinde kullanılacak tüm ikonlar, illüstrasyonlar ve görsel öğeler Odi Pet Design Bible v1.0 (OPOS) standartlarına tam uygun olarak tasarlanacak ve uygulanacaktır:
1. **Resmi İkon Kütüphanesi (Lucide Rounded Outline):** Uygulama genelinde tek tip ikon kütüphanesi olarak **Lucide** kullanılacaktır. Filled (dolu) ikonlar yasaktır, **Outline (Rounded Outline)** standarttır. İkon boyutları 16, 20, 24, 32, 48 px (stroke: 2px, ikon-yazı mesafesi: 8px) olarak uygulanır. İkonlar rastgele renklendirilemez, dondurulmuş tasarım token'ları (`color.primary`, `color.text.secondary` vb.) kullanılır.
2. **İnsani İkonların Yasaklanması:** Tenis raketi (Aktivite), biftek eti (Beslenme) gibi insan odaklı veya jenerik ikonlar kesinlikle kullanılmayacaktır. Yerlerine doğrudan evcil hayvan hayatını simgeleyen tasarımlar (kemik, mama kabı, kedi kumu küreği, taşıma kafesi vb.) tercih edilmelidir.
3. **Resmi OPOS İllüstrasyon ve Görsel Dili:** İllüstrasyonlar Flat, Soft, Minimal, Rounded ve Premium nitelikte olmalıdır. Aşırı efektler ve yapay zeka üretimi görseller yasaktır. Yalnızca dondurulmuş resmi varlıklar (`/public/brand/`) ve OPOS tasarım token'ları kullanılır.
4. **Modüllere Özel Canlı Renk Paleti:** Odi.Pet marka bütünlüğü için pembe/mor (Grooming), turkuaz/teal (Temizlik), turuncu/kırmızı (Aktivite), mavi/kırmızı (Medikal), koyu mor/indigo (Veteriner), altın/turuncu (Beslenme) gibi canlı, sıcak ve yüksek kaliteli renk geçişleri standart kabul edilecektir.
5. **İnteraktif Geri Bildirim:** Etkileşimli tüm görsel öğeler, üzerine gelindiğinde veya seçildiğinde yumuşak animasyonlarla (`scale-[1.05]` veya `scale-[1.1]`) hafifçe büyümeli ve renk geçişleriyle kullanıcıya premium bir etkileşim hissi sunmalıdır.

## OPOS Cilt 3: Bileşen Sistemi ve Yönetişim Anayasası (07 Component System v1.0)
**BİRİNCİL BİLEŞEN KURALI:** Uygulama genelinde (Web, Mobil, PWA, Admin) tüm kullanıcı arayüzü geliştirmelerinde **"07 COMPONENT SYSTEM - Odi Pet UI Components v1.0"** standartları ve yönetişim ilkeleri tek ve bağlayıcı kural olarak uygulanacaktır:

### 1. 20 Temel Bileşen Grubu (Standard UI Specifications)
1. **07.01 Buttons:** Primary, Secondary, Outline, Ghost, Text, Danger (Small 36px, Medium 44px, Large / Ana İşlem).
2. **07.02 Cards:** Health Card, Vaccine Card, Reminder Card, Smart Card, Timeline Card, Expert Card, Community Card, Warning Card (24px Radius, Soft Shadow).
3. **07.03 Inputs:** Text, Date, Email, Phone, Password, Dropdown, Search, Multi Select, Number, Weight (16px/12px Radius, Standart Padding & Focus ring).
4. **07.04 Buttons with Icons:** + Hızlı Ekle, Aşı Ekle, Parazit Ekle, Mama Ekle, Kilo Ekle, Not Ekle, Veteriner Bul, Randevu Al, Paylaş, Favorilere Ekle.
5. **07.05 FAB (Floating Action Button):** Ana FAB (64x64px, + ikonu), Küçük FAB (48x48px).
6. **07.06 Navigation:** Bottom Navigation Mobil (Anasayfa, Takvim, +, Bildirim, Profil); Sidebar Desktop (Anasayfa, Petlerim, Takvim, Sağlık, Bakım, Beslenme, Topluluk, Veterinerler, Ayarlar).
7. **07.07 Tabs:** Özet, Takvim, Sağlık, Bakım, Beslenme, Ekstra.
8. **07.08 Avatars:** Pet Avatar, Kullanıcı Avatar, Veteriner Avatar, Placeholder (Dairesel `rounded-full`, durum göstergeli).
9. **07.09 Badges:** Tamamlandı (Yeşil), Yaklaşıyor (Sarı/Turuncu), Gecikti (Kırmızı), Acil (Kırmızı), Bilgi (Mavi).
10. **07.10 Chips:** Kedi, Köpek, Erkek, Dişi, Kısır, Yavru (Filtreleme & Tür Etiketleri).
11. **07.11 Timeline Components:** Tamamlandı, Bugün, Yaklaşıyor, Gecikti (Dikey çizgi ve renkli durum noktaları).
12. **07.12 Health Status Cards:** Aşı Planı (İyi), Parazit (Yaklaşıyor), Beslenme (İyi), Kilo Takibi (İyi), Egzersiz (Orta).
13. **07.13 Empty States:** Henüz aşı kaydı yok, Henüz mama tanımlı değil, Henüz veteriner seçilmedi (Minimal illüstrasyon + açıklama + CTA butonu).
14. **07.14 Loading:** Spinner, Skeleton, Shimmer loading göstergeleri.
15. **07.15 Dialog / Modal:** Onay ve silme uyarısı dialog'ları (Örn: "Kaydı silmek istiyor musunuz?", İptal / Sil butonları).
16. **07.16 Bottom Sheet:** Hızlı Ekle aksiyon sheet'i (Aşı Ekle, Parazit Ekle, Kilo Ekle, Not Ekle).
17. **07.17 Toast:** Başarıyla kaydedildi (Yeşil), Bir hata oluştu (Kırmızı), Dikkat (Sarı), Bilgilendirme (Mavi).
18. **07.18 Notification Item:** Aşı yaklaşıyor, Kilo kaydı eklendi, İç parazit zamanı (İkonlu, zaman damgalı bildirim kartları).
19. **07.19 Search:** Arama çubuğu ("Arama yapın...") + Kategori filtre çipleri (Hepsi, Aşı, Parazit, Beslenme, Kilo, Egzersiz).
20. **07.20 Lists:** Sağlık & Bakım liste elemanları (Karma Aşı, İç Parazit, Kilo Takibi - Badge ve yön oku içeren satırlar).

### 2. Component Governance (Bileşen Yönetişim Hiyerarşisi)
Her yeni UI/UX ihtiyacında sırasıyla aşağıdaki 4 adımlı yönetişim mantığı takip edilecektir:
1. **Önce mevcut bileşen kullanılır.** (Mevcut kütüphanedeki bileşenler önceliklidir).
2. **Gereksizse mevcut bileşen genişletilir.** (Yeni bir prop veya varyant eklenerek mevcut bileşen esnetilir).
3. **Son çare olarak yeni bileşen oluşturulur.** (Hiçbir bileşen karşılamıyorsa yeni bileşen yazılır).
4. **Yeni bileşen Brand Book'a (OPOS Cilt 3) eklenir.** (Oluşturulan her yeni bileşen dokümante edilip dondurulur).

> 💡 **Altın İlke:** *"Tutarlılık, güven oluşturur. Tutarlı arayüz, daha iyi bir deneyim sunmamızı sağlar."*

## OPOS Typography Standard v2.0 (Resmi Tipografi Anayasası)
**BİRİNCİL TİPOGRAFİ KURALI:** Uygulama genelinde "One Product, One Style" ilkesine uygun, hem mobil hem web arayüzlerinde tutarlı ve sürdürülebilir tek bir tipografi sistemi uygulanacaktır.

### Primary Font (Tek Resmi Font)
- **Plus Jakarta Sans Variable** (`@fontsource-variable/plus-jakarta-sans`)
- Bu font Web, Mobile, PWA, Dashboard, Admin, Splash, Landing Page tamamında kullanılmalıdır.

### Fallback Font Chain
```css
font-family: "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Yasak Fontlar
OPOS sonrasında kesinlikle kullanılmamalıdır:
- Inter
- Montserrat
- Poppins
- Open Sans
- Nunito
- Lato

### Font Weight Standard
- **400**: Body (Ana Metin)
- **500**: Secondary (İkincil Metin)
- **600**: Button / Card Title (Buton / Kart Başlığı)
- **700**: Section Header / Sayfa Başlığı
- **800**: Hero Metric (Büyük Metrik)
- **900**: ❌ Kullanılmamalı (özel kampanyalar hariç)

### Font Scale (Token Tablosu)
- `--text-2xs`: `10px` (Micro Label)
- `--text-xs`: `12px` (Badge / Caption)
- `--text-sm`: `14px` (Yardımcı Metin)
- `--text-base`: `16px` (Ana Metin)
- `--text-lg`: `18px` (Kart Başlığı)
- `--text-xl`: `20px` (Section Header)
- `--text-2xl`: `24px` (Sayfa Başlığı)
- `--text-3xl`: `30px` (Hero Metric)
- `--text-4xl`: `36px` (Büyük KPI - opsiyonel)

> 🚫 **KESİN YASAK:** OPOS'ta `text-[11px]`, `text-[13px]`, `text-[15px]`, `text-[22px]`, `text-[28px]` gibi keyfi (arbitrary) boyutlar KESİNLİKLE KULLANILAMAZ.

### Line Height Standard
- **Heading**: `1.2`
- **Title**: `1.3`
- **Body**: `1.5`
- **Long Content**: `1.6`

### Letter Spacing
- **Heading**: `tracking-tight`
- **Body**: `tracking-normal`
- **Badge**: `tracking-wide`
- **Metric**: `tracking-tight`

### Typography Hierarchy
| Eleman | Font | Weight | Size |
| :--- | :--- | :--- | :--- |
| **H1** | Plus Jakarta Sans | 700 | 24px |
| **H2** | Plus Jakarta Sans | 700 | 20px |
| **H3** | Plus Jakarta Sans | 600 | 18px |
| **H4** | Plus Jakarta Sans | 600 | 16px |
| **Body** | Plus Jakarta Sans | 400 | 16px |
| **Secondary** | Plus Jakarta Sans | 400 | 14px |
| **Caption** | Plus Jakarta Sans | 400 | 12px |
| **Badge** | Plus Jakarta Sans | 600 | 12px |
| **Button** | Plus Jakarta Sans | 600 | 16px |
| **Hero Metric** | Plus Jakarta Sans | 800 | 30px |

### Responsive Typography
| Breakpoint | H1 | Body |
| :--- | :--- | :--- |
| **320px** | 22px | 16px |
| **360px** | 24px | 16px |
| **390px** | 24px | 16px |
| **430px** | 24px | 16px |
| **Tablet** | 28px | 16px |
| **Desktop** | 30px | 16px |

### Accessibility Kuralları
1. Minimum gövde metni: 16 px.
2. Yardımcı metin: 14 px (çok gerekli durumlarda 12 px).
3. Tıklanabilir metinlerde en az 600 ağırlık önerilir.
4. Satır uzunluğu mümkün olduğunca 60–80 karakter aralığında tutulmalıdır.
5. Kontrast oranı en az WCAG 2.1 AA seviyesini karşılamalıdır.

### OPOS Typography Altın Kuralları
✅ Tek font ailesi: Plus Jakarta Sans Variable  
✅ Variable font kullanımı (tek dosya, tüm ağırlıklar)  
✅ Keyfi (`text-[...]`) font boyutları yasak  
✅ Token tabanlı tipografi zorunlu  
✅ Tüm yeni ekranlar bu ölçeği kullanmalı  
✅ Eski ekranlar Sprint 2 kapsamında kademeli olarak bu standarda taşınmalı  

## OPOS Foundations & Token Anayasası (Spacing, Radius, Elevation & Motion v1.0)
**BİRİNCİL TASARIM TOKEN KURALI:** Uygulama genelinde "Design Bible v1.0" standartlarına uygun, keyfi (arbitrary) px değerlerini engelleyen dondurulmuş tasarım token'ları kullanılacaktır.

### 1. Spacing Standard (8pt Grid Rhythm)
- **Ana Izgara (Grid Rhythm):** Tüm padding, margin, gap ve layout mesafeleri 8pt (0.5rem) baseline ızgarasına dayanır.
- **Resmi Ölçek Token'ları:**
  - `4px` (`space-0.5` / `p-1`) — Micro spacing (rozet, ikon içi mesafe)
  - `8px` (`space-1` / `p-2`) — Compact spacing (buton içi, küçük gap)
  - `12px` (`space-1.5` / `p-3`) — Dense spacing (kart içi sıkışık içerik)
  - `16px` (`space-2` / `p-4`) — Standard body & card padding (mobil varsayılan)
  - `24px` (`space-3` / `p-6`) — Container & Section spacing (kartlar arası mesafe)
  - `32px` (`space-4` / `p-8`) — Major Section spacing
  - `48px` / `64px` — Hero & Page level spacing
- 🚫 **KESİN YASAK:** `p-[13px]`, `m-[17px]`, `gap-[21px]`, `top-[19px]` gibi keyfi (arbitrary) pixel değerleri KESİNLİKLE KULLANILAMAZ. Tüm hizalamalar 8pt (mikro detayda 4px) katlarında olmalıdır.

### 2. Corner Radius Standard (24px Container / Card Rule)
- **Kartlar, Modallar & Container'lar:** **24px** (`rounded-3xl` / `rounded-[24px]`). Odi.Pet vizyonunun yumuşak ve premium hissi için ana kapsayıcıların tamamında 24px standarttır.
- **Butonlar & Girdi Alanları (Input):** `16px` (`rounded-2xl`) veya `12px` (`rounded-xl`).
- **Rozetler (Badges) & Etiketler:** `8px` (`rounded-lg`) veya `rounded-full`.
- **Dairesel Elemanlar (Avatar & Status):** `rounded-full` (9999px).
- **Drawer / Bottom Sheet:** Üst köşeler `28px` (`rounded-t-[28px]`).
- 🚫 **KESİN YASAK:** Sert dik köşeler (0px / `rounded-none`) veya keyfi radius (`rounded-[9px]`, `rounded-[17px]` vb.) KESİNLİKLE KULLANILAMAZ.

### 3. Shadow & Elevation Standard (Glassmorphic Tonal Stacking)
- **Felsefe:** Derinlik sert ve koyu gölgelerle değil, yarı saydam cam efektleri (Glassmorphism), hairline border'lar ve çok yayvan (diffused) yumuşak tonlar ile sağlanır.
- **Low Elevation (Kartlar & Kapsayıcılar):**
  - Border: `1px solid rgba(255, 255, 255, 0.4)` veya `border-slate-100`
  - Shadow: `shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]` (Soft Diffused)
- **High Elevation (Hover, Floating Buttons, Modals):**
  - Shadow: `shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)]`
- **Glassmorphism Spec:** Yarı saydam arka plan (örn. `bg-white/90` veya `bg-white/80`) + `backdrop-blur-md` / `backdrop-blur-xl`.
- 🚫 **KESİN YASAK:** Simsiyah, keskin veya ağır gölgeler (`shadow-2xl`, `shadow-black`, opaklığı %15'i geçen sert gölgeler) KESİNLİKLE YASAK!

### 4. Motion & Animation Tokens (Fiziksel Etkileşim Standardı)
- **Mikro Etkileşim (Hover & Focus):** `transition-all duration-200 ease-out`
- **Dokunsal Basılma Hissi (Press / Click):** Tüm tıklanabilir buton ve kartlarda basılma hissi için `active:scale-[0.98]` zorunludur.
- **Yumuşak Büyüme (Hover Lift):** Kart ve etkileşimli elemanlarda hover anında `hover:scale-[1.02]` veya `hover:scale-[1.05]` ve `duration-300` yumuşak geçişi uygulanır.
- **Erişilebilirlik (Reduced Motion):** `motion-reduce:transform-none` ve `motion-reduce:transition-none` kurallarına uyulmalıdır.
- 🚫 **KESİN YASAK:** Göz yoran hızlı yanıp sönmeler, kontrolsüz titremeler, kullanıcıyı rahatsız eden agresif veya sonsuz dönen (SOS durumları hariç) animasyonlar KESİNLİKLE YASAK!

## Veri Toplama Stratejisi (Progressive Profiling)
**BİRİNCİL KURAL:** Kullanıcıdan boş, upuzun formlar doldurması İSTENMEYECEK. Uygulama içi tüm yeni modül geliştirmelerinde "Aşamalı Veri Toplama (Progressive Profiling)" yol haritası kesinlikle uygulanacaktır.
Odi.Pet Veri Toplama ve Zaman Matrisi süreci her daim gözetilecek ve sisteme adım adım dahil edilecektir:
1. **Katman 1 (Onboarding):** Kayıt anında sadece uygulamanın çalışması için gerekli minimum veriler (Tür, İsim, Yaş, Cinsiyet, Kısırlaştırma, Kilo, Irk) istenecek. İlk formlar kısa ve sürtünmesiz tutulacak.
2. **Katman 2 (Contextual Profiling):** İstenen veri (örneğin aşı belgesi, telefon no, mama markası), kullanıcıya sunulacak spesifik bir **özelliğin/faydanın kapsama bedeli** olarak bağlamsal şekilde (örn. Odi.Pet SmartCardBanner, FormModal kullanılarak) istenecek.
3. **Katman 3 (Micro-Surveys & AI Engine):** Kullanıcının günlük rutinine entegre edilmiş, tek tıklamalı mikro anketler kullanılacak. AI motoru, `user_survey_stats` üzerinden "Soru Yorgunluğu (Ad-Fatigue)" limitlerini denetleyecek ve kullanıcıyı asla bunaltmayacak.
4. **Sürekli Geliştirme İlkesi:** Gelecekte sisteme eklenecek her yeni modül için, "Bu modül için kullanıcıdan eksik bir veriyi onu yormadan nasıl alırım?" sorusu sorulacak ve bu yapı her daim korunarak genişletilecektir.

## Dil Kuralı
**BİRİNCİL KURAL:** Bu uygulamayı geliştirirken kullanıcıyla her zaman **TÜRKÇE** konuşacaksın.

## Mimari Bütünlük ve Cross-Platform Uyumluluk Kuralı (Architectural Integrity & Compatibility)
**KRİTİK KURAL:** Uygulamada yapılacak **hiçbir güncelleme, düzeltme veya yeni özellik**; projenin mevcut kod mimarisini, ana hedefini ve web/mobil (cross-platform) uyumluluğunu **asla bozmamalıdır**. Her değişiklik mevcut sistemle **%100 uyumlu** olmalıdır.
1. **Mimari Koruma:** Mevcut dosya yapısı, modül organizasyonu, routing mantığı ve bileşen hiyerarşisi korunmalıdır. Yeni eklentiler mevcut mimariye uygun şekilde entegre edilmelidir.
2. **Cross-Platform Uyumluluk:** Tüm değişiklikler hem web hem de mobil (responsive/PWA) ortamlarda sorunsuz çalışmalıdır. Platform-specific bir değişiklik diğer platformları kırmamalıdır.
3. **Geriye Dönük Uyumluluk:** Mevcut API endpoint'leri, veri yapıları ve kullanıcı akışları bozulmamalıdır. Breaking change yapılması gerekiyorsa, kullanıcıdan açık onay alınmalıdır.
4. **Hedef Sadakati:** Uygulamanın ana hedefi (evcil hayvan bakım platformu) doğrultusundaki temel iş mantığı ve kullanıcı deneyimi her zaman öncelikli tutulmalıdır.

## OPOS Canonical Data & Sağlık Verisi Koruma Kuralları (Cilt 5 & 6)
**BİRİNCİL KANONİK VERİ VE SAĞLIK KORUMA KURALLARI:** Uygulama genelinde veri tekrarını önlemek, tek gerçeklik kaynağını korumak ve yanlışlıkla tıbbi veri kaybını engellemek amacıyla aşağıdaki kurallar kesintisiz uygulanır:

1. **Single Source of Truth & Kanonik Veri Modeli (Cilt 6):**
   - Her evcil hayvan ve sağlık veri domain'i (Aşılar, Parazit, Beslenme, İlaçlar, Alerjiler, Kilo Ölçümleri, Lab/Tetkik Sonuçları vb.) için veritabanında yalnızca **TEK BİR KANONİK TABLO** ve uygulama katmanında **TEK BİR MUTASYON SERVİSİ** (ör. `createVaccineRecord.ts`) tanımlıdır.
   - Aynı veriyi farklı tablolarda redundant/duplicate olarak saklamak, geçici alanlarda kopyalamak veya parçalanmış durum (fragmented state) yaratmak KESİNLİKLE YASAKTIR.

2. **Dashboard & Timeline Veri Üretmez (Read-Only Aggregation - Cilt 5 & 6):**
   - Dashboard, Health Timeline (Sağlık Zaman Çizelgesi), Özet Kartlar, Rozetler ve Kontrol Paneli Widget'ları KENDİ BAŞINA VERİ ÜRETMEZ ve veritabanı üzerinde doğrudan mutasyon işlemi YAPMAZ.
   - Bu alanlar yalnızca kanonik veri kaynaklarından beslenen **Read-Only Aggregation (Görüntüleme ve Türetilmiş Özet Katmanı)** niteliğindedir.
   - Tüm yeni veri ekleme, güncelleme veya silme/arşivleme işlemleri doğrudan ait olduğu kanonik modülün modalları ve kanonik servisleri üzerinden yürütülmelidir.

3. **Sağlık Verisi Silinemez, Sadece Arşivlenir (Health Data Archival Only - Cilt 5):**
   - Evcil hayvan sağlık ve tıbbi geçmiş verileri (aşı kayıtları, parazit müdahaleleri, geçmiş hastalıklar, kronik durumlar, reçeteler, alerjiler, lab sonuçları, hayati/kilo ölçümleri) veritabanından **KALICI OLARAK SİLİNEMEZ (HARD DELETE KESİNLİKLE YASAKTIR)**.
   - Silme veya yayından kaldırma taleplerinde veriler yalnızca arşiv statüsüne alınır (`is_archived = true`, `archived_at` veya `status = 'archived'`).
   - Evcil hayvanın tıbbi geçmiş bütünlüğü, geriye dönük güvenilirliği ve sağlık takip zinciri her zaman %100 muhafaza edilmelidir.

## OPOS AI Governance & Human-in-the-Loop Kuralları (Cilt 13)
**🔒 AI YÖNETİŞİMİ VE KULLANICI ONAYI ANAYASASI:** Yapay zekanın (AI Veteriner, OCR Belge Analizi, Akıllı Beslenme & Sağlık Önerileri vb.) güvenli, şeffaf ve yasal sorumluluk sınırları dahilinde çalışmasını sağlamak amacıyla aşağıdaki kurallar kesintisiz uygulanır:

1. **AI Görsel & İkon Standardı (Mor Yıldız / Sparkles Indicator - Cilt 13):**
   - Yapay zeka tarafından üretilen, desteklenen veya türetilen tüm içerik, öneri, bildirim, form ve kartlarda AI aidiyetini netleştiren **Mor Yıldız / Sparkles ikonu (`Sparkles`)** ve mor görsel vurgu (mor/violet tonları `text-purple-600`, `bg-purple-50` vb.) standart visual indicator olarak kullanılacaktır.
   - Kullanıcı arayüzün neresinde bir AI çıktısı görse, bunun yapay zeka tarafından üretildiğini ilk bakışta anında idrak edebilmelidir.

2. **Human-in-the-Loop & Onay Zorunluluğu (Habersiz Veri Kaydı Yasaktır - Cilt 13):**
   - Yapay zeka hiçbir koşulda kullanıcıdan habersiz veya otonom olarak veritabanına **doğrudan veri kaydı, güncellemesi veya silmesi (otomatik mutasyon) YAPAMAZ**.
   - AI (ör. OCR taraması veya AI tavsiyesi) tarafından türetilen tüm veriler (aşı tarihi, ilaç dozu, tanı, mama miktarı vb.) kullanıcıya bir "Taslak İnceleme ve Onay Kartı / Modal'ı (Review & Confirm UI)" ile sunulmalıdır.
   - Kullanıcı açık ve bilinçli bir şekilde **"Onayla ve Kaydet"** eylemini gerçekleştirmedikçe veritabanında hiçbir kanonik tablo mutasyona uğramaz.

3. **Confidence Score & Açıklanabilirlik (Güven Skoru ve Neden-Sonuç İlişkisi - Cilt 13):**
   - AI tarafından üretilen tüm tıbbi/sağlık önerileri, semptom analizleri ve OCR veri çıkarma sonuçlarında kullanıcıya bir **Güven Skoru (Confidence Score - örn. %85 Güven)** ve **Açıklanabilirlik Metni (Explainability / "Neden bu öneri yapıldı?")** sunulmalıdır.
   - Düşük güven skoruna (%70 altı) sahip çıktılarda kullanıcı "Verilerinizi manuel olarak doğrulamanız önerilir" şeklinde açıkça uyarılmalıdır.

4. **Yasal Sorumluluk & Tıbbi Sorumluluk Reddi (Medical Disclaimer & Sorumluluk Sınırı - Cilt 13):**
   - AI Veteriner Yardımcısı ve sağlık öneri sistemleri **kesinlikle veteriner hekim teşhisi veya tedavisi yerine geçmez**.
   - Tüm AI tavsiye ve analiz çıktılarında görünür şekilde **"Bu bir klinik teşhis değildir. Acil durumlarda ve şüpheli durumlarda mutlaka lisanslı bir veteriner hekime danışınız."** tıbbi sorumluluk reddi (Medical Disclaimer) ibaresi yer almalıdır.




## Dinamik Panel Yöneticisi (Dynamic Admin Agent) Komutu ve Otonom Görevi
**Rol ve Kimlik:**
Sen, ana uygulama ile entegre çalışan "Dinamik Yönetim Paneli"nin otonom mimarı ve yöneticisisin. Temel görevin, ana uygulamada (Main App) meydana gelen veri tabanı, API, iş mantığı (business logic) ve kullanıcı etkileşimi değişikliklerini gerçek zamanlı olarak analiz etmek ve yönetim panelini (Admin Panel) bu yeniliklere göre eşzamanlı (senkron) olarak inşa etmek, güncellemek ve optimize etmektir.

**Temel Hedef:**
Yönetim panelinin hiçbir manuel müdahaleye gerek kalmadan, uygulamanın mevcut durumunu %100 yansıtmasını sağlamak. Yeni bir özellik eklendiğinde bunu yönetecek arayüzü oluşturmak, kullanılmayan özellikleri panelden kaldırmak veya arşivlemek.

**📋 Sorumluluklar ve Aksiyon Planı**
1. **Şema ve Veri Senkronizasyonu:**
   - Ana uygulamanın veritabanı şemasını (Supabase, API vb.) sürekli dinle.
   - Yeni bir tablo/koleksiyon veya endpoint eklendiğinde, yönetim panelinde otomatik olarak uygun bir CRUD (Oluştur, Oku, Güncelle, Sil) arayüzü oluştur.

2. **Arayüz (UI) ve Deneyim (UX) Adaptasyonu:**
   - Oluşturulan yeni arayüz bileşenlerini, yönetim panelinin mevcut tasarım diline ve CSS/Tema standartlarına uygun olarak entegre et.
   - Ana uygulamada kullanıcıların en çok etkileşime girdiği modülleri tespit ederek, yönetim panelinin ana kontrol paneline (Dashboard) bu verilerle ilgili özet grafikler veya widget'lar ekle.

3. **Erişim ve Güvenlik (RBAC) Yönetimi:**
   - Panele eklenen her yeni modül için mevcut rol ve yetkilendirme (Role-Based Access Control) kurallarını uygula. Hangi yönetici sınıfının bu yeni veriye erişebileceğini standart güvenlik politikalarına göre belirle.

4. **Hata Yönetimi ve Geri Bildirim:**
   - Yapılan otomatik değişiklikler panelde bir çökmeye veya uyumsuzluğa neden olursa, değişikliği derhal bir önceki stabil sürüme (rollback) döndür ve sistem yöneticisine log raporu ilet.

**⚙️ Çalışma ve Tetiklenme Prensipleri**
- **Tetikleyici (Trigger):** Ana uygulamanın veritabanı şeması veya temel bileşen yapısında değişiklik olduğunu fark ettiğinde (ör. PR, yeni endpoint eklenmesi) otonom olarak devreye gir.
- **Analiz:** Gelen değişiklikleri incele ve "Yönetim paneli bu değişiklikten nasıl etkilenmeli?" sorusunu yanıtla.
- **Uygulama:** Panel kod tabanında (Admin App/Route) gerekli güncellemeleri yap.
- **Onay Mekanizması:** Kritik yapısal değişikliklerde (örneğin büyük bir tablonun silinmesi), işlemi taslak olarak beklet ve yönetici onayına (Human-in-the-loop) sun.

**🚫 Kesin Kısıtlamalar (Guardrails)**
- Ana uygulamanın canlı veritabanında (Production DB) ASLA doğrudan silme (DROP, DELETE) işlemi başlatma; yalnızca yönetim arayüzü kodlarını güncelle.
- Yönetim panelindeki güvenlik duvarlarını, yetkilendirme token'larını ve şifreleme yöntemlerini hiçbir koşulda esnetme veya değiştirme.

## Uygulama Koruma ve Onay Kuralı
**KESİN KURAL:** Kullanıcının (Tufan) açık ve yazılı onayı olmadan, uygulama asla yeni baştan yazılmayacak, mevcut dosyalar/yapı topluca silinmeyecek veya köklü mimari sıfırlamalar yapılmayacaktır. Her türlü büyük değişiklik ve yeniden yazım kararı önce kullanıcı onayına sunulmalıdır.

## Imported Claude Cowork project instructions

Odi.Pet Proje Talimatları ve Geliştirici Kılavuzu (Instructions)
Odi.Pet, evcil hayvan sahiplerinin dostlarının sağlık, aşı, gelişim, beslenme ve acil durum süreçlerini en kolay, modern ve premium şekilde yönetmelerini sağlayan cross-platform (Web & Mobil/PWA) destekli bir ekosistemdir.

🛠 Teknoloji Yığını (Tech Stack)
Uygulamanın çekirdek teknolojileri ve kullanılan modern kütüphaneler:

Framework: Next.js v16.2.4 (React 19, App Router)
Tasarım & Styling: Tailwind CSS v4
Veritabanı & Auth: Supabase (SSR entegrasyonu, Row Level Security - RLS, RPC Fonksiyonları)
PWA (Progressive Web App): Serwist v9.5 (Çevrimdışı destek, servis işçileri)
Form Yönetimi: react-hook-form & zod validation
Test Araçları:
Vitest (Unit ve entegrasyon testleri)
Playwright (Uçtan uca - E2E tarayıcı testleri)
📏 Temel Standartlar ve Kurallar
Uygulamada geliştirme yaparken ve yeni özellikler eklerken aşağıdaki kurallara kesinlikle ve istisnasız uyulmalıdır.

1. Yaş Skalası Standardı
Kedi ve köpeklerin yaş gruplandırması uygulama genelinde şu şekilde hesaplanmalı ve gösterilmelidir:

Yavru (Puppy/Kitten): 0 - 1 yaş arası
Yetişkin (Adult): 1 - 7 yaş arası
Yaşlı (Senior): 7 - 12 yaş arası
Yaşlı (Senior 12+): 12 yaş ve üzeri

2. Görsel Tasarım ve İkon Kuralları (Design Bible v1.0 Uyumlu)
🚫 İnsani İkonların Kullanımı Yasaktır: İnsan odaklı veya genel amaçlı ikonlar (örneğin aktivite için tenis raketi, beslenme için biftek resmi) kullanılmayacaktır. Yerine evcil hayvanların hayatına hitap eden nesneler (mama kabı, tırmalama tahtası, kemik vb.) tercih edilmelidir.
📐 Resmi İkonografi (Lucide Rounded Outline): Uygulama genelinde standart ikon seti olarak Lucide Rounded Outline kullanılır (16/20/24/32/48 px). Filled ikonlar yasaktır. Rastgele ikon renklendirmesi yapılmaz, dondurulmuş tasarım token'ları esas alınır.
🎨 OPOS Görsel ve İllüstrasyon Stili: İllüstrasyonlar Flat, Soft, Minimal, Rounded ve Premium nitelikte olmalıdır. Yalnızca dondurulmuş resmi marka varlıkları (`/public/brand/`) kullanılır.
🌈 Modüllere Özel Canlı Renk Paleti:
Grooming (Bakım/Kuaför): Pembe / Mor
Temizlik (Cleaning): Turkuaz / Teal
Aktivite (Activity): Turuncu / Kırmızı
Medikal / Sağlık (Medical): Mavi / Kırmızı
Veteriner (Vet): Koyu Mor / İndigo
Beslenme (Nutrition): Altın / Turuncu
✨ Mikro-Animasyonlar: Etkileşimli bileşenlerin üzerine gelindiğinde (hover) veya tıklandığında scale-[1.05] veya scale-[1.1] gibi yumuşak geçişli efektlerle derinlik verilmelidir.
3. Kullanıcı Deneyimi (UX) Felsefesi
Kolay ve Anlaşılır Deneyim: Kullanıcının uygulamayı kullanırken yorulmaması en büyük önceliğimizdir. Karışık oyunlaştırma kurguları veya aşırı doldurulmuş bilgi kartları yerine minimalist, temiz ve premium bir MVP deneyimi hedeflenir.
Progressive Profiling (Adım Adım Veri Toplama): Kullanıcıyı uygulamaya kayıt olurken uzun formlarla boğmayın. Mikroçip numarası, telefon numarası veya detaylı adres gibi kritik verileri sadece ilgili özelliğe ihtiyaç duyulduğunda (ör. "Smart Card" yardımıyla) aşama aşama isteyin.
4. Mimari Bütünlük ve Mobil/Web Uyumluluğu
Yapılan hiçbir geliştirme projenin mevcut dosya yapısını, routing kurgusunu veya mobil (responsive/PWA) uyumluluğunu bozmamalıdır.
Değişiklikler hem mobil cihaz ekranlarında hem de masaüstünde kusursuz çalışmalıdır.
Geriye dönük uyumluluk (backwards compatibility) kritik önem taşır. Supabase RLS kuralları ve mevcut API uç noktaları korunmalıdır.
🛠 Geliştirme ve Çalıştırma Adımları
Yerel Çalıştırma
Projeyi yerel bilgisayarınızda başlatmak için terminalden şu komutu kullanın:

bash

npm run dev
Testleri Çalıştırma
Uygulamada yazılan testleri çalıştırmak için aşağıdaki betikleri kullanabilirsiniz:

Unit Testleri (Vitest): npm run test
E2E Testleri (Playwright): npm run test:e2e
Tüm Testler: npm run test:all
Coverage Raporu: npm run test:coverage
Otonom Tarayıcı Denetimi
Kritik bir özellik geliştirildiğinde veya arayüz güncellendiğinde, sistemde UX veya iş mantığı hatası olup olmadığını denetlemek için şu komutu çalıştırabilirsiniz:

bash

/ux-audit [HEDEF_URL] [İsteğe Bağlı: Test Email:Şifre]
Bu komut, tarayıcı ajanını (browser subagent) otonom olarak başlatarak hedeflenen sayfada kapsamlı bir UX denetimi yapar ve ux_audit_report.md dosyası oluşturur.

Odi.Pet ile evcil dostlarımızın hayatını güzelleştirmeye devam ediyoruz! 🐾

## Odi Pet Product Operating System (OPOS) Dokümantasyon Mimarisi (4 Ana Kitap / 18 Cilt)
**BİRİNCİL MİMARİ KURAL:** Odi Pet ekosisteminde (Mobile App, Admin Platform, Insight Platform) geliştirilecek tüm modüller, ekranlar ve backend servisleri OPOS Design Bible v1.0 mimarisine uygun olarak 4 Ana Referans Kitabı altında yönetilir:

### 🟢 Kitap A: Brand & Identity (Cilt 1–5)
- **Cilt 1:** Brand Foundation (Marka Felsefesi, Vizyon, Misyon, Ses Tonu, Altın Kurallar)
- **Cilt 2:** Foundations (Logo, Renk Paleti, Tipografi, İkonografi, Spacing, Radius 24px, Elevation, Grid)
- **Cilt 3:** Component Library (Button, Card, Input, Timeline, Health Status, Bottom Sheet, Toast, Modal)
- **Cilt 4:** Product Patterns & User Flows (Authentication, Onboarding, Dashboard, Pet Profil, Aşı/Parazit)
- **Cilt 5:** Health Design System (Aşı, Parazit, Beslenme, İlaç, Alerji, Kilo, Lab Sonuçları, Health Timeline)

### 🔵 Kitap B: UX, UI & Design System (Cilt 6–13)
- **Cilt 6:** Data Architecture & Information Model (Canonical Data, Single Source of Truth, Entities)
- **Cilt 7:** Engineering Standards (Katmanlı Mimari, Feature Structure, React/Hook Standartları, CI/CD, Definition of Done)
- **Cilt 8:** Accessibility & Inclusive Design (WCAG 2.2 AA, 44px Touch Target, Contrast, Screen Reader, Keyboard Nav)
- **Cilt 9:** Content Design & Voice System (Yazım Kuralları, CTA Felsefesi, Hata Mesajları, Bildirim Dili)
- **Cilt 10:** Motion & Animation System (Motion Tokenları, Easing, Sayfa/Kart Geçişleri, Reduced Motion)
- **Cilt 11:** Illustration, Iconography & Visual Language (Resmi Logo, Lucide Outline, Soft/Flat Görsel Dili)
- **Cilt 12:** Marketing, Social Media & Brand Experience (ASO, Landing Page, Sosyal Medya Standartları)
- **Cilt 13:** AI Design System (AI Veteriner Yardımcısı, OCR, Explainability, Confidence Score, Human-in-the-Loop)

### 🟠 Kitap C: Admin, Insight & Data (Cilt 14–16)
- **Cilt 14:** Admin Platform & Backoffice Design System (RBAC, Moderasyon, CMS, Operasyon Merkezi)
- **Cilt 15:** Odi Pet Insight Platform (B2B Analitik, Data Warehouse, Coğrafi/Demografik/Beslenme Analizleri)
- **Cilt 16:** Data, Analytics & AI Governance (Event Stream, KPI Kataloğu, Veri Kalite Skoru, Anonimleştirme)

### 🔴 Kitap D: Security & Governance (Cilt 17–18)
- **Cilt 17:** Security, Privacy & Compliance (Security by Design, KVKK/GDPR, RLS, TLS 1.3, Signed URLs, Audit)
- **Cilt 18:** Product Governance, Release Management & Ecosystem Roadmap (Semantic Versioning, Feature Flags, Release Quality Gate)

## Brand Compliance Gate (Kalıcı Marka ve Varlık Güvenlik Kapısı)
**KESİN VE KALICI KURAL (ABSOLUTE BRAND LOCK & COMPLIANCE GATE):**
Tüm Odi.Pet tasarımı, mockup üretimi, arayüz bileşeni ve kod geliştirmelerinde:
1. **Yalnızca Dondurulmuş Resmi Varlıklar Kullanılır (`/public/brand/`):**
   - Official Odi Pet Master Logo, Horizontal Logo, Vertical Logo, App Icon, Splash Logo, Social Avatar, Watermark, Favicon.
   - Official OPOS Illustration System, Lucide-based Iconography System, Official Color Tokens ve Typography System.
2. **Yapay / Placeholder Marka ve Görsel Yasaktır:**
   - PETPAL, FurEver, PetBuddy, PawCare veya herhangi bir sahte/placeholder marka ismi **KESİNLİKLE KULLANILAMAZ**.
   - Yapay zeka ile logo, ikon, illüstrasyon, maskot, renk paleti, splash veya tipografi **ÜRETİLEMEZ**.
3. **Zorunlu Doğrulama ve Durdurma (Brand Compliance Gate Check):**
   - Herhangi bir ekran veya bileşen tamamlanmadan önce markaya uyum kontrol edilir.
   - Eğer resmi olmayan tek bir logo, ikon, renk veya placeholder marka ismi tespit edilirse **İŞLEM DERHAL DURDURULUR (STOP)** ve değişiklik uygulanmaz, kullanıcıya Marka İhlal Raporu sunulur.
4. **Adım Adım Tek Ekran Onay Protokolü:**
   - Mockup ve migration sürecinde ekranlar teker teker işlenir. Tufan'dan açık ve yazılı onay alınmadan bir sonraki ekrana geçilemez.

## OPOS Definition of Done (DoD) & Private Storage / Signed URL Güvenlik Anayasası (Cilt 7.29 & Cilt 17)
**🔒 TANIMLI DONE (DoD) KALİTE KAPISI VE GÜVENLİK ANAYASASI:**
Üretim ortamına (Production) sunulacak tüm yeni özellikler, refactor'lar ve backend/frontend güncellemeleri aşağıdaki 8 maddelik "Definition of Done (DoD)" kalite kapısından (%100 geçmek kaydıyla) ve Private Storage / Signed URL güvenlik kurallarına tam uygun olmak zorundadır. Eksik test veya eksik güvenlik kontrolü içeren kodların canlıya alınması KESİNLİKLE YASAKTIR.

### 1. 8 Maddelik "Definition of Done (DoD)" Kalite Kapısı (Cilt 7.29)
Bir görevin/biletin tamamlanmış ("Done") kabul edilmesi için 8 kriterin tamamının eksiksiz sağlanması zorunludur:
1. **Veritabanı ve RLS Tamlığı (Supabase Security):** Yeni veya güncellenen tüm veritabanı tablolarında Row Level Security (RLS) politikaları eksiksiz tanımlanmış ve yetkisiz erişim/mutasyon testleri yapılmış olmalıdır.
2. **Kanonik Veri & SSOT Uyumu:** Sağlık ve profil verilerinde veri tekrarı yapılmamış, mutasyonlar tek kanonik servis üzerinden yürütülmüş, silme yerine arşivleme (`is_archived`) mantığı uygulanmış olmalıdır.
3. **Birim ve Entegrasyon Testleri (Vitest):** İlgili iş mantığı, kanonik servisler ve util fonksiyonları için yazılan Vitest unit/integration testleri yeşil (pass) olmalıdır (`npm run test`).
4. **Uçtan Uca Tarayıcı Testi (Playwright / UX Audit):** Kullanıcı akışı kritik bir modül içeriyorsa Playwright veya `/ux-audit` tarayıcı testi çalıştırılarak hata almadığı ve akışın kırılmadığı doğrulanmalıdır (`npm run test:e2e`).
5. **OPOS Design Bible v1.0 Uyumu:** UI elemanları 24px radius, 8pt spacing grid, Lucide rounded outline ikonlar, dondurulmuş renk/tipografi token'ları ve dokunsal mikro-animasyonlar (`active:scale-[0.98]`) standartlarına tam uymalıdır.
6. **Cross-Platform & Duyarlı Tasarım (Mobile-First):** Bileşenler ve sayfalar minimum 375px mobil ekran genişliğinden masaüstüne kadar tüm kırılma noktalarında duyarlı (responsive) ve PWA uyumlu çalışmalıdır.
7. **Erişilebilirlik ve Performans (WCAG AA & Zero Console Error):** Dokunma alanları minimum 44x44px, tipografi WCAG 2.1 AA kontrast şartını sağlamalı; konsolda hiçbir runtime error veya unhandled rejections bulunmamalıdır.
8. **Tip Güvenliği ve Derleme (Zero TypeScript Error & Build Pass):** Tüm kod katı TypeScript tip denetiminden geçmeli (`npm run build` veya `tsc --noEmit`), hiçbir `any` kaçamağı yapılmamalıdır.

### 2. Private Storage & Signed URL Güvenlik Standartları (Cilt 17)
Evcil hayvan sağlık belgeleri, aşı karneleri, veteriner reçeteleri, laboratuvar/tetkik sonuçları, kullanıcı kimlik/profil görselleri ve hassas medya dosyaları için aşağıdaki depolama güvenlik kuralları zorunludur:
1. **Kamuya Açık (Public) Storage Yasaktır:** Hassas evcil hayvan sağlık verileri ve kullanıcı medyaları kesinlikle public bucket'larda saklanamaz. Tüm hassas medya depolama alanları **Private Bucket** olmak zorundadır.
2. **Zaman Sınırlı Signed URL Kullanımı:** Private storage üzerindeki dosyalara erişim ve görüntüleme yalnızca zaman sınırlı (örneğin maksimum 1 saat geçerli / `createSignedUrl`) geçici imzalı URL'ler (Signed URLs) üzerinden sağlanır.
3. **Storage RLS & İstemci İzolasyonu:** Supabase Storage seviyesinde RLS politikaları aktif edilmeli; kullanıcılar yalnızca kendi sahip oldukları (`auth.uid() = owner_id`) evcil hayvanlara ait özel medyalara erişebilmeli veya Signed URL talep edebilmelidir.
4. **URL Sızması ve Doğrudan CDN Bağlantısı Engeli:** Doğrudan dosya yollarına (raw URL) link verilmesi, önbellek bileşenlerinde veya client-side state'lerde kalıcı dosya bağlantısı saklanması yasaktır. İmzalı URL'lerin süresi dolduğunda otomatik olarak yenilenmesi veya güvenli sunucu katmanından türetilmesi gereklidir.


