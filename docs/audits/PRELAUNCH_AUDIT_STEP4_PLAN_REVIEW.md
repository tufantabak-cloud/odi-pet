# Adım 4 — Uygulama Planı Değerlendirmesi (Seçenek A)
Orchestrator incelemesi. Kod değişikliği yapılmadı. Plan **uygulanmadan önce** iki maddenin düzeltilmesi gerekiyor.

## Genel değerlendirme

Plan doğru yönde ve doğru kapsamda: mevcut migration'lara dokunmuyor, yeni migration üretiyor, ödeme akışını dürüstçe kapatıyor. Canlı DB çapraz doğrulamasının (FAZ 0.1) yapılmış olması kritikti — teşekkürler, bu ön koşuldu.

**Bağımsız olarak doğruladığım iki teknik varsayım — ikisi de sağlam:**

| Varsayım | Sonuç |
|---|---|
| Bileşen 2, `user_subscriptions.ai_plus_until` / `pro_until` kolonlarını okuyacak | ✅ **Geçerli.** Bu kolonlar gerçekten var: `20260807110000...sql:12` ve `20260807130000...sql:12-13` ile eklenmiş. Plan var olmayan bir kolona dayanmıyor. |
| Bileşen 1, `repository.ts:122`'de `row.usage_count` düzeltmesi | ✅ **Geçerli.** Satır 122: `data.reduce((acc, row) => acc + (row.usage_count \|\| 0), 0)` — gerçekten orada, üç noktalı düzeltme eksiksiz. |

---

## 🔴 EKSİK 1 — Bu düzeltme, mevcut durumdan **daha kötü** bir sonuç üretebilir

Plan `consume_feature_usage`'ın tier'i gerçekten okumasını sağlıyor (Bileşen 2). Ama şu ön koşulu içermiyor: **`feature_limits` tablosunda `pro` ve `ai_plus` satırları var mı?**

RPC'nin davranışı (`20260807090000...sql:69-75`):
```sql
SELECT ... FROM feature_limits WHERE feature_key = p_feature_key AND plan_tier = v_user_plan::plan_tier_enum;
IF NOT FOUND OR v_limit_record.is_enabled = false THEN
  RETURN ... 'reason', 'FEATURE_DISABLED' ...
```

Yani **limit satırı yoksa erişim tamamen kapanıyor.**

Bugün herkes `'free'` olarak ölçülüyor → sistem yalnızca `free` satırlarına ihtiyaç duyuyor ve muhtemelen sadece onlar dolu. Düzeltmeden sonra bir AI+ kullanıcı `plan_tier='ai_plus'` satırı arayacak; o satır yoksa:

| | Bugün | Düzeltmeden sonra (satır yoksa) |
|---|---|---|
| AI+ kullanıcı | FREE kotasıyla çalışıyor (az ama **çalışıyor**) | `FEATURE_DISABLED` — **hiç çalışmıyor** |

Yani ödül/davetle AI+ verilen kullanıcılar, düzeltmeyi yaptığınız anda özelliği tamamen kaybedebilir. Bu, çözmeye çalıştığımız sorunun daha kötü bir versiyonu.

**Bunun gerçek bir risk olduğuna dair kanıt:** Feature tanımları (`src/lib/features/definitions/*.ts`) **tier bazlı limit içermiyor** — `ai.ts` dosyasının tamamına baktım, `plan_tier`/`limits` alanı yok. Yani `feature_limits` satırları kod tarafından değil, admin publish akışı (`20260807020000_publish_rpc.sql`) veya sync RPC ile dolduruluyor. Dolayısıyla `pro`/`ai_plus` satırlarının eksiksiz olduğuna dair hiçbir garanti yok.

**Plana eklenmesi gereken — Bileşen 0 (diğer her şeyden önce):**
```sql
-- Her kayıtlı feature için her tier'da satır var mı?
SELECT f.key AS feature_key,
       bool_or(l.plan_tier = 'free')    AS has_free,
       bool_or(l.plan_tier = 'pro')     AS has_pro,
       bool_or(l.plan_tier = 'ai_plus') AS has_ai_plus
FROM app_features f
LEFT JOIN feature_limits l ON l.feature_key = f.key
GROUP BY f.key
ORDER BY 1;
```
Eksik satırlar **Bileşen 2'den önce** seed edilmeli. Aksi halde düzeltme bir kesintiye dönüşür.

---

## 🔴 EKSİK 2 — Bileşen 4'teki "deterministik" anahtar hâlâ deterministik değil

Plan şunu öneriyor:
```
admin_ai_plus_${Date.now()}_${Math.random()}   →   admin_ai_plus:${profileId}:${Date.now()}
```

`Math.random()` çıkarılmış ama **`Date.now()` duruyor.** Her çağrıda farklı değer üretir; çift tıklamada iki ayrı anahtar → iki kez gün eklenir. Yani düzeltilmek istenen hata (R2: çift gün verme, para riski) **düzelmiyor**, sadece daha az rastgele oluyor.

Idempotency anahtarı, aynı kullanıcı niyetinin aynı anahtarı üretmesi demektir. Seçenekler:
- **En sağlamı:** İstemciden gelen bir `clientRequestId` (form render'ında bir kez üretilir) → `admin:${adminId}:${profileId}:extend:${clientRequestId}`
- **Yeterli olan:** Zaman penceresine yuvarla → `admin:${adminId}:${profileId}:${days}d:${new Date().toISOString().slice(0,13)}` (saat bazlı; aynı admin aynı kullanıcıya aynı saat içinde aynı gün sayısını iki kez veremez)

Aynı hata `ManualMembershipProvider.ts:162`'de de var (`extension_${Date.now()}_${Math.random()}`) ve plan buna hiç değinmiyor — Bileşen 4'e dahil edilmeli.

---

## 🟡 Bileşen 7 hiçbir şey değiştirmiyor

`EntitlementPolicy.evaluate(...)` çağrısına 7. argüman olarak `undefined` geçmek, JavaScript'te argümanı **hiç geçmemekle birebir aynı**. `bundleContext` zaten opsiyonel (`policy.ts:13`). Bu değişiklik derlemeyi de davranışı da etkilemez — "ileride hazır olsun" faydası sağlamaz.

**Öneri:** Ya bu bileşeni plandan çıkarın, ya da gerçek bir şey yapın: `bundleContext`'i tamamen kaldırın (mimar ajanın önerisi de buydu — bundle mantığı yetki kararında ölü). Yarım bırakmak, ileride birini "bundle bağlı" sanmaya sevk eder.

---

## 🟡 Bileşen 5 ve 9 yarım çözüm

Plan, sabit `qualifiedCount * 30` hesabını "`system_settings`'den oku **veya en azından import edilen sabit kullan**" diyor. Paylaşılan sabit kullanmak, iki yerdeki kopyayı üçe çıkarmaktan başka bir şey yapmaz — UI hâlâ *yeniden hesaplıyor*.

Doğrusu: kullanıcının gerçekten kazandığı gün **zaten veritabanında kayıtlı** (`membership_credits`, `referral:${referralId}:*` idempotency anahtarlarıyla). UI bu kayıtların toplamını okumalı, hesaplamamalı. Böylece backend kuralları (kademeli bonuslar, aylık cap) değiştiğinde UI otomatik doğru kalır.

Bu, Bileşen 5.1'deki `daysLeft = 36500` düzeltmesiyle de tutarlı: her iki sayı da tek kaynaktan okunmalı.

---

## 🟡 Eksik: Doğrulama planı, sorunun kök nedenini adreslemiyor

Planın doğrulama bölümü `tsc --noEmit` + `npm run build` + elle kontrol öneriyor. Ama bu hata **tam olarak bu iki komut yeşilken** aylarca canlıda durdu:

- `tsc` yakalayamaz → `database.types.ts` içinde `feature_limits`/`feature_usage` tipleri **yok** (0 eşleşme), admin client generic'siz
- Birim testler yakalayamaz → `policyMatrix.test.ts` repository'ye **hiç dokunmuyor** (0 eşleşme)

Yani aynı doğrulama araçlarıyla devam etmek, aynı sınıftaki bir sonraki hatayı da kaçırmak demek.

**Eklenmesi gereken tek test (gerisi ertelenebilir):** Gerçek DB'ye vuran bir entegrasyon testi — AI+ kullanıcı oluştur → korumalı bir ucu (`ai_vet`) çağır → **200** bekle; FREE kullanıcı → **403** bekle. Proje bunu zaten yapabiliyor: `src/app/api/admin/memberships/credit-grant/route.test.ts` gerçek `pgClient` ile çalışan hazır bir örnek.

Bu tek test, üç bileşenin (1, 2 ve limit seed'inin) hepsini birden doğrular.

---

## Revize edilmiş uygulama sırası

| Sıra | İş | Neden bu sırada |
|---|---|---|
| **0** | `feature_limits` tier kapsama sorgusu + eksik satırların seed'i | Bileşen 2'yi kesintiye dönüştürmemek için **zorunlu ön koşul** |
| 1 | Bileşen 1 (kolon adları, 3 nokta) | Küçük, izole, geri dönüşü kolay |
| 2 | Bileşen 2 (RPC tier okuması) | 0 tamamlanmadan yapılmamalı |
| 3 | **Entegrasyon testi** (AI+ → 200, FREE → 403) | 1 ve 2'nin gerçekten çalıştığının tek kanıtı |
| 4 | Bileşen 4 (ham `pg` + **gerçek** idempotency, `ManualMembershipProvider:162` dahil) | Para riski |
| 5 | Bileşen 8 (`referral_rewards` INSERT temizliği — **iki** satır: `:588` ve `:611`) | Bakıcı daveti akışını açar |
| 6 | Bileşen 3 (UpgradeButton "Yakında") | Kullanıcıya dürüst mesaj |
| 7 | Bileşen 5 + 9 (referral günleri — **ledger'dan oku**, sabit kullanma) | Tutarlılık |
| 8 | Bileşen 6 (`grantQuota` throw) | Ölü kod, risksiz |
| — | Bileşen 7 | **Çıkarılmasını öneriyorum** (no-op) |

---

## Özet

Plan sağlam ve doğru kapsamda; iki teknik varsayımı bağımsız doğruladım, ikisi de geçerli. Ama uygulanmadan önce **iki düzeltme şart**:

1. **Bileşen 0 eklenmeli** — `feature_limits`'te `pro`/`ai_plus` satırları doğrulanıp eksikler seed edilmeden Bileşen 2 uygulanırsa, premium kullanıcılar özelliği tamamen kaybeder.
2. **Bileşen 4'teki anahtar gerçekten deterministik olmalı** — `Date.now()` kaldıkça çift gün verme riski sürüyor; `ManualMembershipProvider.ts:162` de aynı kapsama alınmalı.

Ayrıca: Bileşen 7 çıkarılsın (no-op), Bileşen 5/9 sabit yerine ledger'dan okusun, ve doğrulama planına gerçek DB'ye vuran tek bir entegrasyon testi eklensin.

Bu düzeltmelerle plan uygulanabilir. Uygulama bittiğinde her bileşeni tek tek bağımsız doğrularım.
