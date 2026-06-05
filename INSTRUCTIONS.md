# Odi.Pet Proje Talimatları ve Geliştirici Kılavuzu (Instructions)

Odi.Pet, evcil hayvan sahiplerinin dostlarının sağlık, aşı, gelişim, beslenme ve acil durum süreçlerini en kolay, modern ve premium şekilde yönetmelerini sağlayan **cross-platform (Web & Mobil/PWA)** destekli bir ekosistemdir.

---

## 🛠 Teknoloji Yığını (Tech Stack)

Uygulamanın çekirdek teknolojileri ve kullanılan modern kütüphaneler:

- **Framework**: [Next.js v16.2.4](https://nextjs.org/) (React 19, App Router)
- **Tasarım & Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Veritabanı & Auth**: [Supabase](https://supabase.com/) (SSR entegrasyonu, Row Level Security - RLS, RPC Fonksiyonları)
- **PWA (Progressive Web App)**: [Serwist v9.5](https://serwist.dev/) (Çevrimdışı destek, servis işçileri)
- **Form Yönetimi**: `react-hook-form` & `zod` validation
- **Test Araçları**: 
  - [Vitest](https://vitest.dev/) (Unit ve entegrasyon testleri)
  - [Playwright](https://playwright.dev/) (Uçtan uca - E2E tarayıcı testleri)

---

## 📏 Temel Standartlar ve Kurallar

Uygulamada geliştirme yaparken ve yeni özellikler eklerken aşağıdaki kurallara **kesinlikle ve istisnasız** uyulmalıdır.

### 1. Yaş Skalası Standardı
Kedi ve köpeklerin yaş gruplandırması uygulama genelinde şu şekilde hesaplanmalı ve gösterilmelidir:
- **Yavru (Puppy/Kitten)**: 0 - 1 yaş arası
- **Yetişkin (Adult)**: 1 - 7 yaş arası
- **Yaşlı (Senior)**: 7 - 12 yaş arası
- **Yaşlı (Senior 12+)**: 12 yaş ve üzeri

### 2. Görsel Tasarım ve İkon Kuralları
- 🚫 **İnsani İkonların Kullanımı Yasaktır:** İnsan odaklı veya genel amaçlı ikonlar (örneğin aktivite için tenis raketi, beslenme için biftek resmi) kullanılmayacaktır. Yerine evcil hayvanların hayatına hitap eden nesneler (mama kabı, tırmalama tahtası, kemik vb.) tercih edilmelidir.
- 🎨 **Yarı-3D İllüstrasyon Stili (Semi-3D):** Düz, sıkıcı tek renkli çizgiler veya standart emojiler yerine; yumuşak geçişli gradyanlar, katmanlı SVG tasarımları ve hafif derinlik hissi veren gölgeler (`feDropShadow`) kullanılmalıdır.
- 🌈 **Modüllere Özel Canlı Renk Paleti:**
  - **Grooming (Bakım/Kuaför)**: Pembe / Mor
  - **Temizlik (Cleaning)**: Turkuaz / Teal
  - **Aktivite (Activity)**: Turuncu / Kırmızı
  - **Medikal / Sağlık (Medical)**: Mavi / Kırmızı
  - **Veteriner (Vet)**: Koyu Mor / İndigo
  - **Beslenme (Nutrition)**: Altın / Turuncu
- ✨ **Mikro-Animasyonlar:** Etkileşimli bileşenlerin üzerine gelindiğinde (hover) veya tıklandığında `scale-[1.05]` veya `scale-[1.1]` gibi yumuşak geçişli efektlerle derinlik verilmelidir.

### 3. Kullanıcı Deneyimi (UX) Felsefesi
- **Kolay ve Anlaşılır Deneyim:** Kullanıcının uygulamayı kullanırken yorulmaması en büyük önceliğimizdir. Karışık oyunlaştırma kurguları veya aşırı doldurulmuş bilgi kartları yerine minimalist, temiz ve premium bir MVP deneyimi hedeflenir.
- **Progressive Profiling (Adım Adım Veri Toplama):** Kullanıcıyı uygulamaya kayıt olurken uzun formlarla boğmayın. Mikroçip numarası, telefon numarası veya detaylı adres gibi kritik verileri sadece ilgili özelliğe ihtiyaç duyulduğunda (ör. "Smart Card" yardımıyla) aşama aşama isteyin.

### 4. Mimari Bütünlük ve Mobil/Web Uyumluluğu
- Yapılan hiçbir geliştirme projenin mevcut dosya yapısını, routing kurgusunu veya mobil (responsive/PWA) uyumluluğunu bozmamalıdır.
- Değişiklikler hem mobil cihaz ekranlarında hem de masaüstünde kusursuz çalışmalıdır.
- Geriye dönük uyumluluk (backwards compatibility) kritik önem taşır. Supabase RLS kuralları ve mevcut API uç noktaları korunmalıdır.

---

## 🛠 Geliştirme ve Çalıştırma Adımları

### Yerel Çalıştırma
Projeyi yerel bilgisayarınızda başlatmak için terminalden şu komutu kullanın:
```bash
npm run dev
```

### Testleri Çalıştırma
Uygulamada yazılan testleri çalıştırmak için aşağıdaki betikleri kullanabilirsiniz:
- **Unit Testleri (Vitest)**: `npm run test`
- **E2E Testleri (Playwright)**: `npm run test:e2e`
- **Tüm Testler**: `npm run test:all`
- **Coverage Raporu**: `npm run test:coverage`

### Otonom Tarayıcı Denetimi
Kritik bir özellik geliştirildiğinde veya arayüz güncellendiğinde, sistemde UX veya iş mantığı hatası olup olmadığını denetlemek için şu komutu çalıştırabilirsiniz:
```bash
/ux-audit [HEDEF_URL] [İsteğe Bağlı: Test Email:Şifre]
```
Bu komut, tarayıcı ajanını (browser subagent) otonom olarak başlatarak hedeflenen sayfada kapsamlı bir UX denetimi yapar ve `ux_audit_report.md` dosyası oluşturur.

---

*Odi.Pet ile evcil dostlarımızın hayatını güzelleştirmeye devam ediyoruz! 🐾*
