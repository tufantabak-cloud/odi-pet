## Kilitli Bölge: Pet Detay Hero ve Kapak Alanı (OPOS Design Bible v1.0 Uyumlu)
**🔒 KİLİTLİ BÖLGE KURALI:**
Aşağıdaki dosyalara ve özellikle belirtilen alanlara, kullanıcının (Tufan) açık onayı olmadan **KESİNLİKLE DOKUNULMAYACAKTIR**:
- `src/components/pets/PetHeroCard.tsx`
- `src/components/pets/PetDetailClient.tsx` → Sadece *hero* ve *kapak fotoğrafı* ile ilgili bölümleri.

**OPOS Design Bible v1.0 Uyumlaştırma Prosedürü:**
Söz konusu bileşenler Odi Pet Design Bible v1.0 (Cilt 3.2 Card System & Cilt 4.3 Dashboard / 4.4 Pet Profil) mimari standartlarına tabidir. Tufan'dan yazılı onay alındığı takdirde; bu kilitli dosyalar Design Bible v1.0 standartlarına (24px Radius, Primary Purple token'ları, Responsive & WCAG AA) uygun olarak refactor edilebilir. Tufan'ın açık ve yazılı onayı gelmeden kod değiştirilemez.

## Brand Compliance Gate (Kalıcı Marka ve Varlık Güvenlik Kapısı)
**🔒 KESİN VE KALICI KURAL (ABSOLUTE BRAND LOCK):**
- Yalnızca resmi `/public/brand/` varlıkları kullanılır.
- PETPAL, FurEver, PetBuddy, PawCare vb. sahte/placeholder marka isimleri ve AI üretimi logo/ikon/renk kullanımı **KESİNLİKLE YASAKTIR**.
- Herhangi bir marka ihlalinde işlem DERHAL DURDURULUR.
- Ekranlar teker teker işlenir; Tufan'ın yazılı onayı olmadan bir sonraki ekrana geçilemez.

## OPOS Foundations & Token Anayasası (Spacing, Radius, Elevation & Motion v1.0)
**BİRİNCİL TASARIM TOKEN KURALI:** Uygulama genelinde "Design Bible v1.0" standartlarına uygun dondurulmuş tasarım token'ları kullanılacaktır.
- **Spacing (8pt Grid Rhythm):** 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px. Keyfi `p-[13px]`, `m-[17px]` vb. yasaktır.
- **Corner Radius (24px Rule):** Kart/Container/Modal 24px (`rounded-3xl` / `rounded-[24px]`). Sert (0px) veya keyfi radius yasaktır.
- **Shadow & Elevation (Glassmorphic Stack):** Sert, simsiyah gölgeler (`shadow-2xl`) yasaktır; camlaşma (backdrop-blur) ve diffused yumuşak gölgeler (`shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]`) esastır.
- **Motion & Animation:** Tactile press (`active:scale-[0.98]`), hover lift (`hover:scale-[1.02]`/`1.05`), `duration-200`/`300 ease-out`. Keskin/titreyen animasyonlar yasaktır.

## OPOS Cilt 3: Bileşen Sistemi ve Yönetişim Anayasası (07 Component System v1.0)
**🔒 BİLEŞEN SİSTEMİ VE YÖNETİŞİM KURALI:**
Uygulama genelindeki tüm arayüz geliştirmelerinde **"07 COMPONENT SYSTEM - Odi Pet UI Components v1.0"** (20 temel bileşen grubu) ve 4 adımlı **Bileşen Yönetişim Hiyerarşisi** (Mevcut bileşeni kullan -> Genişlet -> Yeni bileşen yaz -> Brand Book'a ekle) tek ve bağlayıcı standart olarak kesintisiz uygulanacaktır.

## OPOS Canonical Data & Sağlık Verisi Koruma Kuralları (Cilt 5 & 6)
**🔒 KANONİK VERİ VE SAĞLIK KORUMA KURALI:**
1. **Single Source of Truth (Cilt 6):** Her veri domain'i için tek kanonik tablo ve tek mutasyon servisi vardır. Veri tekrarı yasaktır.
2. **Dashboard/Timeline Veri Üretmez (Cilt 5 & 6):** Dashboard ve Sağlık Zaman Çizelgesi sadece read-only aggregation görüntüler, doğrudan veri mutasyonu yapmaz.
3. **Sağlık Verisi Silinemez, Sadece Arşivlenir (Cilt 5):** Tıbbi/sağlık verileri (aşı, parazit, alerji, reçete, kilo vb.) veritabanından kalıcı olarak silinemez (hard delete yasaktır); yalnızca `is_archived = true` veya `archived_at` ile arşivlenir.

## OPOS AI Governance & Human-in-the-Loop Kuralları (Cilt 13)
**🔒 AI YÖNETİŞİMİ VE KULLANICI ONAYI ANAYASASI:** Yapay zekanın (AI Veteriner, OCR Belge Analizi, Akıllı Beslenme & Sağlık Önerileri vb.) güvenli, şeffaf ve yasal sorumluluk sınırları dahilinde çalışmasını sağlamak amacıyla aşağıdaki kurallar kesintisiz uygulanır:
1. **AI Görsel & İkon Standardı (Mor Yıldız / Sparkles Indicator - Cilt 13):** Yapay zeka tarafından üretilen, desteklenen veya türetilen tüm içerik, öneri, bildirim, form ve kartlarda AI aidiyetini netleştiren Mor Yıldız / Sparkles ikonu (`Sparkles`) ve mor görsel vurgu (mor/violet tonları `text-purple-600`, `bg-purple-50` vb.) standart visual indicator olarak kullanılır.
2. **Human-in-the-Loop & Onay Zorunluluğu (Habersiz Veri Kaydı Yasaktır - Cilt 13):** Yapay zeka hiçbir koşulda kullanıcıdan habersiz veya otonom olarak veritabanına doğrudan veri kaydı, güncellemesi veya silmesi (otomatik mutasyon) YAPAMAZ. AI tarafından türetilen tüm veriler kullanıcıya bir "Taslak İnceleme ve Onay UI" ile sunulur. Kullanıcı açıkça **"Onayla ve Kaydet"** eylemini gerçekleştirmedikçe veritabanında hiçbir kanonik tablo mutasyona uğramaz.
3. **Confidence Score & Açıklanabilirlik (Güven Skoru ve Neden-Sonuç İlişkisi - Cilt 13):** AI tarafından üretilen tüm tıbbi/sağlık önerileri, semptom analizleri ve OCR veri çıkarma sonuçlarında kullanıcıya bir Güven Skoru (Confidence Score - örn. %85 Güven) ve Açıklanabilirlik Metni (Explainability / "Neden bu öneri yapıldı?") sunulmalıdır. Düşük güven skoruna (%70 altı) sahip çıktılarda kullanıcı verileri manuel olarak doğrulaması konusunda uyarılır.
4. **Yasal Sorumluluk & Tıbbi Sorumluluk Reddi (Medical Disclaimer & Sorumluluk Sınırı - Cilt 13):** AI Veteriner Yardımcısı ve sağlık öneri sistemleri kesinlikle veteriner hekim teşhisi veya tedavisi yerine geçmez. Tüm AI tavsiye ve analiz çıktılarında görünür şekilde **"Bu bir klinik teşhis değildir. Acil durumlarda ve şüpheli durumlarda mutlaka lisanslı bir veteriner hekime danışınız."** tıbbi sorumluluk reddi (Medical Disclaimer) ibaresi yer almalıdır.

## OPOS Definition of Done (DoD) & Private Storage / Signed URL Güvenlik Anayasası (Cilt 7.29 & Cilt 17)
**🔒 TANIMLI DONE (DoD) KALİTE KAPISI VE GÜVENLİK ANAYASASI:**
Üretim ortamına (Production) sunulacak tüm yeni özellikler, refactor'lar ve backend/frontend güncellemeleri aşağıdaki 8 maddelik "Definition of Done (DoD)" kalite kapısından (%100 geçmek kaydıyla) ve Private Storage / Signed URL güvenlik kurallarına tam uygun olmak zorundadır. Eksik test veya eksik güvenlik kontrolü içeren kodların canlıya alınması KESİNLİKLE YASAKTIR.

1. **Veritabanı ve RLS Tamlığı (Supabase Security):** Yeni veya güncellenen tüm veritabanı tablolarında Row Level Security (RLS) politikaları eksiksiz tanımlanmış ve yetkisiz erişim/mutasyon testleri yapılmış olmalıdır.
2. **Kanonik Veri & SSOT Uyumu:** Sağlık ve profil verilerinde veri tekrarı yapılmamış, mutasyonlar tek kanonik servis üzerinden yürütülmüş, silme yerine arşivleme (`is_archived`) mantığı uygulanmış olmalıdır.
3. **Birim ve Entegrasyon Testleri (Vitest):** İlgili iş mantığı, kanonik servisler ve util fonksiyonları için yazılan Vitest unit/integration testleri yeşil (pass) olmalıdır (`npm run test`).
4. **Uçtan Uca Tarayıcı Testi (Playwright / UX Audit):** Kullanıcı akışı kritik bir modül içeriyorsa Playwright veya `/ux-audit` tarayıcı testi çalıştırılarak hata almadığı ve akışın kırılmadığı doğrulanmalıdır (`npm run test:e2e`).
5. **OPOS Design Bible v1.0 Uyumu:** UI elemanları 24px radius, 8pt spacing grid, Lucide rounded outline ikonlar, dondurulmuş renk/tipografi token'ları ve dokunsal mikro-animasyonlar (`active:scale-[0.98]`) standartlarına tam uymalıdır.
6. **Cross-Platform & Duyarlı Tasarım (Mobile-First):** Bileşenler ve sayfalar minimum 375px mobil ekran genişliğinden masaüstüne kadar tüm kırılma noktalarında duyarlı (responsive) ve PWA uyumlu çalışmalıdır.
7. **Erişilebilirlik ve Performans (WCAG AA & Zero Console Error):** Dokunma alanları minimum 44x44px, tipografi WCAG 2.1 AA kontrast şartını sağlamalı; konsolda hiçbir runtime error veya unhandled rejections bulunmamalıdır.
8. **Tip Güvenliği ve Derleme (Zero TypeScript Error & Build Pass):** Tüm kod katı TypeScript tip denetiminden geçmeli (`npm run build` veya `tsc --noEmit`), hiçbir `any` kaçamağı yapılmamalıdır.

**🔒 Private Storage & Signed URL Güvenlik Standartları (Cilt 17):**
- Hassas evcil hayvan sağlık belgeleri ve kullanıcı medyaları kesinlikle public bucket'larda saklanamaz (**Private Bucket** zorunludur).
- Private storage üzerindeki dosyalara erişim ve görüntüleme yalnızca zaman sınırlı (geçici imzalı / `createSignedUrl`) URL'ler üzerinden sağlanmalıdır.
- Supabase Storage seviyesinde RLS politikaları aktif edilmeli; kullanıcılar yalnızca kendi sahip oldukları evcil hayvanlara ait medyaları talep edebilmelidir.
- Kalıcı dosya yollarının (raw CDN URL) client-side'a sızması engellenmelidir.





