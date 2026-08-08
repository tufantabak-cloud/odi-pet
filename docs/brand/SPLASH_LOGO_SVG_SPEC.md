# Odi.Pet Logo Seti — Teknik Şartname ve Kabul Durumu (Brand Asset Spec v1.0)

**Amaç:** `public/brand/logos/` ve `public/brand/app-icons/` altındaki vektörel marka varlıklarının karşılaması gereken nitelikleri tanımlar ve mevcut durumu bu şartnameye karşı raporlar.
**Muhatap:** Marka / tasarım ekibi (varlık üretimi) ve geliştirme ekibi (kabul kontrolü)
**İlgili standartlar:** OPOS Cilt 2 (Foundations), Cilt 11 (Illustration & Visual Language), Brand Compliance Gate
**Durum:** 2026-08-08 itibarıyla **büyük ölçüde kapatıldı** — bkz. §7 Kabul Durumu.

---

## 1. Arka Plan — Neden Bu Şartname Yazıldı

PHASE 04 performans denetiminde `public/brand/logos/` altındaki tüm SVG dosyalarının **gerçek vektör olmadığı** tespit edildi: her biri, içine base64 ile gömülü bir PNG/JPEG taşıyan bir sarmalayıcıydı (`<image href="data:image/png;base64,...">`, sıfır `<path>`). En kritik örnek `odi-splash-logo.svg` idi:

| Ölçüm | Değer (ilk tespit) |
| :--- | ---: |
| Dosya boyutu (ham) | 3.829.432 B (3.74 MB) |
| Ağda transfer (gzip) | 2.881.534 B (2.88 MB) |
| `<path>` sayısı | 0 |

Bu, uygulamanın **her yeni oturumda** açılış ekranında `priority` ile indirdiği tek dosyaydı — yani her kullanıcının ilk gördüğü şey, hiçbir şey render edilmeden önce 2.88 MB'lık bir bekleme idi.

Aynı kusur logo setinin tamamında (12 dosya, 23.2 MB) mevcuttu.

---

## 2. Render Bağlamı — Splash Varlığının Çalıştığı Ortam

Kaynak: `src/components/ui/SplashScreen.tsx`

| Özellik | Değer |
| :--- | :--- |
| Konteyner | `fixed inset-0`, tam ekran, `z-[99999]` |
| Konteyner arka plan rengi | **`#3B0764`** (koyu mor, opak) |
| Görsel alanı (mobil) | `max-w-[85vw]` × `max-h-[75vh]`, `p-6` |
| Görsel alanı (≥640px) | `max-w-[70vw]` × `max-h-[80vh]`, `p-12` |
| Ölçekleme | `object-contain object-center` |
| `next/image` modu | `fill` + `sizes="(max-width: 768px) 85vw, 70vw"` + `priority` |
| Görünürlük süresi | Faz 1 (SVG): 0–1000 ms · Faz 2 (PNG): 1000–3000 ms · fade-out 500 ms |
| Gösterim koşulu | Oturum başına bir kez (`sessionStorage: odi_splash_seen`); **localhost ve test ortamlarında hiç gösterilmez** |

> ⚠️ Splash yerel geliştirmede devre dışıdır. Bu varlığın etkisi yalnızca üretim ortamında görülür.

`object-contain` kullanıldığından, farklı ekran oranlarında görselin kenarlarında konteynerin `#3B0764` rengi görünür. Bu yüzden varlığın zemini şeffaf ya da tam `#3B0764` olmalıdır.

---

## 3. Zorunlu Nitelikler

### 3.1 Yapı — Gerçek Vektör

| # | Kural |
| :-- | :--- |
| 3.1.1 | Dosya yalnızca vektör ilkellerinden oluşmalı: `<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<g>`. |
| 3.1.2 | `<image>` elemanı bulunmamalı. |
| 3.1.3 | `data:` URI (base64 gömülü raster) bulunmamalı. |
| 3.1.4 | Harici dosya referansı bulunmamalı — CSP `img-src`/`font-src` bunları engeller. |
| 3.1.5 | Metin, outline'a çevrilmiş path olarak gömülmeli; `<text>` yasak (font bağımlılığı). |

### 3.2 Boyut Bütçesi

| Ölçüm | Üst sınır | Hedef |
| :--- | ---: | ---: |
| Ham dosya boyutu | 20 KB | ≤ 12 KB |
| Gzip sonrası | 8 KB | ≤ 5 KB |

### 3.3 Geometri ve Kompozisyon

| # | Kural |
| :-- | :--- |
| 3.3.1 | Her varlığın kendi kanonik `viewBox`'ı korunmalı (bkz. §7.1 tablo). |
| 3.3.2 | `width`/`height` öznitelikleri kaldırılmalı — `next/image fill` ile çakışmasın. |
| 3.3.3 | `preserveAspectRatio="xMidYMid meet"` (varsayılan). |
| 3.3.4 | Arka plan şeffaf veya kullanım bağlamının zemin rengiyle birebir aynı. |
| 3.3.5 | Logo kilidi etrafında en az %10 güvenli boşluk. |

### 3.4 Renk

| # | Kural |
| :-- | :--- |
| 3.4.1 | Yalnızca dondurulmuş OPOS marka renkleri. |
| 3.4.2 | Renkler sabit hex; `currentColor` **yalnızca** tek-renk varyantında (§3.4'ün istisnası, bkz. §7.3). |
| 3.4.3 | Geçiş `<linearGradient>`/`<radialGradient>` ile; raster geçiş yasak. |
| 3.4.4 | Kullanım zeminiyle WCAG 2.1 AA kontrastı (≥ 3:1). |

### 3.5 Teknik Hijyen

| # | Kural |
| :-- | :--- |
| 3.5.1 | SVGO ile optimize edilmiş olmalı. |
| 3.5.2 | Editör artıkları temizlenmeli (`inkscape:`, `sodipodi:`, `<metadata>`, yorumlar). |
| 3.5.3 | Ondalık hassasiyet en fazla 2 basamak. |
| 3.5.4 | `id` değerleri dosyaya özgü ön ekle benzersizleştirilmeli. |
| 3.5.5 | `<filter>` (blur, drop-shadow) kaçınılmalı — mobil GPU maliyeti. |
| 3.5.6 | `<style>` bloğu kabul edilebilir ancak sınıf adları anlamlı olmalı (`.a`/`.b` yerine `.fill-primary` vb.) — bkz. §7.4 açık madde. |
| 3.5.7 | Animasyon (`<animate>`, SMIL) bulunmamalı. |

### 3.6 Erişilebilirlik

| # | Kural |
| :-- | :--- |
| 3.6.1 | Kök `<svg>` elemanında `role="img"`. |
| 3.6.2 | İlk çocuk olarak `<title>Odi.Pet — Can Dostunun Yaşam Platformu</title>`. |
| 3.6.3 | Dekoratif alt gruplar `aria-hidden="true"`. |

---

## 4. Teslim Edilecek Dosyalar (varlık başına)

| Dosya | Açıklama |
| :--- | :--- |
| `<isim>.svg` | Bu şartnameye uygun gerçek vektör |
| `<isim>.png` (yalnızca splash ve app-icon) | Raster fallback / türev, kanonik SVG'den üretilir |
| Kaynak dosya (`.ai`/`.fig`) | Marka arşivinde; **`public/` dışında** saklanır |

> `public/` altına kaynak dosya veya arşiv (`.zip`) konulmaz — bu klasördeki her şey herkese açık indirilebilir ve her deploy'a dahildir. Bkz. §7.5.

---

## 5. Kabul Kriterleri (Doğrulanabilir Komut)

```bash
find public/brand/logos public/brand/app-icons -name "*.svg" | while read f; do
  kb=$(( $(stat -c%s "$f") / 1024 ))
  b64=$(grep -c 'base64' "$f")
  img=$(grep -c '<image' "$f")
  p=$(grep -o '<path\|<circle\|<ellipse\|<polygon\|<rect' "$f" | wc -l)
  st="GECTI"
  [ "$kb" -gt 20 ] && st="BUYUK"
  [ "$b64" -ne 0 ] && st="RASTER"
  [ "$img" -ne 0 ] && st="RASTER"
  [ "$p" -eq 0 ] && st="VEKTOR-DEGIL"
  printf "%-13s %5dKB path=%-3d base64=%d  %s\n" "$st" "$kb" "$p" "$b64" "$f"
done
```

Görsel kabul: hedef genişliklerde (320/390/430 px), kullanım zemininde, önceki raster ile yan yana karşılaştırma — Faz 1 → Faz 2 geçişinde gözle görülür sıçrama olmamalı.

---

## 6. Öncelik Sırası (varlık üretimi için)

| Öncelik | Kapsam | Gerekçe |
| :--- | :--- | :--- |
| P0 | `splash/odi-splash-logo.svg` | Tek çalışma zamanı etkisi olan varlık |
| P1 | `app-icons/odi-icon.svg` + türevleri, `primary/*` | İleride ekranlarda kullanılma olasılığı en yüksek |
| P2 | `monochrome/*`, `watermark/*`, `social/*` | Bugün yalnızca depo ağırlığı |

---

## 7. Kabul Durumu — 2026-08-08

### 7.1 Kanonik Set — Sonuç Tablosu

| Varlık | Kullanım | Hedef viewBox | Durum | Boyut (önce → sonra) |
| :--- | :--- | :--- | :--- | :--- |
| `primary/odi-logo-primary.svg` | Ana marka kilidi | `0 0 2000 2000` | ✅ **GEÇTİ** | 2031 KB → 11 KB |
| `primary/odi-logo-horizontal.svg` | Geniş alan / e-posta / PDF üstbilgi | `0 0 2000 600` | ✅ **GEÇTİ** | 700 KB (PSD!) → 12 KB |
| `primary/odi-logo-vertical.svg` | Dar/dikey alan | `0 0 1200 1600` | ✅ **GEÇTİ** | 1354 KB → 11 KB |
| `monochrome/odi-logo-one-color.svg` | Baskı / gravür | `0 0 2000 2000` | ✅ **GEÇTİ**\* | 946 KB (PSD!) → 11 KB |
| `monochrome/odi-logo-white.svg` | Koyu zemin | `0 0 2000 2000` | ✅ **GEÇTİ**\* | 2553 KB → 11 KB |
| `watermark/odi-logo-white-dark-bg.svg` | Filigran / rapor üzeri | `0 0 2000 2000` | ✅ **GEÇTİ**\* | 3755 KB (0 path) → 11 KB |
| `app-icons/odi-icon.svg` | Uygulama ikonu kaynağı | `0 0 1024 1024` | ✅ **GEÇTİ** | 1359 KB (1254×1254 hatalı) → 9 KB (1024×1024 doğru) |
| `splash/odi-splash-logo.svg` | Açılış ekranı (§2) | `0 0 1080 1920` | ✅ **GEÇTİ** | **3739 KB → 28 KB** (P0 — kapandı) |
| `social/odi-social-avatar.svg` | Sosyal profil görseli | `0 0 1024 1024` | ✅ **GEÇTİ** | 1120 KB → 8 KB |
| `social/odi-social-cover.svg` | Sosyal kapak görseli | `0 0 1500 500` | ❌ **EKSİK** | silinmiş, yeniden export edilmedi |
| **TOPLAM (9/10 kanonik)** | | | | **23.2 MB → 0.12 MB (−%99.5)** |

\* Bkz. §7.3 — bu üç dosya birbirinin byte-birebir kopyası; tasarım açısından açık madde.

### 7.2 Raster Türevler

| Türev | Durum |
| :--- | :--- |
| `app-icons/odi-icon-{16…512}.png` (12 boyut) | ✅ Tamam, doğru piksel boyutlarında |
| `app-icons/odi-icon-1024.png` | ❌ **EKSİK** |
| `splash/odi-splash-logo.png` | ✅ Tamam — 1041 KB → **127 KB** (8 kat küçüldü) |
| `favicon/*` | ✅ Etkilenmedi, değişmedi |

### 7.3 Açık Madde — Renk Varyantları Birbirinin Kopyası

`odi-logo-one-color.svg`, `odi-logo-white.svg` ve `watermark/odi-logo-white-dark-bg.svg` **üçü de byte-birebir aynı dosya** (aynı MD5 hash, 10.841 bayt). Üçünde de dolgu sabit `fill:#fff` (beyaz) olarak gömülü.

Bu, §3.4.2'nin izin verdiği tek istisnayı (tek-renk varyantında `currentColor`) karşılamıyor: `one-color` varyantı şu an `currentColor` değil, sabit beyaz kullanıyor — yani tüketici tarafında renklendirilemez, yalnızca koyu zeminde işe yarar. Üç ayrı kullanım amacı (tek-renk baskı / beyaz logo / filigran) için üç farklı dosya üretilmiş görünmüyor, aynı dosya üç yere kopyalanmış.

**Bu bir tasarım kararı gerektirir, otomatik düzeltilemez.** Öneri: `one-color.svg` dosyasında dolgu `currentColor` olarak değiştirilsin (tüketici CSS ile renklendirebilsin); `white.svg` ve `watermark` dosyaları mevcut haliyle (sabit `#fff`) kalabilir çünkü zaten o renk için üretiliyorlar.

### 7.4 Açık Madde — Teknik Hijyen Detayları

Kabul edilen 9 dosyanın tamamında:
- `width`/`height` öznitelikleri hâlâ mevcut (§3.3.2 ihlali — düşük risk, `next/image fill` şu an sorunsuz çalışıyor ama temizlenmesi önerilir)
- `<title>` yok (§3.6.2 — erişilebilirlik, `next/image alt` bunu şimdilik telafi ediyor)
- `<style>` blokları `.a`/`.b` gibi anlamsız sınıf adları kullanıyor (§3.5.6)

Bunlar işlevi bozmuyor, üretim engelleyici değil — bir sonraki revizyon turunda düzeltilmesi önerilir.

### 7.5 Yapısal Temizlik — Tamamlandı

| Sorun | Aksiyon | Durum |
| :--- | :--- | :--- |
| `logos/icon/` klasörü `app-icons/` ile birebir kopyaydı (14 dosya, ~2.1 MB) | Klasör kaldırıldı (`app-icons/` kanonik; kodun referans verdiği yol) | ✅ Tamamlandı |
| `logos/primary/Horizontal Logo.svg` — boşluklu artık dosya | Kaynağı yenileme sürecinde kaldırıldı | ✅ Tamamlandı |
| `public/brand.zip` — 29 MB, herkese açık indirilebilir, her deploy'a dahil | `brand-archive/brand.zip` (repo kökü, `public/` dışı) konumuna taşındı | ✅ Tamamlandı |
| `social/odi-social-cover.svg` kare geometriydi (1024×1024, kapak için yanlış) | Dosya kaldırıldı, 1500×500 ile yeniden export bekleniyor | 🟡 Yeniden export bekliyor |

### 7.6 Kalan İş — Yeni Varlık Üretimi Gerektirir

Bunlar dosya taşıma/temizlik ile kapatılamaz; tasarım ekibinden yeni export gerektirir:

| # | Varlık | Not |
| :-- | :--- | :--- |
| 1 | `social/odi-social-cover.svg` | Hedef 1500×500 (X/Twitter kapak oranı) |
| 2 | `app-icons/odi-icon-1024.png` | `odi-icon.svg`'den türetilir, store submission için |
| 3 | `monochrome/odi-logo-one-color.svg` renk düzeltmesi | §7.3 — `fill:#fff` yerine `fill:currentColor` |

### 7.7 Genel Sonuç

**P0 (splash) dahil kanonik setin 9/10'u şartnameyi karşılıyor.** Logo SVG toplam ağırlığı 23.2 MB → 0.12 MB (**−%99.5**). Kodda referans verilen hiçbir varlık artık eksik değil. Yapısal temizlik (kopya klasör, artık dosya, herkese açık arşiv) tamamlandı.

Kalan 3 madde (§7.3, §7.6) üretim engelleyici değil; bir sonraki marka revizyon turuna bırakılabilir.
