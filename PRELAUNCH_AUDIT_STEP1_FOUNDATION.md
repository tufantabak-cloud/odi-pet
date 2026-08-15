# Odi.Pet — Yayın Öncesi Denetim (Orchestrator Raporu)
**Adım 1 / N: Temel Altyapı, Güvenlik ve Sürüm Hijyeni**
Tarih: 2026-08-15 · Kod değişikliği yapılmadı, yalnızca denetim.

---

## Denetim Yol Haritası (planlanan adımlar)

1. **Temel Altyapı & Güvenlik** ← bu rapor
2. Kimlik Doğrulama & Rol/Yetki Akışları (owner, admin, clinic, caregiver, groomer, hotel, sitter, trainer)
3. Çekirdek Ürün Akışları (Pet ekleme, Aşı/Sağlık, Beslenme, Takvim)
4. Ödeme & Abonelik (Stripe) Akışı
5. PWA / Mobil Deneyim (Service Worker, offline, push bildirim, responsive)
6. Performans & Erişilebilirlik
7. Yayın Öncesi Son Kontrol Listesi (release checklist)

Her adım onaylandıktan sonra bir sonrakine geçilecek. Siz düzeltmeleri yaptıktan sonra "kontrol et" dediğinizde yalnızca o adımdaki maddeler yeniden doğrulanacak.

---

## 1. Sürüm Kontrolü (Git) Hijyeni — 🔴 KRİTİK

- Repoda **1561 değiştirilmiş, 45 izlenmeyen (untracked) dosya** commit edilmemiş durumda.
- Bu, yayın öncesi en büyük risk: hangi değişikliğin test edildiği, hangisinin "son hal" olduğu net değil. Bir çökme/veri kaybı durumunda geri dönüş (rollback) noktası yok.
- Mevcut `QA_REPORT.md` (2026-08-09, commit `a3982da`) bugünkü çalışma kopyasını yansıtmıyor olabilir — testler o commit'te geçmiş, şu anki değişiklikler test edilmemiş olabilir.

**Öneri:** Yayına çıkmadan önce çalışan her şey mantıklı commit'lere bölünüp push edilmeli; en azından bir "checkpoint" commit atılmalı. Sonra QA/test paketleri güncel commit üzerinde yeniden çalıştırılmalı.

---

## 2. Ortam Değişkenleri / Secrets — 🟢 İyi durumda

- `.env*` dosyaları `.gitignore`'da doğru şekilde hariç tutulmuş, git geçmişinde izlenen `.env` dosyası yok.
- Kaynak kodda (`src/`) hardcoded API key / service-role key / AWS key deseni bulunmadı.
- `.env.example` eksiksiz ve production'da gerekli tüm değişkenleri listeliyor (Supabase, Stripe, VAPID, AWS, Upstash, Cron secret).

**Öneri:** Prod ortam değişkenlerinin (Vercel dashboard) `.env.example` ile birebir eşleştiğini elle bir kez teyit edin; eksik anahtar build sonrası runtime hatasına yol açar.

---

## 3. TypeScript & Kod Kalitesi — 🟡 Orta risk

- `tsc --noEmit` **hatasız** derleniyor — pozitif sinyal.
- Ancak kod tabanında **1092 adet `any` kullanımı** var. Bu, tip güvenliğini büyük ölçüde devre dışı bırakıyor ve özellikle ödeme/sağlık verisi gibi kritik alanlarda runtime hatası riskini artırıyor.
- `src` içinde **28 dosyada `console.log`** kalmış — prod build'de log sızıntısı / performans gürültüsü.
- ESLint tüm proje üzerinde 120sn+ sürüyor (repo çok büyük), bu oturumda tam sonuç alınamadı. `package.json` içindeki `lint:pets` scripti zaten 183 uyarılık bir "baseline" kabul etmiş durumda — yani bilinen bir lint borcu var ve büyümesi engellenmiyor.

**Öneri:**
- `npm run lint` çıktısını CI'da zorunlu hale getirip mevcut uyarı sayısını "tavan" (max-warnings) olarak kilitleyin, üstüne çıkmasın.
- Kritik modüllerde (`payments`, `health`, `vaccines`, `auth`) `any` kullanımını öncelikli temizleyin.
- `console.log` temizliği için basit bir grep taraması + kaldırma yapılmalı.

---

## 4. Güvenlik Başlıkları (CSP) — 🟡 Orta risk, kabul edilebilir ama geliştirilebilir

`next.config.ts` içinde CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy tanımlı — bu iyi bir temel.

Sorun: `script-src` içinde **`'unsafe-inline'` ve `'unsafe-eval'`** açık. Bu, CSP'nin XSS'e karşı sağladığı korumanın büyük kısmını etkisiz kılıyor.

**Öneri:** Nonce tabanlı script-src'ye geçiş (Next.js 16 destekliyor) orta vadeli bir iyileştirme olarak planlanmalı; yayın öncesi zorunlu değil ama "launch sonrası ilk teknik borç" listesine eklenmeli.

---

## 5. Rol Bazlı Erişim Guard'ları — 🔴 KRİTİK, doğrulanmalı

`owner`, `admin` ve `clinic` (route group `(protected)/layout.tsx`) altında `requireRole`/`redirect` ile oturum kontrolü **var**.

Ancak şu rollerin sayfaları **tek dosyalık stub** durumda ve içlerinde **hiçbir auth guard bulunamadı**:

| Rol | Dosya | Guard var mı? |
|---|---|---|
| groomer | `src/app/groomer/dashboard/page.tsx` | ❌ Hayır |
| hotel | `src/app/hotel/dashboard/page.tsx` | ❌ Hayır |
| sitter | `src/app/sitter/dashboard/page.tsx` | ❌ Hayır |
| trainer | `src/app/trainer/dashboard/page.tsx` | ❌ Hayır |
| caregiver | `src/app/caregiver/[token]/page.tsx` | Token bazlı — muhtemelen kasıtlı, ayrıca doğrulanmalı |

**Bu bulgu iki şekilde yorumlanabilir, netleştirilmeli:**
1. Bu sayfalar henüz geliştirilmemiş placeholder'lar ve yayına girmeyecekse → sorun yok, ama route'lar public'te erişilebilir kalmamalı (en azından "yakında" ekranına yönlendirilmeli).
2. Bu sayfalar gerçek kullanıcı verisi gösteriyorsa → **oturum kontrolü olmadan herkes bu URL'lere girip başka kullanıcıların verisini görebilir.** Bu bir launch-blocker güvenlik açığıdır.

**Öneri:** Bu 4 sayfanın içeriği bu adımda (Adım 2'de detaylı) tek tek incelenmeli; gerçek veri çekiyorsa acilen guard eklenmeli.

---

## 6. CI/CD Kapsamı — 🟡 Orta risk

`.github/workflows/` altında 3 iş akışı var:
- `architecture-guard.yml`: `tsc --noEmit`, mimari guard script, `vitest run`, `next build` — **iyi kapsam**.
- `playwright.yml`: e2e testler.
- `illustration-ci.yml`: görsel varlık kontrolü.

**Eksik:** `npm run lint` CI'da zorunlu bir adım olarak görünmüyor (architecture-guard.yml'de yok). Yani lint hataları/uyarıları merge'i engellemiyor.

**Öneri:** Lint adımını CI gate'ine ekleyin (en azından error-level kurallar için).

---

## 7. PWA Temel Ayarları — 🟢 Büyük ölçüde iyi

- `manifest.json` eksiksiz: isim, ikonlar (128/256/512/maskable/180), `display: standalone`, `theme_color`, `lang: tr`.
- Service worker (Serwist) yapılandırılmış, `/sw.js` için doğru cache header'ları var.

**Küçük notlar:**
- `manifest.json` içindeki `screenshots: []` boş — app store benzeri "install" promptlarında görsel eksik kalır, kozmetik.
- `robots.txt` / `sitemap.xml` yok — uygulama oturum arkasında olduğu için düşük öncelikli, ama `/login`, `/legal` gibi public sayfalar için SEO isteniyorsa eklenmeli.

---

## Özet Öncelik Sırası (Adım 1 kapanışı için)

| # | Bulgu | Risk | Launch Blocker mı? |
|---|---|---|---|
| 1 | 1561 commit edilmemiş dosya | 🔴 Kritik | Evet — süreç riski |
| 2 | groomer/hotel/sitter/trainer sayfalarında auth guard yok | 🔴 Kritik | Doğrulama gerekiyor, muhtemelen evet |
| 3 | CSP'de unsafe-inline/unsafe-eval | 🟡 Orta | Hayır, borç listesine |
| 4 | 1092 adet `any`, 28 `console.log` | 🟡 Orta | Hayır ama kritik modüllerde öncelikli |
| 5 | Lint CI gate'inde yok | 🟡 Orta | Hayır |
| 6 | manifest screenshots boş, robots/sitemap yok | 🟢 Düşük | Hayır |

---

**Sıradaki adım:** Siz 1–2 numaralı maddeleri (commit + rol guard'ları) netleştirip/düzelttiğinizde "kontrol et" deyin, bu maddeleri yeniden doğrulayıp Adım 2'ye (Kimlik Doğrulama & Rol Akışları) geçeyim.
