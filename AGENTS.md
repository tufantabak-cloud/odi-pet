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
