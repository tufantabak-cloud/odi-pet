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

## Veri Toplama Stratejisi (Progressive Profiling)
**BİRİNCİL KURAL:** Kullanıcıdan boş, upuzun formlar doldurması İSTENMEYECEK.
Odi.Pet Veri Toplama ve Zaman Matrisi (Progressive Profiling) süreci her daim gözetilecek ve sisteme adım adım dahil edilecektir:
1. İstenen veri (örneğin telefon no, mikroçip, konum), kullanıcıya sunulacak spesifik bir **özelliğin/faydanın kapsama bedeli** olarak bağlamsal şekilde (Smart Card vb.) istenecek.
2. Profili zenginleştirme süreci, sadece özelliklerin tetiklemesiyle kalmayacak, aynı zamanda "Profili Zenginleştir" (Enrich Profile) oyunlaştırma modülü ile entegre bir şekilde, aşama aşama ilerletilecektir.
