# Odi.Pet UX Audit Raporu: Topluluk ve Ekstra Modüller

**Tarih:** 18 Haziran 2026
**Denetlenen Rotalar:**
1. `/owner/ai-vet`
2. `/owner/social`
3. `/owner/vets`

**Kapsam:** UI yerleşimleri (Layout), buton hitbox kısıtları (minimum 44x44px / 50px kuralı) ve klavye çakışma (pb-safe / safe-area-inset) riskleri.

---

## 1. AI Vet Modülü (`/owner/ai-vet`)
**Genel Durum:** Arayüz oldukça interaktif ve sohbet (chat) odaklı. Klavye açıldığında input alanının ekranda kalması için "safe-area" kullanımı doğru kurgulanmış. Ancak dokunulabilir alanlarda (hitboxes) bazı sorunlar mevcut.

* **UI Layout & Keyboard (pb-safe):** 
  * Girdi (Input) alanının `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` kullanılarak desteklenmesi çok olumlu. Klavye açıldığında alt çentik veya klavye üstü sorunları yaşanmaması için doğru bir pratik.
* **Button Constraints (Hitbox İhlalleri):**
  * **Header Geri Butonu:** `w-10 h-10` (40x40px) olarak tanımlanmış. Apple HIG ve genel UX kuralları gereği minimum `44x44px` olmalıdır (`w-11 h-11`).
  * **Hızlı İstekler (Quick Prompts) & Follow-up Chips:** `px-3 py-1.5` şeklinde padding verilmiş. Text boyutu `text-[12px]`. Toplam yükseklik tahmini 30-32px aralığında kalıyor. Mobil ekranda basması zor. Minimum `min-h-[44px]` (veya `min-h-[40px]` ancak geniş hitbox padding ile) desteklenmeli.
  * **Gönder (Send) Butonu:** `px-5` padding'e sahip, global `btn-primary` class'ı kullanılmış. `btn-primary` içinde `min-h-[50px]` gibi bir zorunluluk yoksa burası da hedef boyutun altında kalabilir. Test edilmeli.

## 2. Sosyal Dünya Modülü (`/owner/social`)
**Genel Durum:** Gelecek fazlar için tasarlanmış statik bir "Çok Yakında" (Placeholder) sayfası. Kart yapısı ve gölgelendirmeler premium hissettiriyor.

* **UI Layout & Keyboard (pb-safe):**
  * Sayfada form veya input olmadığı için klavye çakışma riski bulunmuyor.
  * Ana kapsayıcıdaki `pb-20`, alt navigasyon barı (Bottom Nav) ile içerik arasında güvenli bir boşluk sağlıyor.
* **Button Constraints (Hitbox İhlalleri):**
  * **Ana Sayfaya Dön Linki:** `btn-primary text-[14px]` kullanılmış. Herhangi bir padding (`py-3` vb.) veya yükseklik sınırlaması belirtilmemiş. `btn-primary` global css sınıfında padding tanımlı değilse, mobil ortamda çok ince bir butona dönüşerek 44x44px kuralını ihlal edebilir. Explicit olarak `py-3` veya `min-h-[50px]` eklenmesi önerilir.

## 3. Veterinerler Modülü (`/owner/vets`)
**Genel Durum:** Harita/Konum tabanlı listeleme ve detay gösterimi gayet fonksiyonel. Sticky footer aksiyonları başarılı.

* **UI Layout & Keyboard (pb-safe):**
  * Ana kapsayıcı `pb-28` ile alt navigasyon (ve varsa sistem çentiği) için bolca boşluk bırakmış, layout doğru.
  * Şehir/İlçe "select" elementleri doğal (native) picker'ları tetikler. Ekranda klavye açılmadığı için safe-area ihlali söz konusu değildir.
* **Button Constraints (Hitbox İhlalleri):**
  * **Listeye Geri Dön / Ana Sayfaya Dön Butonları:** Sadece text-sm font ve inline-flex ile konumlandırılmışlar. Dikey eksende `py` padding'i yok. Dokunmatik cihazlarda `hitbox` yüksekliği 20-24px civarında kalıyor. Hitbox alanını genişletmek için en az `py-2` eklenmeli ve tıklama alanı artırılmalıdır.
  * **Sticky Footer Butonları (Ara / Yol Tarifi Al):** `py-[16px]` kullanılmış, yükseklik 50px'in üzerinde. Kullanılabilirlik açısından mükemmel.
  * **GPS Denied "Şehir Seç" Butonu:** `py-[12px]`. Bu da 44px civarı bir yüksekliğe denk geliyor, yeterli.

---

### 💡 Geliştirme Önerileri (Aksiyon Planı)
1. **AI Vet Rota:** `w-10 h-10` olan icon-butonları `w-11 h-11` yapın. Quick prompts (çipler) için `min-h-[44px]` hissi yaratacak dikey boşluk veya `py-2.5` padding uygulayın.
2. **Social Rota:** `btn-primary`'nin default padding ayarlarını kontrol edin, eğer yoksa `py-3.5` veya `min-h-[50px]` zorunluluğu ekleyin.
3. **Vets Rota:** Geri dönmek için kullanılan metin butonlarına (Listeye Geri Dön, Geri Dön vs.) `p-2` veya `py-3 -my-3` gibi şeffaf dokunmatik alanlar ekleyerek hitbox boyutunu 44px seviyesine çekin.
