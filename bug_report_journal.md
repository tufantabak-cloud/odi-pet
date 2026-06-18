# Odi.Pet UX Audit Report: Journal Module

## 📍 İnceleme Kapsamı
- **Modül:** Günlük (Journal)
- **İncelenen Dosyalar:** 
  - `src/app/owner/pets/[id]/journal/new/[category]/JournalFormClient.tsx`
  - `src/app/owner/pets/[id]/journal/new/[category]/page.tsx`
  - `src/components/ui/SmartScanner.tsx`

---

## 🐞 Tespit Edilen UX/UI Hataları ve Geliştirme Önerileri

### 1. Text Alanlarındaki Dikey Esneklik (TextArea Flexibility)
- **Durum:** `JournalFormClient.tsx` içerisindeki "Opsiyonel Not" textarea alanı `<textarea className="input-base min-h-[100px] resize-none" ... />` olarak ayarlanmış. 
- **Sorun:** Sabit minimum yükseklik ve `resize-none` kullanımı, kullanıcı uzun bir metin yazdığında içeriği dar bir alana hapsediyor. Dinamik bir genişleme yok.
- **Öneri:** CSS `field-sizing: content` (modern browserlar için) veya `react-textarea-autosize` kullanılarak satır sayısına göre yüksekliği otomatik ayarlayan bir yapı kurularak metin alanına dikey esneklik kazandırılmalıdır.

### 2. Mobil Klavye ve Güvenli Alan İhlali (pb-safe)
- **Durum:** `page.tsx` ve `JournalFormClient.tsx` tasarımlarında formun en altına (Kaydet butonunun altına) `pb-safe`, `pb-24` veya CSS `env(safe-area-inset-bottom)` gibi bir dolgu (padding) uygulanmamış.
- **Sorun:** Mobil cihazlarda (özellikle iOS) klavye açıldığında "Kaydı Tamamla" butonu klavyenin altında (off-screen) kalabilir. Kullanıcı formu kaydedemez.
- **Öneri:** Formu veya genel sayfa yapısını saran elementine `pb-[calc(env(safe-area-inset-bottom)+100px)]` veya projenin kullandığı `pb-safe` gibi sınıflar eklenmelidir.

### 3. Görsel Yükleme Alanlarındaki Kaymalar (Layout Shifts)
- **Durum:** `SmartScanner.tsx` içindeki kamera ekranı sabit `h-[480px] sm:h-[500px]` kullanırken, resim ayarlama (kırpma) ekranında `aspect-[3/4] max-h-[300px]` kullanılmış.
- **Sorun/Değerlendirme:** Sabit `aspect-ratio` kullanımı genel olarak Layout Shift'i (CLS) başarıyla önlüyor, bu olumlu bir durum. Ancak `h-[480px]` küçük ekranlı mobil cihazlarda (iPhone SE vb.) ekranın büyük kısmını kaplayıp scroll sorununa yol açabilir.
- **Öneri:** Kamera container'ı için sabit `h-[480px]` yerine `aspect-[3/4] max-h-[60vh] w-full` gibi daha responsive oranlar kullanılabilir.

### 4. 50px Buton Kuralı
- **Durum:** `JournalFormClient.tsx` içerisindeki `Kaydı Tamamla` butonu şu sınıflara sahip: `py-3.5 text-[15px]`. 
- **Sorun:** Padding ve yazı boyutuyla buton yüksekliği cihazın font rendering'ine göre değişebilir (genelde 48-52px arası). Kesin 50px garantisi yoktur.
- **Öneri:** Odi.Pet UI kurallarına göre butonların net bir şekilde `min-h-[50px]` veya `h-[50px]` sınıflarıyla zorlanması gerekmektedir.

### 5. 44x44px Dokunma Alanı ve İkon Kuralları
- **Durum:** `JournalFormClient` içerisindeki "Reçete veya Raporu Tara" butonunda yer alan ikon `width="14" height="14"` olarak tanımlanmış. Buton padding'i de `px-4 py-2.5` şeklinde.
- **Sorun:** İkonun boyutları 44x44px standardından uzak. Apple HIG standartlarına göre minimum 44x44px etkileşim/ikon kapsayıcı alanı sağlamak premium hissiyat için gereklidir.
- **Öneri:** Buton içindeki ikonların etrafında yeterli whitespace olmalı (örn. `w-6 h-6` ikon boyutu) veya buton boyutu tamamen `min-h-[44px]` (yazı hariç icon-only butonlarda 44x44px) olarak optimize edilmelidir.

---

## 🎯 Sonuç ve Aksiyon
- Yukarıdaki maddeler MVP deneyimini olumsuz yönde etkilemektedir (özellikle mobil klavyenin kaydet butonunu gizlemesi).
- Düzeltmelerin `JournalFormClient.tsx` ve global layout sınıfları üzerinden yapılarak test edilmesi tavsiye edilir.
