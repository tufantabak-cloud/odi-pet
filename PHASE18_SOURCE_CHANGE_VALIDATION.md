# PHASE 18-WIP — SOURCE CHANGE VALIDATION

**Tarih:** 2026-08-09 · **Branch:** `phase18-wip` · **HEAD:** `1c8e1ca`
**Mod:** READ-ONLY FORENSIC VALIDATION — hiçbir remediation uygulanmadı

---

## 1. `src/app/api/auth/callback/route.ts`

### 1.1 Diff özeti
17 satır → 221 satır. HEAD'deki akış tek yollu: `error?` → `!code?` → `exchangeCodeForSession(code)` → lifecycle grant. Working tree bunu iki yollu (dual-path) hale getiriyor.

### 1.2 Tam akış denetimi (yalnızca diff'e bakılmadı)

Dosyanın tamamı satır satır okundu. Guard sırası:

| # | Koşul | Aksiyon | Değerlendirme |
| --- | --- | --- | --- |
| 1 | `error` param var | `/login?message=...` | HEAD'den değişmemiş ✅ |
| 2 | `code` **ve** `tokenHash` birlikte | Reddet | **YENİ** — parametre karıştırma (flow confusion) savunması ✅ |
| 3 | `tokenHash` var, `type` yok/geçersiz | Reddet | **YENİ** — allow-list ✅ |
| 4 | Ne `code` ne `tokenHash` | Reddet | HEAD'deki `!code` kontrolünün genişletilmişi ✅ |
| 5a | `tokenHash && type` geçerli | `verifyOtp({token_hash, type})` | **YENİ** — Path A |
| 5b | `code` | `exchangeCodeForSession(code)` | HEAD davranışı korunmuş ✅ |
| 6 | `authError` | Lokalize mesaj + `/login` | **YENİ** — mesaj sızıntısı kapatıldı ✅ |
| — | lifecycle grant (AI+ 60g → PRO 60g) | `try/catch`, non-blocking | HEAD'den değişmemiş ✅ |

**Guard bütünlüğü:** 5a/5b dallarından hiçbirine girilmemesi matematiksel olarak imkânsız. Guard 4 `(!code && !tokenHash)` durumunu, guard 3 `tokenHash` + geçersiz `type` durumunu eler. Geriye yalnızca (`tokenHash` + geçerli `type`) veya (`code`) kalır. **Sessizce oturumsuz redirect yapılan bir "düşme" yolu yok.**

**Tip doğruluğu — birebir eşleşme doğrulandı:**
```
node_modules/@supabase/auth-js/.../types.d.ts:684
export type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';
```
Koddaki `VALID_EMAIL_OTP_TYPES` seti bu 6 değerin **tam kümesi** — eksik yok, fazla yok. Kütüphane sürümü `@supabase/supabase-js ^2.103.3` **doğrudan bağımlılık** (package.json:49), dolayısıyla `import type { EmailOtpType }` meşru.

**Mimari uyum:**
- `verifyOtp` bu kod tabanında zaten kullanılıyor: `src/app/api/v1/reports/lost/verify/route.ts:76` (`type: 'phone_change'`). Yeni bir desen değil, mevcut mimariyle uyumlu. ✅
- Cookie yazımı `createServerClient` + `setAll` üzerinden; `verifyOtp` de `exchangeCodeForSession` gibi aynı cookie kanalını kullanır. Session persist yolu bozulmamış. ✅
- `secure: NODE_ENV === 'production'`, `sameSite: 'lax'` — HEAD'den değişmemiş. ✅
- `next` parametresi `getSafeRelativeRedirect()`'ten geçiyor (`//`, `\`, cross-origin reddediliyor). Open redirect koruması korunmuş. ✅

### 1.3 Güvenlik değerlendirmesi

**İyileşmeler:**
1. **Bilgi sızıntısı kapatıldı.** HEAD: `` `Doğrulama başarısız: ${exchangeError.message}` `` — ham Supabase mesajı URL'e, oradan tarayıcı geçmişine/referer'a/log'lara yazılıyordu. Working: `getLocalizedAuthError()` yalnızca 5 sabit Türkçe mesajdan birini döndürüyor. **Gerçek bir güvenlik kazanımı.**
2. **Runtime input validation.** `type` artık `as EmailOtpType` cast'iyle körlemesine Supabase'e geçmiyor.
3. **Flow confusion savunması.** `code` + `token_hash` birlikte reddediliyor.
4. `token_hash` **loglanmıyor** — yalnızca `type` loglanıyor (satır 133). Sır sızıntısı yok. ✅

**Riskler / dikkat noktaları:**

| Bulgu | Değerlendirme |
| --- | --- |
| Allow-list'te `'recovery'` var | Şifre sıfırlama akışı `src/app/api/auth/reset-password/route.ts:71`'de `redirectTo: ${siteUrl}/update-password` kullanıyor — bu callback'e uğramıyor. Yani pratikte tetiklenmiyor. Ancak elle üretilmiş bir `?token_hash=...&type=recovery` isteği burada oturum açıp `next` (varsayılan `/owner/dashboard`) adresine yönlendirir; kullanıcı `/update-password`'e uğramadan içeri girer. **Fonksiyonel açık değil (token zaten kullanıcının kendisine ait), ancak akış hijyeni açısından `recovery` ve `invite`'ın bu endpoint'te ayrı ele alınması gözden geçirilmeli.** |
| `src/app/page.tsx:9` | `redirect(\`/api/auth/callback?code=${params.code}\`)` — yalnızca `code` iletiliyor, `token_hash`/`type` **düşüyor**. Bu **HEAD'de de var olan, bu değişikliğin getirmediği** bir boşluk. Ancak Path A'nın kök URL'e düşen linklerde çalışmayacağı anlamına gelir. Ayrıca `params.code` `encodeURIComponent` olmadan enterpolasyon ediliyor (mevcut durum, bu diff'in kapsamı dışında). |
| `otpData?.session ? {...} : null` | `verifyOtp` bazı tiplerde (`email_change` gibi) session döndürmeyebilir; o durumda `userId` undefined kalır ve lifecycle grant atlanır. `try/catch` non-blocking olduğu için akış kırılmaz. **Regression değil.** |
| `authError: Error \| null` | `AuthError`, `Error`'dan türediği için tip ataması geçerli. `authError instanceof Error` kontrolü de tutarlı. ✅ |

**Regression taraması:** HEAD'in tüm davranışları korunuyor — `error` param yolu aynı, PKCE yolu aynı, `next` sanitizasyonu aynı, cookie ayarları aynı, lifecycle grant bloğu birebir aynı. **Davranışsal gerileme tespit edilmedi.**

### 1.4 Kaynak sınıfı
**Bilinçli kullanıcı çalışması.** Türkçe açıklama yorumları, numaralandırılmış guard blokları, ayraç başlıkları, tutarlı isimlendirme. Hiçbir formatter/codemod/generator böyle bir çıktı üretmez.

### 1.5 Karar: **KEEP** (test şartıyla)
Değişiklik HEAD'in davranışını genişletiyor, daraltmıyor; input validation ve bilgi sızıntısı açısından net iyileştirme. Tip kümesi kütüphaneyle birebir doğrulandı, mimari desen kod tabanında zaten mevcut.
**Merge öncesi manuel doğrulama zorunlu:** (a) aynı cihazda e-posta doğrulama, (b) cross-device doğrulama, (c) süresi dolmuş link, (d) ikinci kez kullanılan link, (e) yeni kullanıcıda AI+ lifecycle grant'inin hâlâ tetiklendiği.

---

## 2. `src/app/owner/layout.tsx`

### 2.1 Diff
```diff
- <span className="text-[18px] font-black text-text-primary tracking-tighter hidden sm:block">Odi.Pet</span>
+ <span className="text-[18px] font-black text-text-primary tracking-tighter">Odi</span>
```
Tek satır, iki ayrı etki:
- **(a) Marka metni:** `Odi.Pet` → `Odi`
- **(b) Responsive sınıf:** `hidden sm:block` kaldırıldı → artık mobilde de görünüyor

### 2.2 Bağlam (satır 75-92 okundu)
Header `h-16`, `px-5 lg:px-10`, `justify-between`. Sol blok bir `<Link>`: 40×40 logo + marka span + `Can Dost Yaşam Platformu` spanı (12px, bunda hiç `hidden` yok). Sağ blok: `FloatingLostPets` + referral linki + diğer aksiyonlar.

**Mobil düzen etkisi:** HEAD'de dar ekranda gösterilen = logo + "Can Dost Yaşam Platformu". Working'de = logo + "Odi" + "Can Dost Yaşam Platformu". Sağ blokta birden fazla ikon varken ~360px genişlikte **header sıkışması / taşma riski** var. Bu, değişikliğin ölçülmemiş yan etkisi.

### 2.3 Marka tutarlılığı
| Yer | Değer |
| --- | --- |
| `src/app/owner/layout.tsx:87` | **`Odi`** ← değişen |
| `public/manifest.json:2-3` | `"name": "Odi.Pet"`, `"short_name": "Odi.Pet"` |
| `src/components/ui/PwaEnforcer.tsx:205` | `Odi.Pet` |

Header artık uygulamanın geri kalanıyla **tutarsız**. Bu ya bilinçli bir marka kısaltması kararının ilk adımı (o zaman manifest ve PwaEnforcer de güncellenmeli), ya da bir deneme kalıntısı.

### 2.4 Risk taraması
Güvenlik etkisi yok, routing etkisi yok, veri etkisi yok. Yalnızca görsel/marka.

### 2.5 Kaynak sınıfı
**Bilinçli el düzenlemesi** (generated değil), ancak **amacı belgelenmemiş** ve son 4 brand commit'inin hiçbirinde bu dosya yok — yani mevcut brand çalışmasının parçası olarak commit edilmiş bir iş değil.

### 2.6 Karar: **NEEDS REVIEW**
İki bağımsız karar tek satırda birleşmiş. Netleşmesi gerekenler:
1. `Odi` kısaltması kasıtlı bir marka kararı mı? Öyleyse `manifest.json` + `PwaEnforcer.tsx` da aynı commit'te güncellenmeli.
2. `hidden sm:block` kaldırılması kasıtlı mı? Öyleyse dar ekran (≤375px) header'ı görsel olarak doğrulanmalı.

Onay gelmezse **REVERT** güvenli varsayılandır — HEAD hali tutarlı ve responsive davranışı test edilmiş durumda.

---

## 3. `src/app/owner/pets/[id]/PetDetailClient.tsx`

### 3.1 Diff
- Satır 36: `import FloatingSOS from '@/components/FloatingSOS'` eklendi
- Satır ~1551: "Paylaş & Ekip" sarmalayıcısı `<div>` → `<div className="grid grid-cols-2 gap-3">`
- Satır 1564-1573: Butonun yanına `<FloatingSOS fullWidth petId petName vetPhone vetName sosContacts onLostReport onMarkFound />` eklendi

### 3.2 Bütünlük doğrulaması (yarım iş mi?)

| Kontrol | Sonuç |
| --- | --- |
| `FloatingSOS.tsx` `fullWidth` prop'unu kabul ediyor mu? | ✅ satır 19 (`fullWidth = false`), 28 (tip), 298 (render dalı) |
| `fullWidth` render dalı gerçek mi? | ✅ `w-full h-11 rounded-btn`, `aria-label="Acil SOS"`, "Acil Durum" etiketi — grid hücresine oturacak biçimde |
| `setLostWizardOpen` mevcut mu? | ✅ satır 536 (`useState`) |
| `handleMarkFound` mevcut mu? | ✅ satır 568 |
| `pet.sos_contacts`, `pet.vet_name` alanları var mı? | ✅ dosyada başka yerlerde de kullanılıyor (satır 560, 1757) |
| Çift render riski? | ⚠️ Aşağıya bakınız |

**Çift render notu:** `FloatingSOS` bu dosyada tek kez render ediliyor (yalnızca satır 1564). Ancak satır 1511-1512'de aynı `onLostReport`/`onMarkFound` handler'ları **başka bir bileşene** de veriliyor. Bu handler paylaşımı normaldir (aynı modal'ı açan iki giriş noktası) ve çakışma üretmez — `lostWizardOpen` tek bir state.

**`vetPhone={(pet as any).vet_phone}`:** `as any` cast'i kullanılmış. Dosyanın satır 1268'inde `pet.vet_phone` cast'siz erişiliyor — yani alan tipte muhtemelen mevcut ve `as any` gereksiz. Kozmetik tip hijyeni sorunu, fonksiyonel risk değil.

### 3.3 Mimari uyum ve geçmiş
`git log -S "FloatingSOS"` → `fe765fc5 ux: SOS butonu FloatingSOS ile değiştirildi`. Aynı yönde önceki, commit'lenmiş iş var. Bu değişiklik o çizginin devamı. ✅
`FloatingSOS` `next/dynamic` + `{ ssr: false }` ile yükleniyor (satır 10) — client bileşeni olan `PetDetailClient` içinde sorunsuz.

### 3.4 Risk taraması
Güvenlik etkisi yok. Routing etkisi yok. Veri yazma etkisi yok. İzole, additive UI değişikliği. Grid 2 sütuna geçtiği için "Paylaş & Ekip" butonu artık yarım genişlikte — kasıtlı görünüyor (SOS ile eşit paylaşım).

### 3.5 Kaynak sınıfı
**Bilinçli kullanıcı çalışması.** Prop uyumu tam, handler'lar mevcut, hedef bileşende karşılık gelen `fullWidth` dalı zaten yazılmış. Generated değil.

### 3.6 Karar: **KEEP**
Tam ve tutarlı bir özellik eklemesi. Bağımlılıkların hepsi doğrulandı, yarım kalmış hiçbir parça yok.

---

## 4. `public/sw.js` — SALT İNCELEME (değiştirilmedi)

### 4.1 Karşılaştırma

| Ölçüt | HEAD (`1c8e1ca`) | Working tree |
| --- | --- | --- |
| Boyut | 160.956 B | 123.451 B |
| İlk satır | `var m=[{revision:null,url:"/_next/static/RWbAac2X4SFr6yBgZa2S8/_ssgManifest.js"},...` | `// node_modules/serwist/dist/chunks/waitUntil-BHDx3Rgo.js` |
| **Precache manifest girdisi** (`revision:` sayısı) | **1098** | **0** |
| `_ssgManifest` / `__WB_MANIFEST` / `precacheManifest` içeriyor mu? | Evet | **HAYIR (0 eşleşme)** |
| `node_modules/serwist` kaynak yorum işareti | **0** | **3** |
| Minify | Evet | Hayır |

### 4.2 `serwist.config.mjs` ile doğrulama
```js
const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.npm_lifecycle_event === "dev";
...
export default serwist({ swSrc: "src/sw.ts", swDest: "public/sw.js", ... }, undefined, { isDev: isDevelopment });
```
`package.json`:
```
"dev":   "concurrently ... \"serwist build serwist.config.mjs --watch ...\" \"next dev\""
"build": "next build && serwist build serwist.config.mjs --no-update-notifier"
```
`npm run dev` → `npm_lifecycle_event === "dev"` → `isDev: true` → minify yok, precache manifest enjekte edilmez.

**Doğrulama sonucu: working tree'deki `public/sw.js` kesin olarak bir DEVELOPMENT build çıktısıdır.** `npm run dev` çalışırken `--watch` modu dosyanın üzerine yazmıştır.

### 4.3 Production etkisi
Bu dosya commit + deploy edilirse production service worker'ı **precache manifest'i olmayan** (1098 → 0 girdi) bir dev build olur:
- PWA offline yeteneği çöker (`offline.html` navigation fallback dahil precache edilmiyor)
- `_next/static/...` varlıkları önbelleğe alınmaz
- Kayıtlı SW'si olan mevcut kullanıcılarda cache geçişi tanımsız davranır
- `serwist.config.mjs`'teki `manifestTransforms` güvenlik filtresi (kimlik doğrulamalı sayfaların precache'e girmesini engelleyen) hiç uygulanmaz

### 4.4 Karar: **REVERT** (ardından `npm run build` ile REGENERATE)
Mevcut working tree hali **hiçbir koşulda commit edilmemeli.**

---

## 5. `public/sw.js.map` — SALT İNCELEME (değiştirilmedi)

| Ölçüt | HEAD | Working tree |
| --- | --- | --- |
| Boyut | 533.125 B | 342.334 B |
| `sources[0]` | `"<define:self.__SW_MANIFEST>"` | `"../node_modules/serwist/src/utils/cacheNames.ts"` |

HEAD'in source map'i `<define:self.__SW_MANIFEST>` sanal modülüyle başlıyor — bu, precache manifest'inin build sırasında enjekte edildiğinin imzası. Working tree'de bu giriş **yok**, çünkü dev build manifest enjekte etmiyor. `sw.js` bulgusunu bağımsız olarak doğruluyor.

Tek başına runtime etkisi yok, ancak `sw.js` ile atomik hareket etmeli — eşleşmeyen bir map hata ayıklamayı yanıltır.

### 5.1 Karar: **REVERT** (`sw.js` ile birlikte REGENERATE)

---

## 6. SONUÇ TABLOSU

| FILE | TYPE | VERDICT | RISK | REASON |
| --- | --- | --- | --- | --- |
| `src/app/api/auth/callback/route.ts` | Application source (auth) | **KEEP** | MEDIUM | Dual-path (verifyOtp + PKCE) doğrulama; `EmailOtpType` allow-list kütüphaneyle birebir doğrulandı; ham hata mesajı sızıntısı kapatıldı; guard'larda boşluk yok; HEAD davranışları korunmuş. Auth kritik yol olduğu için merge öncesi 5 senaryoluk manuel test zorunlu. |
| `src/app/owner/layout.tsx` | Application source (UI) | **NEEDS REVIEW** | MEDIUM | Tek satırda iki bağımsız karar: `Odi.Pet`→`Odi` marka kısaltması (manifest.json ve PwaEnforcer hâlâ `Odi.Pet` — tutarsızlık) ve `hidden sm:block` kaldırılması (dar ekranda header sıkışma riski). Kasıt teyidi gerek; teyit yoksa REVERT güvenli varsayılan. |
| `src/app/owner/pets/[id]/PetDetailClient.tsx` | Application source (UI) | **KEEP** | LOW | Additive özellik: FloatingSOS 2-sütun grid'e eklendi. `fullWidth` prop'u hedef bileşende mevcut (satır 19/28/298), `setLostWizardOpen` (536) ve `handleMarkFound` (568) tanımlı, geçmişte `fe765fc5` ile aynı yönde iş var. Yarım kalmış parça yok. |
| `public/sw.js` | Generated (serwist dev build) | **REVERT** → REGENERATE | **HIGH** | Working tree'de precache manifest girdisi 1098→**0**, 3 adet `node_modules/serwist` dev işareti, minify yok. `serwist.config.mjs` + `npm run dev` (`--watch`) ile kesin olarak dev build doğrulandı. Deploy edilirse production PWA precache/offline tamamen kırılır. |
| `public/sw.js.map` | Generated (serwist dev build) | **REVERT** → REGENERATE | LOW | `sources[0]` HEAD'de `<define:self.__SW_MANIFEST>`, working'de yok — dev build bulgusunu bağımsız doğruluyor. Runtime etkisi yok ama `sw.js` ile atomik kalmalı. |

---

## Ek bulgu (bu diff'in kapsamı DIŞINDA, HEAD'de de mevcut)

`src/app/page.tsx:9`
```ts
if (params.code) { redirect(`/api/auth/callback?code=${params.code}`) }
```
İki not: (a) `token_hash`/`type` iletilmiyor — kök URL'e düşen OTP linklerinde yeni Path A devreye giremez; (b) `params.code` enterpolasyondan önce encode edilmiyor. **Bu değişikliğin getirdiği bir sorun değildir**, ayrı bir iş kalemi olarak değerlendirilmeli.

---

## Bu doğrulamada ÇALIŞTIRILMAYAN komutlar

`git restore` · `git checkout` · `git clean` · `git add` · `git commit` · `git push` · `git stash` · `git reset` · `.gitattributes` oluşturma · npm/build/test · dosya yazma/silme/yeniden adlandırma

Kullanılanlar salt okuma: `git show`, `git diff`, `git log -S`, `git ls-files`, `cat`, `sed`, `grep`, `head`, `wc`.

---

**NO FILES MODIFIED — READ-ONLY VALIDATION COMPLETE**
