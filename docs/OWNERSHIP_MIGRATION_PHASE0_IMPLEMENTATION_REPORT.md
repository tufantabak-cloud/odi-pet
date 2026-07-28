# Sahiplik Konsolidasyonu Faz 0 Uygulama Raporu

Tarih: 28 Temmuz 2026  
Doğrulama: Antigravity (kod tabanı grep + dosya incelemesi, 28 Temmuz 2026 16:48;
Codex yerel iki-kullanıcılı tarayıcı akışı + pgTAP + DB durum doğrulaması;
Antigravity ikinci doğrulama turu, 28 Temmuz 2026 17:35)
(yerel iki kullanıcılı tarayıcı akışı + pgTAP + DB durum doğrulaması,
28 Temmuz 2026)

## Sonuç

`pets.owner_id`, `pet_owners` ve `pet_members` artık birbirinden bağımsız
sahiplik yazma kaynakları değildir. Kanonik `pet_memberships` modeli eklendi;
kritik mutasyonlar transaction-safe RPC'lere taşındı ve eski tablolar geriye
dönük uyumluluk aynası olarak korundu.

Bu değişiklik üretim veritabanına uygulanmadı. Kod, migrasyon ve yerel doğrulama
tamamlandı; canlı geçiş ayrıca onaylı dağıtım adımı gerektirir.

## Uygulanan değişiklikler

- Kanonik üyelik, immutable audit ve migrasyon sorun kuyruğu tabloları eklendi.
- Yalnızca `pets.owner_id` güvenilir otomatik primary-owner backfill kaynağı
  kabul edildi.
- Kanıtlanamayan farklı `pet_owners` iddiaları otomatik yetkilendirilmeden
  `pet_membership_migration_issues` tablosuna alındı.
- Tek aktif primary-owner partial unique index ile korundu.
- Pet oluşturma, davet, kabul, rol değişimi, kaldırma, transfer ve silme
  işlemleri atomik RPC haline getirildi.
- Davet kabulünde e-posta doğrulaması/eşleşmesi, token kilidi (`FOR UPDATE`),
  süre ve tekrar kullanım denetimi eklendi; TOCTOU kalıbı kaldırıldı.
- Referral ödülleri davet kabulüyle aynı transaction içinde ve
  `ON CONFLICT (invite_id, rewarded_profile_id) DO NOTHING` ile idempotent işlendi.
- `pets.owner_id` değişimi transfer RPC dışında trigger ile engellendi.
- Legacy tabloların doğrudan authenticated mutasyon ve toplu silme yetkileri
  kaldırıldı (`REVOKE ALL … FROM PUBLIC, anon, authenticated`; yalnızca `SELECT`
  verildi).
- Pet silme tablo yetkisi kaldırılarak yalnızca primary-owner RPC'sine bağlandı.
- Pet oluşturma, düzenleme/silme, aile daveti/kabulü ve onboarding API yolları
  merkezi modele geçirildi.
- Rol değişimi ve primary-owner transferi için
  `PATCH /api/pets/family` sunucu sözleşmesi eklendi.
- Pet detay yetkilendirmesi legacy `pets.owner_id` filtresinden `can_view_pet`
  yeteneğine taşındı ([`page.tsx:31-38`](src/app/owner/pets/[id]/page.tsx));
  `pets_select_own` politikası `can_view_pet(id)` ile güncellendi
  ([migration:1551-1555](supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql)).
- Dashboard ve `/owner/pets` yönlendirmesi aktif `pet_memberships`
  kayıtlarını kullanacak şekilde güncellendi; paylaşılan petler ikinci
  kullanıcının dashboard'unda görünür hale geldi
  ([`dashboard-queries.ts:122-149`](src/app/owner/dashboard/dashboard-queries.ts),
  [`pets/page.tsx:10-14`](src/app/owner/pets/page.tsx)).
- Davet önizleme GET handler'ı `createAdminSupabaseClient()` kullanacak şekilde
  güncellendi; davet alıcısı henüz üye olmadığından RLS kaynaklı eksik
  pet/sahip bilgisi düzeltildi
  ([`invite/accept/route.ts:83-89`](src/app/api/invite/accept/route.ts)).
- Ekip ekranındaki belirsiz `profiles` ilişkisi açık
  `pet_members_profile_id_fkey` bağıyla düzeltildi
  ([`family/route.ts:103`](src/app/api/pets/family/route.ts)); rol değişimi ve
  kaldırma kontrolleri `canManageCaregivers` capability'sine bağlandı ve yalnızca
  yetkili kullanıcılara gösteriliyor
  ([`FamilyTab.tsx:25,44,202,219,255,346`](src/app/owner/pets/[id]/FamilyTab.tsx)).
- Supabase TypeScript türleri yeni yerel şemadan yeniden üretildi.
- Eski entegrasyon test fixture'ları atomik owner aynasına uygun idempotent
  hale getirildi.

## Değişen ana dosyalar

| Dosya | Satır sayısı | Amaç |
| --- | --- | --- |
| `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql` | 1722 | Kanonik şema, tüm RPC'ler, REVOKE/GRANT, policy'ler; `pets_select_own` viewer kapsayacak şekilde güncellendi |
| `supabase/tests/database/ownership_memberships_phase0.test.sql` | 559 | 38 pgTAP testi |
| `src/lib/pets/access.ts` | 64 | Server-only yetenek yardımcısı |
| `src/lib/database.types.ts` | 7830 | Yeni tablolar dahil güncel Supabase tipleri |
| `src/app/api/pets/route.ts` | 262 | POST → `create_pet_with_primary_membership` RPC |
| `src/app/api/pets/[id]/route.ts` | 176 | DELETE → `delete_pet_with_memberships` RPC |
| `src/app/api/pets/family/route.ts` | 213 | Tüm aile mutasyonları RPC'ye taşındı; açık FK ve `canManageCaregivers` yanıtı eklendi |
| `src/app/api/invite/accept/route.ts` | 100 | POST → `accept_pet_caregiver_invite` RPC; GET önizleme admin client ile güncellendi |
| `src/app/api/onboarding/route.ts` | 183 | Demo pet → `create_pet_with_primary_membership` RPC |
| `src/app/owner/pets/[id]/page.tsx` | 242 | Pet detay erişimi `can_view_pet` yeteneğine taşındı |
| `src/app/owner/pets/[id]/FamilyTab.tsx` | 358 | Rol/kaldırma kontrolleri `canManageCaregivers` capability'sine bağlandı |
| `src/app/owner/dashboard/dashboard-queries.ts` | 367 | Dashboard pet sorgusu `pet_memberships` aktif kayıtlara taşındı |
| `src/app/owner/pets/page.tsx` | 22 | Pet listesi `pet_memberships` aktif sayım kullanıyor |

## Eklenen şema nesneleri

### Enum türleri

- `public.pet_membership_role`: `primary_owner`, `co_owner`, `care_admin`,
  `care_editor`, `viewer`
- `public.pet_membership_status`: `active`, `revoked`
- `public.pet_membership_source`: `pet_creation`, `invitation`,
  `ownership_transfer`, `migration`, `admin_recovery`

### Tablolar

| Tablo | Amaç |
| --- | --- |
| `public.pet_memberships` | Kanonik sahiplik ve bakım üyeliği |
| `public.pet_membership_events` | Değiştirilemez audit; pet silinse de korunur |
| `public.pet_membership_migration_issues` | Kanıtsız legacy kayıt karantinası |

### İndeksler

| İndeks | Tür | Amaç |
| --- | --- | --- |
| `pet_memberships_one_active_primary_idx` | UNIQUE, partial | Tek aktif `primary_owner` garantisi |
| `pet_memberships_profile_status_pet_idx` | Normal | `(profile_id, status, pet_id)` sorgu hızı |
| `pet_memberships_pet_status_role_idx` | Normal | `(pet_id, status, role)` sorgu hızı |
| `pet_membership_events_request_idx` | UNIQUE | `request_id` idempotency |
| `pet_membership_events_pet_created_idx` | Normal | Audit zaman serisi sorguları |
| `pet_membership_migration_issues_source_idx` | UNIQUE | Legacy kayıt tekrar kaydı önleme |

### Tetikleyiciler

| Tetikleyici | Tablo | Amaç |
| --- | --- | --- |
| `touch_pet_membership_updated_at` | `pet_memberships` | `updated_at` otomatik güncelleme |
| `on_pet_created_add_owner` | `pets` | Legacy `pet_owners`/`pet_members` aynası oluşturma |
| `guard_pet_primary_owner_change` | `pets` | Transfer RPC işareti olmadan `owner_id` değişimini reddet |

### Yetenek fonksiyonları (SECURITY DEFINER, `search_path = ''`)

| Fonksiyon | DB adı | Verilen roller |
| --- | --- | --- |
| `current_pet_role` | `public.current_pet_role(uuid)` | `authenticated`, `service_role` |
| `can_view_pet` | `public.can_view_pet(uuid)` | `authenticated`, `service_role` |
| `can_edit_pet_profile` | `public.can_edit_pet_profile(uuid)` | `authenticated`, `service_role` |
| `can_manage_care` | `public.can_manage_pet_care(uuid)` | `authenticated`, `service_role` |
| `can_manage_caregivers` | `public.can_manage_pet_caregivers(uuid)` | `authenticated`, `service_role` |
| `can_publish_lost_report` | `public.can_publish_pet_lost_report(uuid)` | `authenticated`, `service_role` |
| `can_manage_ownership` | `public.can_manage_pet_ownership(uuid)` | `authenticated`, `service_role` |
| `can_delete_pet` | `public.can_delete_pet(uuid)` | `authenticated`, `service_role` |
| `can_manage_billing` | `public.can_manage_pet_billing(uuid)` | `authenticated`, `service_role` |
| `is_primary_pet_owner` | `public.is_primary_pet_owner(uuid)` | `authenticated`, `service_role` |

> **Not:** Spesifikasyon adları (`can_manage_care`, `can_manage_caregivers`)
> gerçek DB fonksiyon adlarından farklıdır (`can_manage_pet_care`,
> `can_manage_pet_caregivers`). `src/lib/pets/access.ts` DB adlarını doğru
> kullanmaktadır. Bu, spesifikasyondaki adlandırma tutarsızlığından
> kaynaklanmaktadır — kod tabanı kendi içinde tutarlıdır.

### Legacy uyumluluk sarmalayıcıları

- `public.user_has_pet_access(uuid)` → kanonik `can_view_pet` kullanır
- `public.user_is_pet_member(uuid)` → kanonik `can_view_pet` kullanır
- `public.user_pet_role(uuid)` → kanonik `current_pet_role` kullanır
- `public.user_owns_pet(uuid, uuid)` → `is_primary_pet_owner` ile hizalanır

### Atomik mutasyon RPC'leri

| RPC | Satır | İzin verilen çağıran |
| --- | --- | --- |
| `create_pet_with_primary_membership(jsonb)` | 584 | `authenticated`, `service_role` |
| `create_pet_caregiver_invite(uuid, text, text)` | 689 | `authenticated`, `service_role` |
| `accept_pet_caregiver_invite(text)` | 841 | `authenticated`, `service_role` |
| `remove_pet_caregiver(uuid, uuid)` | 1107 | `authenticated`, `service_role` |
| `change_pet_caregiver_role(uuid, uuid, text)` | 1195 | `authenticated`, `service_role` |
| `transfer_pet_primary_owner(uuid, uuid, uuid)` | 1322 | `authenticated`, `service_role` |
| `delete_pet_with_memberships(uuid, uuid)` | 1481 | `authenticated`, `service_role` |

## Kapatılan güvenlik açıkları

| Açık | Önceki durum | Faz 0 sonrası |
| --- | --- | --- |
| `pet_owners` self-INSERT | Herhangi bir auth kullanıcı `profile_id = auth.uid()` ile istediği `pet_id`'ye kayıt ekleyebiliyordu | REVOKE ALL; yalnızca RPC/trigger yazabilir |
| `pet_members` self-INSERT | Davet olmadan `profile_id = auth.uid()` ile üyelik kurulabiliyordu | REVOKE ALL; yalnızca `accept_pet_caregiver_invite` RPC |
| `pet_owners` global SELECT | Tüm auth kullanıcılar tüm sahiplik grafiğini okuyabiliyordu | `can_manage_pet_caregivers` ile daraltıldı |
| `user_has_pet_access()` rol-kör | `pet_owners` tablosunda herhangi bir satır varsa erişim veriyordu | Kanonik `can_view_pet` → role-aware |
| Pet oluşturma non-atomic | `pets` INSERT + `pet_owners` INSERT ayrı adımlar, ikinci adımın hatası göz ardı ediliyordu | Tek `create_pet_with_primary_membership` RPC |
| Davet kabulü TOCTOU | SELECT + INSERT ayrı adımlar; eşzamanlı replay açığı | `FOR UPDATE` kilidi + tek transaction |
| Referral rewards çoklu dağıtım | Race condition'da çoklu ödül mümkündü | `ON CONFLICT (invite_id, rewarded_profile_id) DO NOTHING` |
| Pet silme race condition | Önce `pet_owners` silindi, ardından `pets`; ikinci adım başarısız olursa yetim pet | Tek `delete_pet_with_memberships` RPC |
| `pets.owner_id` yetkisiz güncelleme | `UPDATE (owner_id)` izni vardı | `guard_pet_primary_owner_change` trigger + `REVOKE UPDATE` |

## Hâlâ açık kalan riskler ve blocker'lar

1. **Canlı şema doğrulaması yapılmadı.** Supabase bağlantısı olmadığından canlı
   policy/function snapshot alınamadı. Migration zinciri kanonik kaynak olarak
   kullanıldı. Üretime geçişten önce zorunludur.

2. **Primary-owner transferinin tarayıcı UI akışı yok.** İki kullanıcılı
   davet → kabul → editör erişimi → viewer rol değişimi → üyelik kaldırma
   akışı yerel üretim derlemesinde tarayıcıdan doğrulandı. Primary-owner
   transferi 38/38 pgTAP paketiyle doğrulandı; ancak kullanıcı arayüzünde
   transfer kontrolü bulunmadığından tarayıcıdan çalıştırılmadı.

3. **`pet_nutrition_logs` ve `profiling_prompts` owner-only RLS politikaları.**
   `20260707000005_enable_rls_missing_tables.sql` içindeki bu politikalar Faz 0
   kapsamında güncellenmedi; paylaşımlı kullanıcılar bu modüllerde 403 alabilir.
   Faz 5 kapsam haritasında belgelenmiştir.

4. **`referral_rewards` canlı şema doğrulaması.** Yerel şemada
   `UNIQUE (invite_id, rewarded_profile_id)` doğrulandı ve tarayıcı davet
   kabulünde iki idempotent ödül üretildi. Canlı şema yine dağıtım öncesi
   salt okunur olarak doğrulanmalıdır.

5. **Avatar/cover storage telafisi.** `create_pet_with_primary_membership`
   DB transaction başarısız olursa, önceden yüklenmiş storage nesneleri yetim
   kalabilir. Storage cleanup mekanizması mevcut değil; sonraki pakette ele alınmalı.

6. **`change_pet_caregiver_role` ile co-owner terfisi.** Mevcut implementasyonda
   `co_owner` rolü RPC üzerinden atanabilir ama `can_manage_pet_caregivers`
   kontrolü bu senaryoyu kısıtlayabilir. Transfer akışından bağımsız co-owner
   atama senaryosu uçtan uca test edilmedi.

## API/PWA geriye uyumluluk

| Endpoint | Yanıt şekli korundu mu? | Doğrulama yöntemi |
| --- | --- | --- |
| `POST /api/pets` | ✓ | Kaynak kod incelemesi: `id`, `name` alanları aynı |
| `DELETE /api/pets/[id]` | ✓ | `{ success: true }` veya hata mesajı — değişmedi |
| `POST /api/invite/accept` | ✓ | RPC yanıtı `{ ok, pet, role }` → route aynı HTTP yanıtı üretir |
| `GET /api/pets/family` | ✓ | Okuma yolu değişmedi |
| `POST /api/pets/family` | ✓ | Yeni `PATCH` action'ları eklendi, mevcut `DELETE` korundu |
| `POST /api/onboarding` | ✓ | Demo pet akışı aynı yanıt şeklini döndürür |

## Doğrulama kanıtı

| Test | Sonuç | Not |
| --- | --- | --- |
| pgTAP ownership paketi | **38/38** — `plan(38)` kodu doğrulandı | `SELECT plan(38)` satır 5 |
| TypeScript `database.types.ts` tip kapsamı | ✓ | `pet_memberships`, `pet_membership_events`, `pet_membership_migration_issues` L5013–5108 |
| `src/lib/pets/access.ts` server-only | ✓ | L1: `import 'server-only'` |
| Tüm API rotaları RPC kullanıyor | ✓ | Direct `pet_owners`/`pet_members` INSERT kalmadı |
| REVOKE ALL legacy tablolar | ✓ | Migration L1616–1618: `pet_owners`, `pet_members`, `pet_invites` |
| `guard_pet_primary_owner_change` trigger | ✓ | Migration L557–582 |
| `accept_pet_caregiver_invite` TOCTOU → `FOR UPDATE` | ✓ | Migration L872–876 |
| Referral idempotency key | ✓ | Migration L1055: `ON CONFLICT (invite_id, rewarded_profile_id)` |
| `pets_select_own` viewer dahil kanonik | ✓ | Migration L1551–1555: `USING (can_view_pet(id))` |
| Pet detay `can_view_pet` geçişi | ✓ | `page.tsx` L31–38: `hasPetCapability(serverSupabase, id, 'can_view_pet')` |
| Dashboard `pet_memberships` geçişi | ✓ | `dashboard-queries.ts` L123–141: `from('pet_memberships').eq('profile_id', uid).eq('status', 'active')` |
| `/owner/pets` list `pet_memberships` | ✓ | `pets/page.tsx` L10–14: `from('pet_memberships').eq('profile_id', ...).eq('status', 'active')` |
| Davet önizleme RLS fix | ✓ | `invite/accept/route.ts` L83–89: `createAdminSupabaseClient()` + açık FK |
| Family route açık FK | ✓ | `family/route.ts` L103: `profiles!pet_members_profile_id_fkey` |
| FamilyTab `canManageCaregivers` UI gating | ✓ | `FamilyTab.tsx` L202,219,255,346: tüm yönetim kontrolleri koşullandırılmış |
| Yerel iki-kullanıcılı tarayıcı akışı | ✓ | Davet oluşturma, önizleme, kabul, erişim açılma, dashboard görünürlüğü, Editor→Viewer rol değişimi, kaldırma, erişim iptali |
| Viewer pet detay erişimi + ekip kontrolleri gizli | ✓ | Viewer pet detayını açtı; rol/kaldırma butonları gizli kaldı |
| Kaldırma sonrası DB durumu | ✓ | `active=0`, `revoked=1`, legacy `pet_members=0`, `membership_revoked` audit olayı |
| Referral UNIQUE anahtarı (yerel) | ✓ | `pg_constraint` doğrulaması: `UNIQUE (invite_id, rewarded_profile_id)` mevcut |

Raporun ilk versiyonundaki "37/37" ifadesi **yanlıştı**; gerçek test sayısı
`SELECT plan(38)` beyanıyla uyumlu olarak **38'dir**.

Kimlik doğrulamalı iki-kullanıcılı davet oluşturma, önizleme, kabul, erişim
açılma, dashboard ve pet listesi görünürlüğü, Editor→Viewer rol değişimi,
kaldırma ve erişim iptali UI akışı yerel üretim derlemesinde tarayıcıdan
tamamlandı. Primary-owner transferi kullanıcı arayüzünde kontrol bulunmadığından
yalnızca `transfer_pet_primary_owner` RPC ve 38/38 pgTAP testi seviyesinde
doğrulandı.

## Üretime geçiş kapıları

1. Canlı veritabanının salt okunur yedeğini ve sahiplik tutarlılık sorgularını alın.
2. `referral_rewards` tablosunda `UNIQUE (invite_id, rewarded_profile_id)`
   constraint'inin canlı şemada mevcut olduğunu doğrulayın (yerel şemada doğrulandı).
3. Migrasyonu bakım penceresinde uygulayın; legacy tabloları silmeyin.
4. `pet_membership_migration_issues` satırlarını kişi bazında inceleyin.
   Kanıtlanmayan satırları otomatik co-owner yapmayın.
5. Pet oluşturma ve aile daveti API'lerini küçük kullanıcı grubunda canary
   olarak izleyin.
6. Tek primary-owner, yetkisiz erişim ve invite kabul hata oranlarını izleyin.
7. Geri dönüşte yeni tabloları drop etmeyin; uygulama sürümünü geri alın ve
   uyumluluk aynalarını koruyun. Canlı veri yazıldıktan sonra yıkıcı rollback
   uygulanmamalıdır.

## Sonraki faz

- Primary-owner transferi için açık, onaylı ve geri dönüş bilgisi içeren UI
  kontrolü tasarlama; mevcut atomik `transfer_pet_primary_owner` RPC'yi
  tarayıcıdan doğrulama.
- Pet kapsamlı tüm RLS politikalarını tablo tablo `can_*` yeteneklerine taşıma
  (Faz 5); özellikle `pet_nutrition_logs` ve `profiling_prompts` owner-only
  politikaları — şu an paylaşımlı kullanıcılara 403 döndürüyor.
- Admin panelinde yalnızca güvenli inceleme/çözümleme arayüzüyle migrasyon sorun
  kuyruğunu yönetme; doğrudan sahiplik CRUD'u açmama.
- `referral_rewards` UNIQUE constraint varlığını canlı şemada doğrulama
  (yerel doğrulandı).
- Avatar/cover storage yetim nesne telafi mekanizması.
- Legacy okuma kullanım sayısı sıfıra indikten sonra ayrı onayla
  `pet_owners`/`pet_members` emeklilik fazı.

## Codex'in tekrar doğrulaması gereken noktalar

1. `referral_rewards` tablosunda `UNIQUE (invite_id, rewarded_profile_id)`
   constraint'i canlı şemada mevcut mu?
2. `on_pet_created_add_owner` trigger'ı yeni kanonik yazımla çakışıyor mu?
   (Trigger `pet_members` aynasını oluşturuyor; `accept_pet_caregiver_invite`
   de `pet_members`'a `ON CONFLICT … DO UPDATE` yazıyor — çift yazım var ama
   idempotent. Yine de canary izlemesinde gözlemlenmeli.)
3. `change_pet_caregiver_role` RPC üzerinden `co_owner` atamasının
   `can_manage_pet_caregivers` kontrolüyle çatışıp çatışmadığı.
4. `20260707000005_enable_rls_missing_tables.sql` politikalarının canlıda
   `pet_nutrition_logs`/`profiling_prompts` için paylaşımlı kullanıcıları
   fiilen bloke edip etmediği.
