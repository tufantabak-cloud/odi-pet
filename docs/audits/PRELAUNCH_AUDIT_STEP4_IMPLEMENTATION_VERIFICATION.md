# Adım 4 — Uygulama Doğrulaması
Orchestrator bağımsız kontrolü. Kod değişikliği yapılmadı.

**Sonuç: 9 bileşen doğrulandı, Bileşen 4 amacına ulaşmıyor.** Commit atmadan önce düzeltilmeli.

---

## ✅ Doğrulanan Bileşenler

| # | Bileşen | Doğrulama |
|---|---|---|
| **0** | Güvenli seed | ✅ **Tam olarak önerilen sürüm.** `WHERE fl.plan_tier = 'free'` ile free satırları yalnızca **kaynak** olarak okunuyor, hiç yazılmıyor. `CROSS JOIN (VALUES ('pro'),('ai_plus'))` — `enterprise` ve `free` kapsam dışı. `limit_value`, `limit_type`, `window_days`, `is_enabled` free'den kopyalanıyor → hiçbir özellik sınırsız olmuyor. `ON CONFLICT DO NOTHING` mevcut satırları koruyor. **Paywall riski sıfırlandı.** |
| **1** | Kolon adları | ✅ Üç noktanın hepsi: `:92` `plan_tier`, `:107` `select('count')`, `:122` `row.count`. |
| **2** | RPC tier okuması | ✅ `user_subscriptions`'tan okuyor, öncelik sırası doğru: `ai_plus_until > now()` → `pro_until > now()` → `plan` → `'free'`. Sadece `status IN ('active','trialing')` satırları. |
| **3** | UpgradeButton | ✅ `create-checkout` fetch'i kaldırılmış, `disabled={true}`, etiket "Yakında". |
| **5/9** | Referans günleri | ✅ Hem `page.tsx:46-49` hem `route.ts:29-32` `membership_credits` + `reason='REFERRAL_REWARD'` okuyor. Sabit `qualifiedCount * 30` ve `36500` kalmadı; `daysLeft` artık `ai_plus_until`/`pro_until`/`current_period_end` içinden en büyük **gelecek** tarihten hesaplanıyor — doğru. |
| **6** | grantQuota | ✅ `manual_override` bloğu gitti, `throw new Error(...)` kaldı. |
| **7** | bundleContext | ✅ `policy.ts` ve `engine.ts`'te sıfır eşleşme. |
| **8** | referral_rewards | ✅ Kalan 2 eşleşme yalnızca **yorum satırı** (`:1` ve `:188`); gerçek `INSERT INTO referral_rewards` yok. `care_points` doğrudan güncelleniyor (`:190` +50, `:194` +25). |
| — | Testler | ✅ `policyMatrix.test.ts` **korunmuş** (önerdiğim gibi), yanına `consume_feature_usage.test.ts` eklenmiş. |
| — | `tsc --noEmit` | ✅ 0 hata. |

---

## 🔴 BİLEŞEN 4 — Idempotency koruması ilk tıklamada devreye girmiyor

Tip zorunluluğu ✅ (`types.ts:76` `idempotencyKey: string`), `Date.now()`/`Math.random()` fallback'leri ✅ kaldırılmış, localhost fallback ✅ kaldırılmış (`actions.ts:69` artık hata fırlatıyor), `extendPlanAction` ✅ kapsama alınmış. Sunucu tarafı doğru.

**Sorun istemci tarafında.** `MembershipsManagementClient.tsx`:

```
:149  const [detailActionKey, setDetailActionKey] = useState<string>('');   // boş başlıyor
:156  const [modalActionKey,  setModalActionKey]  = useState<string>('');   // boş başlıyor

:260  await extendAiPlusAction(..., detailActionKey || crypto.randomUUID());
:423  await extendPlanAction(...,  modalActionKey  || crypto.randomUUID());

:265  setDetailActionKey(crypto.randomUUID());   // ← ilk aksiyondan SONRA
```

`|| crypto.randomUUID()` ifadesi **tıklama anında** çalışıyor. Yani:

| Yol | Durum |
|---|---|
| `modalActionKey` | Kodun **hiçbir yerinde `setModalActionKey` çağrılmıyor** (grep: yalnızca `:156` tanım, `:423` kullanım). Değer sonsuza kadar `''` → her tıklamada yeni UUID → **`extendPlanAction` hiçbir zaman idempotent değil.** |
| `detailActionKey` | `''` ile başlıyor, yalnızca `:265`'te ilk başarılı aksiyondan **sonra** doluyor. Yani **ilk işlemde** çift tıklama iki farklı UUID üretir → **iki kez gün eklenir.** |

Düzeltmek istediğimiz senaryo tam olarak buydu: admin "+30 gün" butonuna sabırsızlıkla iki kez basıyor. O senaryo hâlâ açık.

**Düzeltme:** Anahtar, aksiyondan sonra değil, **modal/panel açıldığında** üretilmeli ve `|| crypto.randomUUID()` fallback'i tamamen kaldırılmalı (fallback'in varlığı hatayı gizliyor):

```ts
// modal/detay panelini açan yerde:
setModalActionKey(crypto.randomUUID());     // openModal(...) içinde
setDetailActionKey(crypto.randomUUID());    // fetchUserDetails / panel açılışında

// çağrı yerinde fallback YOK:
await extendPlanAction(pid, modalDays, modalReason, modalActionKey);
await extendAiPlusAction(selectedDetailUser.id, addDaysAmount, addDaysReason, detailActionKey);
```
`:265`'teki "aksiyondan sonra yenile" satırı doğru ve kalmalı — sonraki işlem için taze anahtar üretiyor.

---

## 🟡 İki ikincil bulgu

**1. `grantMembershipAction` hâlâ korumasız.**
`MembershipService.ts:233` → `idempotencyKey: idempotencyKey || crypto.randomUUID()`. `actions.ts:170` `grantMembershipAction` bu parametreyi hiç geçmiyor, `MembershipsManagementClient.tsx:419` de öyle. Bu fonksiyon `extendPlan`'e delege ediyor, yani **gün ekliyor** — çift tıklamada çift gün. Bileşen 4'ün kapsamına alınmalıydı.

(`assignPlanAction` ve `startTrialAction` daha düşük riskli: onlar süreyi *ekleme* değil *set etme* işlemi, iki kez çalışması aynı sonucu verir.)

**2. `v_sub.plan` → enum cast'i savunmasız.**
Yeni RPC'de `:68-69`: `ELSIF v_sub.plan IS NOT NULL AND v_sub.plan != 'free' THEN v_user_plan := v_sub.plan;` ardından `:77` `v_user_plan::plan_tier_enum`.

`user_subscriptions.plan` serbest `TEXT` ve üzerinde **CHECK constraint yok** (doğruladım). Kodda yalnızca `free/pro/ai_plus` yazılıyor, ama eski veya elle girilmiş bir satırda (`premium`, `trial`, `enterprise_v2` gibi) farklı bir değer varsa cast **exception fırlatır** ve RPC komple patlar — kullanıcı özelliği kullanamaz hâle gelir.

Ucuz savunma: cast'i beyaz listeye bağlayın —
```sql
ELSIF v_sub.plan IN ('pro','ai_plus') THEN v_user_plan := v_sub.plan;
```
Bu, `ai_plus_until`/`pro_until` zaten öncelikli okunduğu için hiçbir işlevsellik kaybettirmez.

---

## 🟡 Süreç notu — branch değişmiş

`git log`: HEAD artık **`main`** (`1b5f877f chore(merge): integrate phase18-wip into main`). Denetim boyunca `phase18-wip` üzerinde çalışıyorduk.

Bu, bir şeyi değiştiriyor: Adım 1'de kurduğumuz CI gate (`architecture-guard.yml`) `main` push/PR'ında tetikleniyor — yani bu merge ile **5 adımlı gate (Lint → TSC → Architecture → Vitest → Build) ilk kez gerçek şartlarda çalışmış olmalı.** GitHub Actions sekmesinden bu çalışmanın yeşil geçtiğini teyit edin; bu, bu oturumda doğrulayamadığım Vitest sonuçlarının da ilk gerçek kanıtı olur.

Ayrıca bu bileşenlerin henüz commit edilip edilmediği net değil — çalışma kopyasındaki durumu doğruladım, commit durumunu siz teyit edin.

---

## Özet

| Bileşen | Durum |
|---|---|
| 0, 1, 2, 3, 5, 6, 7, 8, 9 + testler | ✅ Doğrulandı |
| 4 — Idempotency | 🔴 İstemci tarafı amacına ulaşmıyor; anahtar modal açılışında üretilmeli, fallback kaldırılmalı |
| `grantMembershipAction` | 🟡 Kapsam dışı kalmış, gün ekliyor |
| RPC `plan` cast'i | 🟡 Beyaz listeye bağlanmalı |

Bileşen 0'ın bu turdaki en kritik iş olduğunu ve **birebir doğru** uygulandığını özellikle belirtmek isterim — paywall riski tamamen ortadan kalktı.

Yukarıdaki üç maddeyi kapatıp "kontrol et" deyin; doğrulayıp Adım 4'ü kapatalım ve Adım 5'e (PWA / mobil deneyim) geçelim.
