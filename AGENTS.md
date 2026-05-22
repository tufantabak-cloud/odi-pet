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

## Odi.Pet Görsel Tasarım ve İkon Standartları (Visual Design & Icon Rule)
**BİRİNCİL KURAL:** Uygulama genelinde kullanılacak tüm ikonlar, illüstrasyonlar ve görsel öğeler tek tip, kedi/köpek odaklı ve premium olmalıdır:
1. **İnsani İkonların Yasaklanması:** Tenis raketi (Aktivite), biftek eti (Beslenme) gibi insan odaklı veya jenerik ikonlar kesinlikle kullanılmayacaktır. Yerlerine doğrudan evcil hayvan hayatını simgeleyen tasarımlar (kemik, mama kabı, kedi kumu küreği, taşıma kafesi vb.) tercih edilmelidir.
2. **Yarı-3D İllüstrasyon Stili (Semi-3D Style):** İkonlar düz (flat) tek renkli çizgiler veya sıkıcı emojiler yerine; zengin gradyanlar (gradyan yönleri ve uyumlu renk çiftleri), katmanlı çizimler ve derinlik hissi veren yumuşak gölgeler (`feDropShadow`) içermelidir.
3. **Canlı Renk Paleti:** Odi.Pet marka bütünlüğü için pembe/mor (Grooming), turkuaz/teal (Temizlik), turuncu/kırmızı (Aktivite), mavi/kırmızı (Medikal), koyu mor/indigo (Veteriner), altın/turuncu (Beslenme) gibi canlı, sıcak ve yüksek kaliteli renk geçişleri standart kabul edilecektir.
4. **İnteraktif Geri Bildirim:** Etkileşimli tüm görsel öğeler, üzerine gelindiğinde veya seçildiğinde yumuşak animasyonlarla (`scale-[1.05]` veya `scale-[1.1]`) hafifçe büyümeli ve renk geçişleriyle kullanıcıya premium bir etkileşim hissi sunmalıdır.

## Veri Toplama Stratejisi (Progressive Profiling)
**BİRİNCİL KURAL:** Kullanıcıdan boş, upuzun formlar doldurması İSTENMEYECEK.
Odi.Pet Veri Toplama ve Zaman Matrisi (Progressive Profiling) süreci her daim gözetilecek ve sisteme adım adım dahil edilecektir:
1. İstenen veri (örneğin telefon no, mikroçip, konum), kullanıcıya sunulacak spesifik bir **özelliğin/faydanın kapsama bedeli** olarak bağlamsal şekilde (Smart Card vb.) istenecek.
2. Profili zenginleştirme süreci, sadece özelliklerin tetiklemesiyle kalmayacak, aynı zamanda "Profili Zenginleştir" (Enrich Profile) oyunlaştırma modülü ile entegre bir şekilde, aşama aşama ilerletilecektir.

## Dil Kuralı
**BİRİNCİL KURAL:** Bu uygulamayı geliştirirken kullanıcıyla her zaman **TÜRKÇE** konuşacaksın.

## Mimari Bütünlük ve Cross-Platform Uyumluluk Kuralı (Architectural Integrity & Compatibility)
**KRİTİK KURAL:** Uygulamada yapılacak **hiçbir güncelleme, düzeltme veya yeni özellik**; projenin mevcut kod mimarisini, ana hedefini ve web/mobil (cross-platform) uyumluluğunu **asla bozmamalıdır**. Her değişiklik mevcut sistemle **%100 uyumlu** olmalıdır.
1. **Mimari Koruma:** Mevcut dosya yapısı, modül organizasyonu, routing mantığı ve bileşen hiyerarşisi korunmalıdır. Yeni eklentiler mevcut mimariye uygun şekilde entegre edilmelidir.
2. **Cross-Platform Uyumluluk:** Tüm değişiklikler hem web hem de mobil (responsive/PWA) ortamlarda sorunsuz çalışmalıdır. Platform-specific bir değişiklik diğer platformları kırmamalıdır.
3. **Geriye Dönük Uyumluluk:** Mevcut API endpoint'leri, veri yapıları ve kullanıcı akışları bozulmamalıdır. Breaking change yapılması gerekiyorsa, kullanıcıdan açık onay alınmalıdır.
4. **Hedef Sadakati:** Uygulamanın ana hedefi (evcil hayvan bakım platformu) doğrultusundaki temel iş mantığı ve kullanıcı deneyimi her zaman öncelikli tutulmalıdır.

