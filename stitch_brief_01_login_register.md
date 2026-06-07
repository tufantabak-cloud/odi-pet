# Odi.Pet — Stitch Redesign Brief #01
## Login & Kayıt Ekranları

---

## HEDEF

Bu iki ekran uygulamaya ilk giriş noktasıdır. Kullanıcının marka hakkında ilk izlenimi burada oluşur. Mevcut yapı işlevsel ama görsel hiyerarşi ve mobil UX açısından iyileştirme alanı var. Yeni tasarım bu ekranları **premium, güven verici ve parmakla kullanımı kolay** hale getirmelidir.

---

## PLATFORM

- **Öncelikli viewport:** 390px genişlik (iPhone 14) — mobil önce
- **Yükseklik:** `100dvh` (iOS Safari uyumlu)
- Masaüstünde ortalanmış kart görünümü (max-width: ~420px)
- Header yok, Footer yok — tam ekran auth sayfaları

---

## MARKA TOKENLERİ

```
Ana renk (primary):   #4F2DBA
Hover:                #3C2096
Soft bg:              #F5F3FF
Başlık metni:         #0F172A
İkincil metin:        #64748B
Yüzey (kart):         #FFFFFF
Sayfa arka planı:     #F8FAFC
Border:               #F1F5F9
Hata:                 #EF4444
Başarı:               #22C55E

Sayfa gradient:       from-primary/5 (sol alt) → transparent → primary/5 (sağ üst)

Border radius:
  Kart:    32px
  Buton:   14px
  Input:   12px

Gölge:
  Kart:    shadow-2xl + shadow-primary/5
  Buton:   shadow-xl + shadow-primary/20 (hover: /40)

Font: Inter
```

---

## EKRAN 1 — GİRİŞ (LOGIN)

### Mevcut Yapı (Ne Var)

Tek sayfa, kart içinde form. Yukarıdan aşağıya sıra:

1. Logo (96×96px, rounded-24px, tıklanabilir → anasayfa)
2. Başlık: **"Sevgiyle Bak, Sağlıkla Büyüt"** (28px, font-black)
3. Alt başlık: "Hoş Geldiniz" (13px, primary/80, uppercase, letter-spacing)
4. **Google** butonu + **Apple** butonu — yan yana (50/50)
5. Ayraç: "— veya —"
6. E-posta input (label üstte, 12px uppercase)
7. Şifre input + göster/gizle toggle (sağda Eye ikonu)
8. "Beni Hatırla" checkbox (sol) + "Şifremi Unuttum" link (sağ)
9. **Giriş Yap** butonu (full-width, primary, 56px yükseklik)
10. **Biyometrik Giriş** butonu (WebAuthn — destekleyen cihazlarda görünür)
11. "Hesabınız yok mu? Hemen Kayıt Olun" link
12. Footer: "🔒 256-bit SSL" + "🛡️ KVKK Uyumlu"

### Durum Yönetimi (Tasarımda Gösterilmeli)

| Durum | Gösterim |
|-------|----------|
| Yükleniyor | Buton içinde spinner + "Giriş yapılıyor…" |
| Başarılı | Form kaybolur, yeşil ✓ ikonu + "Hoş Geldiniz!" overlay |
| Hata | Kırmızı uyarı banner (form üstünde, ⚠️ ile) |
| Lockout | Buton devre dışı + 🔒 geri sayım sayacı (X saniye bekleyin) |
| Oturum süresi doldu | Amber uyarı banner (⏱️ ikonu ile) |

### Mevcut Sorunlar / İyileştirme Alanları

- Logo bölümü + başlık çok yer kaplıyor, kaydırma gerektiriyor
- Google ve Apple butonları yan yana dar görünüyor, label sadece "Google" / "Apple" — ikon + metin dengesi zayıf
- "Beni Hatırla" ve "Şifremi Unuttum" aynı satırda — küçük ekranda sıkışıyor
- Biyometrik giriş butonu bağımsız bir tasarıma sahip değil, form altına takılmış görünüyor
- Dekoratif pati SVG ve köşe gradyanları mevcut ama görsel etkisi zayıf

---

## EKRAN 2 — KAYIT (REGISTER)

### Mevcut Yapı (Ne Var)

**2 adımlı form** — yatay slide animasyonlu geçiş:

#### Adım 1
1. Logo + başlık ("Yeni Hesap Oluştur") + alt metin
2. **Google** + **Apple** butonları (yan yana)
3. Ayraç: "— veya —"
4. **Ad Soyad** input
5. **E-posta** input
6. **"İleri →"** butonu (full-width, primary)
7. "Zaten hesabınız var mı? Giriş Yapın" link

#### Adım 2
1. "← Geri Dön" link (üst sol)
2. **Şifre** input + göster/gizle toggle
3. **Şifre güç göstergesi:** 3 parçalı progress bar (kırmızı / sarı / yeşil)
4. Güç etiketi: "Zayıf / Orta / Güçlü"
5. **Canlı şifre kuralları listesi** (✓ / ○ ile):
   - En az 8 karakter
   - En az 1 büyük harf
   - En az 1 rakam
6. **Şifreyi Onayla** input + toggle
7. **KVKK/Kullanım Koşulları** onay checkbox + linkler
8. **"Kayıt Ol ve Başla"** butonu (full-width, primary)
9. Footer: "🔒 SSL" + "🛡️ KVKK"

#### Başarı Ekranı (Step 3 — tam ekran kart)
- Yeşil ✓ ikonu (80px daire)
- "Aramıza Hoş Geldiniz!" başlığı
- E-posta doğrulama yönlendirme metni
- **"Giriş Sayfasına Git"** butonu (primary)
- **"E-postayı Tekrar Gönder"** butonu (secondary/ghost)

### Mevcut Sorunlar / İyileştirme Alanları

- Adım 1 ve 2 arasında ilerleme göstergesi yok — kullanıcı kaç adım olduğunu bilmiyor
- Adım 2'de "← Geri Dön" sadece metin link, belirgin bir buton değil
- Şifre güç göstergesi renk geçişi iyi ama çok küçük (h-1.5)
- Başarı ekranı ayrı bir "sayfaya geçiş" gibi hissettiriyor, animasyonla akarak gelmesi daha iyi olur

---

## HER İKİ EKRAN İÇİN ORTAK KURALLAR

### Zorunlu UI Öğeleri
- Odi.Pet logosu (her ekranda üstte)
- Google OAuth butonu
- Apple OAuth butonu
- E-posta + şifre ile klasik form
- Hata/başarı durum mesajları

### Dokunma & Erişilebilirlik
- Tüm tıklanabilir öğeler min **44×44px**
- Input `font-size: 16px` (iOS zoom engeli)
- `active:scale-[0.97]` dokunma geri bildirimi
- Hata mesajları form alanının hemen altında, 11px kırmızı

### Animasyon Beklentileri
- Sayfa ilk açılışta: `fade-in + slide-from-bottom` (0.4–0.5s)
- Başarılı giriş: form `opacity-0 + scale-95 + blur`, yerine başarı overlay `zoom-in`
- Kayıt adım geçişi: yatay `translateX` slide (500ms ease-in-out)
- Hata banner: `fade-in + slide-from-bottom` (300ms)

### İçerik Hiyerarşisi (Öncelik Sırası)
1. Logo — marka kimliği, güven
2. Sosyal giriş butonları (Google/Apple) — sürtünmesiz yol
3. E-posta form — klasik yol
4. Yardımcı linkler (şifremi unuttum, kayıt ol)
5. Güven işaretleri (SSL, KVKK) — en alta, küçük

---

## BEKLENTILER

Stitch'in kendi görsel kararlarını özgürce verebileceği alanlar:

- Logo ve başlık bölümünün layout düzeni
- Sosyal buton tasarımı (ikon boyutu, metin, düzen)
- Adım göstergesi tasarımı (register için)
- Şifre güç göstergesinin görsel işlenmesi
- Güven ikonları (SSL/KVKK) bölümünün stilizasyonu
- Sayfa arka plan dokusu / gradyan yaklaşımı
- Mobilde klavye açıldığında form kaydırma davranışı

**Değiştirilmemesi gereken:**
- Renk token'ları (#4F2DBA primary, hata/başarı renkleri)
- Form alanlarının sırası ve içeriği
- Biyometrik giriş bileşeninin varlığı (login'de)
- 2 adımlı kayıt akışı
- KVKK onay kutusu (yasal zorunluluk)

---

*Odi.Pet Stitch Brief #01 — 2026-06-06*
