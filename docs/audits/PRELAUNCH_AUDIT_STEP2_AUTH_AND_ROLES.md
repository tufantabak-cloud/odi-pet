# Odi.Pet — Yayın Öncesi Denetim
## Adım 2: Kimlik Doğrulama, Oturum ve Rol/Yetki Akışları
Tarih: 2026-08-15 · Kod değişikliği yapılmadı, yalnızca denetim.
Kapsam: `src/proxy.ts` (middleware), `src/lib/auth/`, `src/lib/auth-security.ts`, `src/app/api/auth/*`, `src/app/login|register|reset-password`, API route yetkilendirme sınırları, RLS.

---

## 🔴 BULGU 1 — Kaynak kodda kalıcı geliştirici arka kapısı (LAUNCH BLOCKER)

`src/lib/auth/get-current-profile.ts` satır 12-21:

```ts
export async function getCurrentProfile() {
  const user = await getSessionUser()
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      const admin = createAdminSupabaseClient()        // service-role: RLS bypass
      const { data: devProfile } = await admin
        .from('profiles').select('*')
        .eq('email', 'tufan.tabak@gmail.com')          // sabit kodlanmış hesap
        .maybeSingle()
      if (devProfile) return devProfile                // oturum yokken kimlik veriyor
    }
    return null
  }
  ...
}
```

**Ne yapıyor:** Oturum açmamış bir istekte, `NODE_ENV` "production" değilse, servis-rol anahtarıyla (RLS'i tamamen atlayarak) sabit bir e-posta adresine ait profili çekip **o kullanıcı olarak kimlik veriyor.**

**Etki alanı:** `getCurrentProfile` / `requireRole` projede **98 dosyada** kullanılıyor — owner sayfaları, admin katmanı, API route'ları dahil. Yani bu fonksiyon uygulamanın kimlik omurgası.

**Gerçek risk seviyesi (dürüst değerlendirme):**
- Production'da `next build` + `next start` `NODE_ENV=production` ayarlar → arka kapı **orada inert**.
- Middleware (`proxy.ts`) `/owner`, `/admin`, `/clinic`, `/api` yollarını zaten oturumsuz erişime kapatıyor → normal koşulda bu koda oturumsuz ulaşılmıyor.
- **Ama** herhangi bir staging/preview ortamı `next dev` ile ayağa kalkarsa, ya da bir host'ta `NODE_ENV` set edilmezse, o ortamda **isim/şifre olmadan founder hesabının tüm verisine erişim** açılır. Ayrıca ileride middleware matcher'ına eklenmeyen yeni bir route yazıldığı anda production'da da açığa dönüşebilir — yani güvenlik tek bir kırılgan katmana (middleware) bağlı kalıyor.

**Öneri (yayın öncesi zorunlu):** Bu blok tamamen silinmeli. Yerel geliştirme kolaylığı gerekiyorsa, kaynak koda gömülü kimlik yerine bir seed script'i ile gerçek bir test kullanıcısıyla giriş yapılmalı. En azından `process.env.ENABLE_DEV_IMPERSONATION === 'true'` gibi **açıkça opt-in** bir bayrağa bağlanmalı ve `.env.example`'a asla eklenmemeli.

---

## 🟢 Sağlam Bulunanlar

**Middleware oturum katmanı (`proxy.ts`) — iyi tasarlanmış**
- Oturumsuz istekte: sayfa ise `/login?reason=session_expired`'a yönlendirme, API ise `401 {requiresAuth:true}` — doğru ayrım.
- Oturumlu kullanıcı `/login`'e giderse ana sayfaya yönlendiriliyor (cookie'ler korunarak).
- `isAdminBoundaryPath` (`/admin`, `/api/admin`, `/api/users`) için ayrıca **rol kontrolü** yapılıyor; admin/founder değilse sayfa → `/owner/dashboard` yönlendirme, API → `403`.
- Durum değiştiren metodlarda (`POST/PUT/PATCH/DELETE`) **same-origin CSRF doğrulaması** var; başarısızsa `403 CSRF validation failed`.
- Cookie'ler `secure` (prod) + `sameSite: lax` ile yazılıyor.

**API erişim sınıflandırması (`request-boundary.ts`) — net ve okunabilir**
`public` / `token` / `service` / `session` olarak 4 moda ayrılmış; varsayılan `session` (yani yeni bir route yazıldığında **otomatik korumalı** — güvenli varsayılan ✅). Public liste dar tutulmuş (`/api/auth/*`, `/api/version`, `/api/provinces`, kayıp ilanı GET, davet kabul GET).

**Auth endpoint'leri sertleştirilmiş**
`login`, `register`, `clinic-register`, `reset-password`, `update-password` route'larının **tamamında** rate-limit + Turnstile doğrulaması var. Login ve register sayfalarında Turnstile client tarafında entegre. Tek istisna `auth/callback` (OAuth dönüşü) — bu beklenen ve doğru.

**Playwright test bypass'ı doğru kısıtlanmış**
`isTrustedPlaywrightTestEnvironment()` yalnızca `PLAYWRIGHT_TEST=true` **ve** yapılandırılmış tüm URL'lerin host'u `localhost/127.0.0.1/::1` ise `true` dönüyor. Uzak bir ortamda yanlışlıkla aktifleşmesi engellenmiş — iyi tasarım.

**Servis-rol (admin client) kullanımı — büyük ölçüde disiplinli**
73 API route'unda `createAdminSupabaseClient` kullanılıyor. İncelenen kritik örneklerde (pets, care-plans, agenda/write, breeding, users/bulk, users/export) sahiplik veya oturum kontrolü **route içinde ayrıca** yapılıyor. `logbook/create` servis-rol kullanmasına rağmen token'ı, `is_active`, `expires_at` ve `can_log_entries` yetkisini tek tek doğruluyor + rate-limit uyguluyor — örnek gösterilecek kalitede.

**RLS kapsamı geniş**
Migration'larda **175 farklı tabloda** Row Level Security etkinleştirilmiş. Bu, servis-rol kullanımının yanlış gittiği durumlarda ikinci savunma katmanı sağlıyor.

---

## 🟡 BULGU 2 — Rol yükseltme kuralı doğru ama tek noktada

`canAssignRole()` mantığı doğru: `founder` rolünü yalnızca bir `founder` atayabilir; `admin`/`founder` diğer rolleri atayabilir. Ancak bu saf bir yardımcı fonksiyon — **çağrılmadığı yerde hiçbir koruma sağlamıyor.**

**Öneri:** `/api/admin/users/[id]/role` route'unun bu fonksiyonu gerçekten çağırdığı ve DB tarafında da (RLS policy veya trigger ile) `profiles.role` sütununun kullanıcı tarafından güncellenemediği teyit edilmeli. Sadece uygulama katmanı yeterli değil.

---

## 🟡 BULGU 3 — `requireRole` sessizce `null` dönüyor

`requireRole()` yetkisiz durumda hata fırlatmıyor, `null` dönüyor. Çağıran taraf `if (!profile) redirect('/login')` yazmayı unutursa, sayfa **sessizce yetkisiz kullanıcıya render edilir**. `owner/layout.tsx` ve `admin/layout.tsx` bunu doğru yapıyor, ama 98 çağrı noktasının tamamı bu denetimde tek tek incelenmedi.

**Öneri:** Ya `requireRole` yetkisizlikte doğrudan `redirect()` çağırsın (çağıranın unutması imkânsız hale gelir), ya da bir ESLint kuralı/mimari guard ile "`requireRole` dönüşü kontrol edilmeden kullanılamaz" zorunlu kılınsın. Mevcut `scripts/check-architecture-guards.mjs` bunun için doğal yer.

---

## 🟡 BULGU 4 — Testlerde gerçek production kullanıcı ID'si sabit kodlanmış

`route.test.ts` dosyalarında (`health-history`, `parasite-preferences`, `vaccine-preferences`) gerçek bir kullanıcının UUID'si ve e-postası yorum satırıyla birlikte gömülü:
`const testUserId = '4f1256db-...' // tufan.tabak@gmail.com`

Güvenlik açığı değil (UUID gizli bilgi sayılmaz) ama testleri tek bir gerçek hesaba bağımlı kılıyor; o hesap silinirse/değişirse testler kırılır. **Öneri:** Test fixture'ları seed edilmiş sabit bir test kullanıcısına taşınmalı.

---

## Özet Öncelik Tablosu

| # | Bulgu | Risk | Launch Blocker? |
|---|---|---|---|
| 1 | `getCurrentProfile()` içinde sabit kodlanmış dev kimlik arka kapısı | 🔴 Kritik | **Evet** |
| 2 | `canAssignRole` çağrı noktası ve DB tarafı doğrulanmalı | 🟡 Orta | Doğrulama gerekiyor |
| 3 | `requireRole` sessiz `null` dönüşü — çağıran unutabilir | 🟡 Orta | Hayır |
| 4 | Testlerde gerçek kullanıcı ID'si sabit kodlanmış | 🟢 Düşük | Hayır |

**Genel değerlendirme:** Kimlik doğrulama mimarisi beklediğimden daha olgun — güvenli varsayılanlar (yeni route otomatik korumalı), CSRF koruması, rate-limit + Turnstile, geniş RLS kapsamı ve disiplinli servis-rol kullanımı var. Tek gerçek engel, geliştirme kolaylığı için bırakılmış ve unutulmuş görünen arka kapı.

---

**Sıradaki adım (Adım 3): Çekvirdek Ürün Akışları** — pet ekleme sihirbazı, aşı/sağlık takvimi, beslenme, plan-yap akışları; veri tutarlılığı ve `ODIPET_AUDIT_CURRENT.md`'de açık bırakılmış kuduz aşısı boşluğu.

Bulgu 1'i düzeltip "kontrol et" dediğinizde doğrulayıp Adım 3'e geçerim.
