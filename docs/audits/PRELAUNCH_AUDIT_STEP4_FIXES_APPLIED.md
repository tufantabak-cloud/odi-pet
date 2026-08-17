# Adım 4 — Kalan Üç Sorunun Düzeltilmesi
Orchestrator tarafından uygulandı. İki tur doğrulama yapıldı.
**Kural:** Uygulama akışı ve yapısı korundu — mevcut fonksiyon imzaları, akış sırası ve mimari değişmedi; yalnızca anahtar üretim zamanı, zorunluluk kontrolleri ve bir SQL cast'i sertleştirildi.

---

## Yapılan Değişiklikler

### 1. Idempotency anahtarı artık panel/modal açılışında üretiliyor
`src/app/admin/memberships/MembershipsManagementClient.tsx`

**Önce:** Anahtar tıklama anında `detailActionKey || crypto.randomUUID()` ile üretiliyordu. `modalActionKey` için `setModalActionKey` hiç çağrılmadığından değer daima `''` idi → **her tıklamada yeni anahtar** → koruma hiç çalışmıyordu.

**Sonra:** İki `useEffect` eklendi; anahtar panel/modal **açıldığında bir kez** üretiliyor. Çağrı noktalarındaki `|| crypto.randomUUID()` fallback'leri kaldırıldı (fallback'in varlığı hatayı gizliyordu).

```ts
useEffect(() => {
  if (selectedDetailUser) setDetailActionKey(newIdempotencyKey());
}, [selectedDetailUser]);

useEffect(() => {
  if (activeModalUser && modalActionType) setModalActionKey(newIdempotencyKey());
}, [activeModalUser, modalActionType]);
```

Aksiyon sonrası anahtar yenileme (`:289`) **korundu** — sonraki işlem için taze anahtar üretiyor, doğru davranış.

### 2. `grantMembershipAction` kapsama alındı
- `src/app/admin/memberships/actions.ts:170` — imzaya `idempotencyKey` eklendi, boşsa hata fırlatıyor, servise iletiliyor.
- `src/lib/membership/MembershipService.ts:232` — `idempotencyKey || crypto.randomUUID()` fallback'i kaldırıldı; anahtar yoksa hata fırlatıyor. (Sunucuda üretilen anahtar her çağrıda farklı olacağı için korumayı anlamsız kılıyordu.)
- Çağrı noktası `MembershipsManagementClient.tsx:443` anahtarı geçiyor.

### 3. RPC enum cast'i beyaz listeye bağlandı
**Yeni migration:** `supabase/migrations/20260817110000_harden_consume_rpc_plan_cast.sql`
(Mevcut migration'a dokunulmadı — `CREATE OR REPLACE` ile yeni dosya.)

```sql
-- önce: ELSIF v_sub.plan IS NOT NULL AND v_sub.plan != 'free' THEN
-- sonra: ELSIF v_sub.plan IN ('pro', 'ai_plus') THEN
```
`user_subscriptions.plan` CHECK'siz serbest `TEXT`; beklenmedik bir değer (`premium`, `trial` vb.) `::plan_tier_enum` cast'inde exception fırlatıp RPC'yi komple patlatırdı. `ai_plus_until`/`pro_until` zaten öncelikli okunduğu için **işlevsel kayıp yok**.

### 4. (2. turda bulundu) `crypto.randomUUID()` güvenli-bağlam koruması
Proje LAN üzerinden http ile dev erişimini destekliyor (`next.config.ts` `allowedDevOrigins`, `package.json` `dev:mobile` → `http://192.168.1.21:3000`). `crypto.randomUUID` **yalnızca güvenli bağlamda** (HTTPS/localhost) tanımlıdır; o senaryoda `undefined` olur.

Anahtar üretimi artık `useEffect` içinde olduğu için, oradaki bir `TypeError` **admin panelini komple çökertirdi** (eski kodda hata yalnızca tıklama anında oluşurdu — yani bu düzeltme yeni bir çökme yolu açacaktı). Küçük bir güvenli yardımcı eklendi:

```ts
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```
Üretimde (HTTPS) her zaman ilk dal çalışır. Yedek dal yalnızca insecure dev bağlamında devreye girer ve orada da anahtar **açılışta bir kez** üretildiği için idempotency korunur.

---

## Doğrulama — Tur 1

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ 0 hata |
| `npx eslint` (3 değişen dosya) | ✅ 0 çıktı |
| `\|\| crypto.randomUUID()` fallback'leri | ✅ Hiç kalmadı |
| Anahtar üretim noktaları | ✅ `:186` panel açılışı, `:190` modal açılışı, `:289` aksiyon sonrası yenileme |
| Çağrı noktaları anahtar geçiyor mu | ✅ `:284`, `:443`, `:447` — üçü de |
| Sunucu tarafı zorunluluk | ✅ `actions.ts` `:47`, `:64`, `:171` + `MembershipService.ts:235` |

## Doğrulama — Tur 2 (bağımsız, daha derin)

| Kontrol | Sonuç |
|---|---|
| Değişen fonksiyonların **tüm** çağıranları | ✅ Her birinin tek çağıranı var, hepsi güncel — kırılan çağrı yok |
| Migration yapısal bütünlüğü | ✅ Kaynak ile birebir: `$$`=2, `IF`=26, `END IF`=13, `ELSIF`=2. `diff` yalnızca **1 satır** fark gösteriyor (hedeflenen satır) |
| Migration baş/son bütünlüğü | ✅ `CREATE OR REPLACE FUNCTION` … `$$ LANGUAGE plpgsql SECURITY DEFINER;` sağlam |
| Mevcut testler kırıldı mı | ✅ `membershipService.test.ts:100` zaten `idempotencyKey` geçiyor — kırılma yok |
| Güvenli-bağlam riski | ✅ Tur 2'de tespit edildi ve giderildi (madde 4) |
| `npx tsc --noEmit` (düzeltme sonrası tekrar) | ✅ 0 hata |
| `npx eslint` (düzeltme sonrası tekrar) | ✅ 0 çıktı |

### Çalıştırılamayan kontroller (ortam kısıtı, kod kaynaklı değil)
- `npx vitest run` → `@rolldown/binding-linux-x64-gnu` yok (`node_modules` Windows için kurulu, bu sandbox Linux).
- `npm run build` → `@next/swc-linux-x64-gnu` indirmesi gerekiyor, sandbox'ta ağ kapalı (`EAI_AGAIN registry.npmjs.org`).

Her ikisi de `main` branch'indeki CI gate'inde (`architecture-guard.yml`: Lint → TSC → Architecture → Vitest → Build) otomatik çalışacak.

---

## Çift tıklama senaryosu — düzeltme öncesi/sonrası

| Adım | Önce | Sonra |
|---|---|---|
| Admin detay panelini açar | anahtar `''` | anahtar üretilir (ör. `a1b2…`) |
| "+30 gün"e basar | `'' \|\| randomUUID()` → `X` | `a1b2…` gönderilir |
| Sabırsızlanıp tekrar basar | `'' \|\| randomUUID()` → `Y` (**farklı**) | `a1b2…` (**aynı**) |
| Sonuç | **60 gün eklenir** ❌ | ledger `idempotency_key` UNIQUE → **30 gün** ✅ |

---

## Durum

Üç sorunun üçü de kapatıldı, ek olarak 2. turda bulunan bir çökme riski giderildi. Değişiklikler **commit edilmedi** — çalışma kopyasında duruyor; incelemenizin ardından commit edebilirsiniz.

Önerilen commit mesajı:
`fix(membership): generate idempotency keys on panel open, cover grantMembership, harden plan enum cast`

**Not:** Çalışma kopyasında bu iş kapsamı dışında da değişiklikler var (`api/weather/route.ts`, `WeatherPawAlert.tsx`, `DashboardClient.tsx`, `lib/utils.ts`). Bunlar başka bir çalışmaya ait — commit'i ayırmak isteyebilirsiniz.

**Sıradaki adım (Adım 5): PWA / Mobil Deneyim** — service worker güncelleme stratejisi, offline davranışı, push bildirim izin akışı, responsive kontroller, kurulum (install) deneyimi.
