# Doğrulama: Push Bildirimi İkon URL'i & CSP Düzeltmesi
Bağımsız kontrol: `git log`/`git diff`, `tsc --noEmit`, kaynak + derlenmiş `sw.js` incelemesi. Kod değişikliği yapılmadı.

## Doğrulama Tablosu

| # | İddia | Sonuç |
|---|---|---|
| 1 | `NotificationsClient.tsx` ikon/badge göreli yola çevrildi | ✅ **Doğrulandı.** Satır 66-67: `icon`/`badge` = `/brand/app-icons/odi-icon-256.png`. |
| 2 | `src/sw.ts` fallback görselleri göreli yola çevrildi | ✅ **Doğrulandı.** Satır 120-121: `payload.icon ?? '/brand/app-icons/odi-icon-256.png'`. |
| 3 | `proxy.ts` CSP'ye `odi.pet` domainleri eklendi | ✅ **Doğrulandı.** `img-src` ve `connect-src` direktiflerinde `https://odi.pet https://*.odi.pet` mevcut. |
| 4 | Derleme hatasız | ✅ **Doğrulandı.** `tsc --noEmit` bağımsız çalıştırıldı, 0 hata. |
| 5 | Serwist SW derlemesi tamamlandı | ✅ **Doğrulandı.** `public/sw.js` yeniden derlenmiş (bugün 20:28), minified, içinde **hiç `https://odi.pet` yok** — göreli yollar precache manifest'ine doğru girmiş. İkon dosyası `public/brand/app-icons/odi-icon-256.png` (61 KB) mevcut. |
| 6 | Vitest 797/797 | ⚠️ **Bağımsız doğrulanamadı** (bu sandbox'ta Linux native binding eksik). CI'da doğrulanacak. |

**Ek pozitif tespit:** `next.config.ts` içindeki eski, `unsafe-eval` içeren ikinci CSP tanımı kaldırılmış. Artık CSP'yi yalnızca `proxy.ts` üretiyor — iki ayrı CSP header'ı gönderilse tarayıcı ikisinin **kesişimini** uygulardı ve `odi.pet` eklemesi sessizce etkisiz kalırdı. Bu risk yok.

---

## 🔴 Bulgu 1: Değişiklikler yine commit edilmemiş

`HEAD` hâlâ `02d4b38` ve `origin/phase18-wip` ile senkron. Bu düzeltmenin **hiçbir parçası commit edilmemiş**:

| Dosya | Durum |
|---|---|
| `src/proxy.ts` | ❌ Commit edilmemiş |
| `src/sw.ts` | ❌ Commit edilmemiş |
| `src/app/owner/notifications/NotificationsClient.tsx` | ❌ Commit edilmemiş |
| `public/sw.js` (derleme çıktısı) | ❌ Commit edilmemiş |

Bu, denetim boyunca **üçüncü kez** tekrarlanan aynı sorun. Commit edilmeyen kod CI'dan geçmez ve deploy'a girmez — yani bu düzeltme şu an yalnızca sizin makinenizde var. Push bildirimleri production'da hâlâ eski (bozuk) davranışı gösterecek.

**Öneri:** `git add` + commit + push. Öneri mesaj: `fix(notifications): use relative icon paths and allow odi.pet in CSP img/connect-src`.

---

## 🟡 Bulgu 2: CSP gevşetmesi büyük olasılıkla gereksiz

İkon yolları artık göreli olduğu için, CSP'ye `https://odi.pet` eklenmesi fiilen işlevsiz:

- **Production'da** uygulama zaten `odi.pet` üzerinden servis ediliyor → `'self'` **zaten** `https://odi.pet` demek. Ekleme tamamen gereksiz (no-op).
- **Localhost/staging'de** `'self'` localhost'tur; `odi.pet`'e ihtiyaç yalnızca mutlak URL kaldıysa doğar — ama mutlak URL'ler bu düzeltmeyle kaldırıldı.

Gerekçe olarak "sunucudan gelen push payload'ında mutlak URL olabilir" denmiş. Bunu kontrol ettim: `src/lib/notifications` ve API route'larında push payload'ına mutlak ikon URL'i yazan **hiçbir kod bulamadım** — payload ikonu her zaman client/SW tarafında set ediliyor.

Bu, güvenlik açığı değil (kendi domaininizi izin listesine eklemek düşük riskli), ama CSP'yi bir sebep olmadan genişletiyor.

**Öneri (opsiyonel):** `img-src`/`connect-src`'den `https://odi.pet https://*.odi.pet` çıkarılıp göreli yol düzeltmesinin tek başına yeterli olduğu doğrulanabilir. Bilinçli bir "savunma katmanı" olarak tutmayı tercih ederseniz, `proxy.ts`'e bunun neden orada olduğunu açıklayan bir yorum satırı ekleyin — aksi halde ileride kimse kaldırmaya cesaret edemez.

---

## 🟡 Bulgu 3: `public/sw.js` derleme çıktısı git'te izleniyor

`public/sw.js` bir **build artifact** (Serwist çıktısı) ama git tarafından izleniyor. Bu yüzden her build'de 3.000+ satırlık anlamsız diff üretiyor ve `.gitignore`'da yer almıyor.

**Risk:** İki geliştirici farklı zamanlarda build alırsa sürekli çakışan, incelenemez diff'ler oluşur; ayrıca yanlışlıkla eski bir `sw.js` commit edilirse production'da bayat service worker yayınlanabilir.

**Öneri:** `public/sw.js` ve `public/sw.js.map` `.gitignore`'a eklenmeli (build zaten `prebuild`/`build` script'inde otomatik üretiyor). Dikkat: Vercel deploy'unun bu dosyayı build sırasında ürettiğinden emin olun — `package.json`'daki `build` script'i `serwist build` içeriyor, yani güvenli.

---

## Özet

Düzeltmenin **teknik içeriği doğru ve çalışıyor** (göreli yollar, temiz derleme, temiz SW çıktısı, tek CSP kaynağı). Ancak:

1. 🔴 **Commit + push yapılmadı** — düzeltme henüz hiçbir yere ulaşmadı (yayın öncesi mutlaka yapılmalı)
2. 🟡 CSP'ye eklenen `odi.pet` muhtemelen gereksiz — ya kaldırın ya gerekçesini yoruma yazın
3. 🟡 `public/sw.js` build artifact'i git'ten çıkarılmalı

Yayına engel olan tek madde 1 numaralı bulgudur; diğer ikisi hijyen.
