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
2. **Yarı-3D İllüstrasyon Stili (Semi-3D Style):** İkonlar düz (flat) tek renkli çizgiler veya sıkıcı emojiler yerine; zengin gradyanlar (gradyan yönleri ve uyumlu renk çiftleri), katmanlı çizimler ve derinlik hissi veren yumuşak gölgeler (`feDropShadow`) içermelidir. *(İstisna: Kullanıcı KAPI veya Work Order bağlamında özellikle "flat/düz MVP tasarımı" veya "framer-motion/3D olmadan" talep ederse, bu kural iptal olur ve performans/basitlik odaklı Tailwind UI standartları uygulanır.)*
3. **Canlı Renk Paleti:** Odi.Pet marka bütünlüğü için pembe/mor (Grooming), turkuaz/teal (Temizlik), turuncu/kırmızı (Aktivite), mavi/kırmızı (Medikal), koyu mor/indigo (Veteriner), altın/turuncu (Beslenme) gibi canlı, sıcak ve yüksek kaliteli renk geçişleri standart kabul edilecektir.
4. **İnteraktif Geri Bildirim:** Etkileşimli tüm görsel öğeler, üzerine gelindiğinde veya seçildiğinde yumuşak animasyonlarla (`scale-[1.05]` veya `scale-[1.1]`) hafifçe büyümeli ve renk geçişleriyle kullanıcıya premium bir etkileşim hissi sunmalıdır.

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
