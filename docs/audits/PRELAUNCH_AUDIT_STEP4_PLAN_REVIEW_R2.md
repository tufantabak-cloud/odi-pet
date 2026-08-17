# Adım 4 — Revize Plan Değerlendirmesi (2. Tur)
Orchestrator incelemesi. Kod değişikliği yapılmadı.

**Karar: Bileşen 0 mevcut hâliyle uygulanmamalı.** Diğer 8 bileşen onaylanabilir durumda. Gerekçe aşağıda.

---

## ✅ Doğruladığım ve sağlam bulduklarım

| Bileşen | Doğrulama |
|---|---|
| 5 & 9 — `membership_credits`'ten SUM | ✅ **Geçerli.** `credit_days INT NOT NULL` ve `reason TEXT NOT NULL` kolonları var (`20260802200000...sql:62-63`); `grantReferralCredit.ts:97` ve `:109` gerçekten `reason: 'REFERRAL_REWARD'` yazıyor. Sorgunuz doğru veriyi bulacak. |
| 7 — `bundleContext` tamamen silinmesi | ✅ **Doğru karar.** No-op düzeltme yerine ölü kodu kaldırmak; mimar ajanın önerisiyle de örtüşüyor. |
| 6 — `grantQuota` kapatma | ✅ Enum'da `manual_override` yok, fonksiyon zaten çalışamıyor. |
| 8 — `referral_rewards` INSERT temizliği | ✅ İki satır (`:588`, `:611`) kapsanmalı — plan "satırları" (çoğul) diyor, doğru. |
| 4 — Referans akışı bozulmayacak | ✅ `grantReferralCredit.ts:98` zaten deterministik key geçiyor (`referral:${referralId}:referrer`). Zorunlu hâle getirme bu yolu kırmaz. |

---

## 🔴 BLOKE EDİCİ — Bileşen 0'ın SQL'i ödeme duvarını (paywall) yok ediyor

Önerilen migration:
```sql
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, is_enabled)
SELECT f.key, p.plan_tier, 'unlimited', true
FROM public.app_features f
CROSS JOIN unnest(enum_range(NULL::plan_tier_enum)) AS p(plan_tier)
ON CONFLICT (feature_key, plan_tier) DO NOTHING;
```

Bu migration **hatasız çalışır** — sözdizimi ve kısıtlar açısından geçerli (`limit_type='unlimited'` `chk_limit_type`'a uygun, `window_days` varsayılanı 30, `is_enabled` NOT NULL karşılanıyor). Sorun burada değil.

Sorun şu: **`free` tier'ı da `unlimited` olarak seed ediyor.**

Şemadaki tanım (`20260806220000...sql:205` yorumu):
> `limit_value`: `NULL = unlimited. 0 = feature disabled for this tier.`

INSERT `limit_value` vermiyor → `NULL` → **sınırsız**. Ve `enum_range` `free`'yi de kapsıyor.

Sonuç: `free` satırı bulunmayan **her** özellik, ücretsiz kullanıcılar için sınırsız açılır — `ai_vet`, `scan_document`, `pdf_export`, `nutrition_analysis`... Ürün hedefiniz "AI+ → PRO → FREE" katmanlaması; bu migration o katmanlamayı tek seferde ortadan kaldırır.

İki ayrı zarar:
1. **Ücretsiz kullanıcı her şeye sınırsız erişir** → ücretli katmanın anlamı kalmaz.
2. **Bugün kapalı olan özellikler aniden açılır** → `free` satırı olmayan bir özellik şu an herkese kapalı (RPC `NOT FOUND` → `FEATURE_DISABLED`); seed sonrası herkese sınırsız açılır. Bu, kasıtlı olarak kapatılmış bir şeyi sessizce açmak demek.

Bu, düzeltmelerin en tehlikeli türü: **çalışır, hata vermez, test yeşil geçer — ve iş modelini bozar.**

### Önerilen güvenli alternatif

Amaç "premium kullanıcı erişim kaybetmesin" idi; "herkese her şey açılsın" değil. Doğru yaklaşım: **`free` satırını referans alıp eksik `pro`/`ai_plus` satırlarını ondan türetmek.** Böylece premium kullanıcı her zaman en az free kadar hak alır, free hiç değişmez, hiçbir özellik yeni açılmaz.

```sql
INSERT INTO public.feature_limits
  (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
SELECT fl.feature_key, t.plan_tier,
       fl.limit_type, fl.limit_value, fl.window_days, fl.is_enabled
FROM public.feature_limits fl
CROSS JOIN (VALUES ('pro'::public.plan_tier_enum),
                   ('ai_plus'::public.plan_tier_enum)) AS t(plan_tier)
WHERE fl.plan_tier = 'free'
ON CONFLICT (feature_key, plan_tier) DO NOTHING;
```

Özellikleri:
- `free` tier'a **hiç dokunmaz** (kaynak olarak okur, yazmaz).
- Yalnızca eksik `pro`/`ai_plus` satırlarını doldurur; var olanları `ON CONFLICT DO NOTHING` ile korur.
- Davranış koruyucu: en kötü ihtimalle premium kullanıcı bugünkü free kotasıyla devam eder — yani **kimse bir şey kaybetmez**, kimse hak etmediği bir şey kazanmaz.
- `enterprise`'ı kapsam dışı bırakır (lansmanda yok).

Gerçek premium kotalar (örn. AI+ günde 50 sorgu) bundan **sonra**, ürün kararıyla ayrı bir seed'de belirlenmeli — bir migration'da acele edilecek bir konu değil.

**Ön koşul olarak hâlâ gerekli:** Migration'dan önce kapsama sorgusunu çalıştırıp `free` satırı olmayan özellik var mı görün. Varsa, o özellikler bugün zaten herkese kapalıdır ve bu bilinçli mi değil mi ürün kararıdır:
```sql
SELECT f.key,
       bool_or(l.plan_tier = 'free')    AS has_free,
       bool_or(l.plan_tier = 'pro')     AS has_pro,
       bool_or(l.plan_tier = 'ai_plus') AS has_ai_plus
FROM public.app_features f
LEFT JOIN public.feature_limits l ON l.feature_key = f.key
GROUP BY f.key ORDER BY 1;
```

---

## 🟡 Bileşen 4 — Plan bir çağrı noktasını atlıyor

`idempotencyKey`'i zorunlu yapmak doğru karar. Ama plan yalnızca `extendAiPlusAction`'dan bahsediyor; **`extendPlanAction` de aynı sorunu taşıyor ve planda geçmiyor:**

`actions.ts:46-56` — `extendPlanAction(profileId, additionalDays, reason)` `membershipService.extendPlan(...)` çağrısını **idempotencyKey olmadan** yapıyor. Çağıranı: `MembershipsManagementClient.tsx:418` → `await extendPlanAction(pid, modalDays, modalReason)`.

Tip zorunlu hâle gelince bu derleme hatası verecek — ki bu **iyi**, derleyici yakalıyor. Ama planda listelenmediği için, acele bir `Date.now()` fallback'iyle "düzeltilme" riski var. Açıkça kapsama alınmalı: `extendPlanAction` imzasına da `idempotencyKey: string` eklenmeli ve `MembershipsManagementClient.tsx:418` çağrısı güncellenmelidir.

**`crypto.randomUUID()` hakkında bir hassasiyet:** Anahtar, **modal/form açıldığında bir kez** üretilip state'te tutulmalı — tıklama anında (`onClick` içinde) üretilirse çift tıklama iki farklı UUID doğurur ve idempotency yine çalışmaz. Plandaki "form submit ile gönderilecek" ifadesi doğru yönde, ama uygulayan kişi için bu nüansın açıkça yazılması gerekiyor.

---

## 🟡 `policyMatrix.test.ts` silinmemeli

Plan "Mevcut sahte `policyMatrix.test.ts` testi yerine" diyor. O testin sorunu **sahte olması değil, tek başına olmasıydı**. `EntitlementPolicy.evaluate` saf bir fonksiyon; 20+ senaryoyla izole test edilmesi meşru ve değerli — özellikle Bileşen 7'de imzası değişecekken.

Öneri: policyMatrix **korunsun**, entegrasyon testi **eklensin**. İkisi farklı katmanı doğruluyor; biri diğerinin yerine geçmez. Kaybettiğimiz şey mock'lu test değil, gerçek şemaya vuran testin hiç olmamasıydı.

---

## Onay durumu

| Bileşen | Durum |
|---|---|
| 0 — Limit seed | 🔴 **Onaylanmadı** — SQL yukarıdaki güvenli sürümle değiştirilmeli; öncesinde kapsama sorgusu çalıştırılmalı |
| 1 — Kolon adları | ✅ Onaylandı |
| 2 — RPC tier okuması | ✅ Onaylandı (Bileşen 0 düzeltildikten **sonra**) |
| 3 — UpgradeButton | ✅ Onaylandı |
| 4 — Idempotency | 🟡 `extendPlanAction` + `MembershipsManagementClient.tsx:418` kapsama eklensin; UUID form açılışında üretilsin |
| 5 & 9 — Ledger'dan okuma | ✅ Onaylandı — kolon ve reason değeri doğrulandı |
| 6 — grantQuota | ✅ Onaylandı |
| 7 — bundleContext silme | ✅ Onaylandı |
| 8 — referral_rewards | ✅ Onaylandı (iki INSERT de) |
| Test planı | 🟡 policyMatrix korunsun, entegrasyon testi eklensin |

**Sıra değişmiyor:** Bileşen 0 (düzeltilmiş) → 1 → 2 → entegrasyon testi → 4 → 8 → 3 → 5/9 → 6 → 7.

Bu iki düzeltmeyle plan uygulanabilir. Uygulama bittiğinde her bileşeni tek tek bağımsız doğrularım — özellikle Bileşen 0'ın gerçekten `free` satırlarına dokunmadığını.
