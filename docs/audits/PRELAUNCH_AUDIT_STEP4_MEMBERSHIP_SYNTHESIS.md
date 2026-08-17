# Adım 4 — Üyelik/Abonelik Mimarisi: Orchestrator Sentezi ve Doğrulama

**Görevlendirme:** `Plan` (yazılım mimarı) alt ajanı. Gerekçe: Read/Grep/Bash ile derin keşif yapabiliyor ama **Write/Edit araçları yok** — "doğrulamadan asla hatalı silme/ekleme yapma" kuralını araç seviyesinde garanti ediyor. Ajan tek satır kod değiştiremedi.

**Bu belgenin amacı:** Ajanın raporundaki iddiaları bağımsız doğrulamak. Rapor doğrudan silme kararlarına temel olacağı için, her kritik iddia orchestrator tarafından ayrıca kontrol edildi.

---

## 1. Bağımsız Doğrulama Sonuçları

| # | Ajanın iddiası | Doğrulama | Kanıt |
|---|---|---|---|
| 1 | `create-checkout` ve `webhook` route'ları 410 stub — **satın alma akışı yok** | ✅ **DOĞRU** | İki dosyanın tamamı 4 satır: `return NextResponse.json({...}, { status: 410 })` |
| 2 | UI hâlâ bu ölü ucu çağırıyor | ✅ **DOĞRU** | `UpgradeButton.tsx:38` → `fetch('/api/payments/create-checkout')` |
| 3 | `repository.ts` `.eq('plan', tier)` kullanıyor ama kolon `plan_tier` | ✅ **DOĞRU** | `repository.ts:90` `'plan'` ↔ `20260806220000...sql:193` `plan_tier`, `:201` UNIQUE(feature_key, plan_tier). `feature_limits`'e `plan` kolonu ekleyen ADD COLUMN **yok** |
| 4 | `repository.ts` `usage_count` seçiyor ama kolon `count` | ✅ **DOĞRU** | `repository.ts:107` ↔ `20260806220000...sql:256` `count INTEGER NOT NULL` |
| 5 | TypeScript bunu yakalayamıyor (tipler eksik) | ✅ **DOĞRU** | `database.types.ts` içinde `feature_limits:` ve `feature_usage:` → **0 eşleşme**. Admin client generic'siz |
| 6 | `consume_feature_usage` tier'i sabit `'free'` okuyor | ✅ **DOĞRU** | `20260807090000...sql:61` `v_user_plan := 'free';`, `:67` bu değerle limit çekiyor. Sonraki migration'lar (`20260812*`) bu RPC'yi **yeniden tanımlamıyor**, yalnızca yorumda anıyor |
| 7 | Bundle kuralları yetki kararında ölü | ✅ **DOĞRU** | `policy.ts:13` `bundleContext` **7.** ve opsiyonel parametre; `engine.ts:32-39` yalnızca **6** argüman geçiyor → dal hiç çalışmıyor |
| 8 | `grantQuota` çalışamaz (`manual_override` enum'da yok) | ✅ **DOĞRU** | `ManualMembershipProvider.ts:243` `plan_tier: 'manual_override'` ↔ enum: `free, pro, ai_plus, enterprise` |
| 9 | `extendAiPlusAction` ham `pg` + localhost fallback + sahte idempotency | ✅ **DOĞRU** | `actions.ts:66` `DATABASE_URL \|\| 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'`; `:97` key = `admin_ai_plus_${Date.now()}_${Math.random()}` |
| 10 | `ManualMembershipProvider` de sahte idempotency key üretiyor | ✅ **DOĞRU** | `:162` `params.idempotencyKey \|\| 'extension_${Date.now()}_${Math.random()}'` |
| 11 | `referral_rewards` DROP edilmiş ama bir RPC hâlâ INSERT ediyor | ✅ **DOĞRU** | DROP: `20260731190000...sql:26`. INSERT: `20260809230000...sql:588` **ve `:611`** (ajan birini yazmış, **iki** tane var). Sonrasında CREATE eden migration yok |
| 12 | Referans ödül günü UI'da sabit kodlanmış | ✅ **DOĞRU** | `owner/referral/page.tsx:39-40` `(qualifiedCount * 30) + (>=5 ? 60 : 0)` — backend ayarlarını okumuyor |
| 13 | `daysLeft = 36500` (100 yıl) hatası | ✅ **DOĞRU** | `owner/referral/page.tsx:24` |
| 14 | `policyMatrix.test.ts` repository'ye hiç dokunmuyor | ✅ **DOĞRU** | Testte `EntitlementRepository`/`repository` → **0 eşleşme**. Kolon hatası testlerden kaçıyor |

**Sonuç: 14/14 kritik iddia doğrulandı.** Rapor güvenilir. Ajan ayrıca kendi bilmediğini bilme konusunda dürüst davrandı — canlı DB doğrulaması gerektiren maddeleri açıkça işaretledi.

**Orchestrator düzeltmesi (tek):** Madde 11'de INSERT **iki** yerde (`:588` ve `:611`), ajan bir tane yazmış. Düzeltme yapılırken ikisi de ele alınmalı.

---

## 2. Sentez — Bu ne anlama geliyor?

Denetimin başında "üyelik mimarisinde karışıklık var" diye başladık. Ortaya çıkan tablo bundan daha ciddi: **birbirinden bağımsız üç kırık halka, ödeme zincirinin tamamını kesiyor.**

```
Kullanıcı "Yükselt"e basar
   └─► create-checkout ──► 410 ✗            (halka 1: para alınamıyor)
Diyelim ki plan bir şekilde verildi (ödül/admin)
   └─► consume_feature_usage ──► tier='free' sabit ✗   (halka 2: kota FREE gibi ölçülüyor)
Diyelim ki kota da doğru
   └─► repository .eq('plan') ──► kolon yok ✗          (halka 3: yetki kontrolü hep reddediyor)
```

Üçü birden şu anlama geliyor: **Odi.Pet bugün ne para tahsil edebilir, ne de tahsil etseydi hizmeti teslim edebilirdi.** Bu, Adım 1-3'te bulduğumuz her şeyden daha büyük bir lansman engeli.

**Neden şimdiye kadar kimse fark etmedi?** Çünkü testler yeşil. `policyMatrix.test.ts` 20+ senaryo içeriyor ama `EntitlementPolicy.evaluate`'e elle uydurulmuş nesneler veriyor — veritabanına hiç gitmiyor. Bu, denetim boyunca **üçüncü kez** karşılaştığımız aynı desen:

| Adım | Sahte güven örneği |
|---|---|
| 1 | `any` temizliği "tsc temiz" raporlandı, gerçekte 31 hata vardı |
| 3 | `legal_required` testi var olmayan bir DB kolonunu test ediyordu |
| 4 | `policyMatrix` testi repository'yi hiç çağırmıyor |

Bu artık tekil bir hata değil, **sistemik bir test stratejisi sorunu**: birim testler mock'larla yazılıyor, gerçek şemaya vuran entegrasyon testi yok. Projede bunu yapabilen altyapı **var** (`credit-grant/route.test.ts` gerçek `pgClient` kullanıyor) — sadece kritik yollarda kullanılmamış.

---

## 3. Ajanın tasarımına dair değerlendirmem

**Katıldıklarım:**
- SSOT olarak `user_subscriptions` seçimi doğru. Zaten fiili SSOT ve son migration (`20260816014054`) onu doğru yönde pekiştirmiş — sıfırdan yazmak yerine üzerine inşa etme önerisi isabetli.
- "Kim hangi tier'da?" (`user_subscriptions`) ile "hangi tier neyi yapabilir?" (`feature_limits`) ayrımı net ve doğru. `app_plans`/`plan_bundles` bu iki soruya da cevap vermiyor — gereksiz üçüncü katman tespiti yerinde.
- `GREATEST(stripe, ödül)` kuralı kritik bir ayrıntı: bu olmadan ödeme yapan kullanıcının referans ödülü silinir. Bunu kendiliğinden yakalamış olması iyi.
- `pet_memberships`'i "üyelik değil, sahiplik/ACL" diye ayırması doğru — benim ön taramamdaki hatalı sınıflandırmamı düzeltti.

**Katılmadıklarım / eklediklerim:**
- Ajan FAZ 0'a 6 madde koymuş ama 0.4 (Stripe checkout+webhook yazımı) diğerlerinden **kat kat büyük** bir iş. Bunu aynı kovaya koymak FAZ 0'ın "küçük ve güvenli" olma amacını bozuyor. Ajan bunu kendisi de sezmiş ve alternatif sunmuş — bence o alternatif doğru olan.
- Tasarım "yayın öncesi uygulanacak" varsayımıyla yazıldı, ama bulgular bu varsayımı değiştirmeli: ödeme akışı **hiç yok**, yani bu bir "refactor" değil **sıfırdan yazma** işi. Yayın öncesi sıfırdan ödeme entegrasyonu yazmak, denetimin başında kaçınmak istediğimiz riskin ta kendisi.

---

## 4. Orchestrator önerisi — karar gerektiren tek soru

Ajanın FAZ 0'ı, cevabı size ait tek bir soruya bağlı: **lansmanda ödeme alınacak mı?**

**Seçenek A — Lansmanda ödeme YOK (önerim)**
- `UpgradeButton` "Yakında" durumuna alınır, 410 stub'ları kalır (zaten dürüst davranıyorlar).
- FAZ 0 şu **4 küçük maddeye** iner: canlı şema doğrulaması → kolon adı düzeltmesi (2 satır) → RPC'deki sabit `'free'` kaldırılması → ham `pg` admin yolunun kapatılması. Hepsi küçük, geri dönüşü kolay, test edilebilir.
- Ödül/davet ile verilen AI+ ve PRO **gerçekten çalışır** hale gelir — ürün vaadi teslim edilir.
- Stripe entegrasyonu lansman sonrası, acele etmeden, gerçek webhook testleriyle yazılır.
- Not: Adım 1'deki QA raporunda "ödeme ayarı yoksa butonları yanıltıcı başarı yerine kapalı tutar" testi zaten geçiyordu — yani ürün bu senaryoya hazır tasarlanmış.

**Seçenek B — Lansmanda ödeme VAR**
- FAZ 0'a sıfırdan Stripe checkout + webhook + idempotency + `GREATEST` kuralı + 4 olay tipi eklenir.
- Bu, gerçekçi olarak günler süren ve gerçek Stripe test ortamı gerektiren bir iş. Yayın tarihi buna göre kaymalı.

Hangisini seçerseniz seçin, **FAZ 0.1 (canlı şema doğrulaması) her durumda ilk iş.** Ajanın 3. ve 4. maddedeki iddiaları migration okumasına dayanıyor; projede migration dışı DB müdahale araçları var (`apply-migration*.js`, `run_in_dashboard.sql`, `scratch.sql`). Canlı şema farklıysa "düzeltme" çalışan bir sistemi bozar.

Doğrulama sorgusu (kod değişikliği yok, ~15 dk):
```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('feature_limits','feature_usage','user_subscriptions','referral_rewards')
ORDER BY table_name, column_name;
```

---

## 5. Sıradaki adım

1. **Siz:** Yukarıdaki A/B kararını verin.
2. **Siz veya bir alt ajan:** FAZ 0.1 doğrulama sorgusunu canlı DB'de çalıştırıp sonucu paylaşın.
3. **Ben:** Sonuca göre FAZ 0'ı kesinleştirip görevlendirmeyi yapar, iş bitince yine bağımsız doğrularım.

**Ajanın tam raporu** bu belgenin dayanağıdır; ideal veri modeli, karar tablosu (her mevcut yapı için KORU/BİRLEŞTİR/KALDIR), kaldırma etki analizi ve 8 maddelik test stratejisi orada. İstersen onu da ayrı bir dosyaya dökeyim.
