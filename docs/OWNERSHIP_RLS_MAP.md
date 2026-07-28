# Odi.Pet Sahiplik ve RLS Haritası

Tarih: 28 Temmuz 2026  
Kapsam: `pets.owner_id`, `pet_owners`, `pet_members` konsolidasyonu — Faz 0  
Doğrulama: Antigravity grep + migration zinciri analizi (16:48);
Codex yerel iki-kullanıcılı tarayıcı ve RLS doğrulaması (17:35)

## Kanonik model

`pet_memberships` sahiplik ve bakım ekibi yetkisinin kanonik kaynağıdır.

| Alan | Amaç |
| --- | --- |
| `pet_id` | Evcil hayvan |
| `profile_id` | Kullanıcı profili |
| `role` | `primary_owner`, `co_owner`, `care_admin`, `care_editor`, `viewer` |
| `status` | `active` veya `revoked` |
| `source` | Oluşturma, davet, transfer, migrasyon veya admin kurtarma kaynağı |
| `invited_by`, `invite_id` | Davet zinciri |
| `accepted_at`, `revoked_at` | Üyelik yaşam döngüsü |

Her pet için yalnızca bir aktif `primary_owner` bulunabilir. Aynı pet ve profil
için tek üyelik kaydı tutulur; yeniden katılım mevcut kaydı etkinleştirir.
Geçmiş, yeni satır değil `pet_membership_events` üzerinden tutulur.

`pet_membership_events` değişmez audit geçmişidir. Pet silinse bile audit
olayları korunur (`ON DELETE SET NULL` ile FK). `pet_membership_migration_issues`,
güvenli biçimde otomatik terfi ettirilemeyen legacy sahiplik iddialarını
karantinaya alır.

## Faz 0 uyumluluk aynaları

| Kaynak | Faz 0 rolü | Yazma kuralı |
| --- | --- | --- |
| `pets.owner_id` | Birincil sahip uyumluluk alanı | Yalnızca oluşturma RPC'si veya `transfer_pet_primary_owner`; `guard_pet_primary_owner_change` trigger diğer değişimleri reddeder |
| `pet_owners` | Eski owner/co-owner kontrolleri için okuma aynası | İstemci mutasyonuna kapalı (REVOKE ALL → yalnızca SELECT); yalnızca RPC/trigger veya service role |
| `pet_members` | Eski aile/bakıcı ekranı için okuma aynası | İstemci mutasyonuna kapalı (REVOKE ALL → yalnızca SELECT); yalnızca RPC/trigger veya service role |
| `pet_invites` | Bekleyen davet görünümü | İstemci mutasyonuna kapalı (REVOKE ALL → yalnızca SELECT); yalnızca atomik RPC |

Legacy tablolar Faz 0'da silinmez. Mevcut web/PWA akışları kırılmadan kanonik
modele geçebilmek için kontrollü okuma aynası olarak tutulur.

## Split-Brain RLS Haritası (Mevcut Durum)

Aşağıdaki tablo, Faz 0 sonrası hangi modülün hangi mekanizmayı kullandığını gösterir.
Bu harita Faz 5'te tablo-tablo geçişin öncelik listesidir.

| Modül / Tablo | Erişim mekanizması | Doğrulama / Referans | Durum |
| --- | --- | --- | --- |
| Dashboard pet listesi | Aktif `pet_memberships` | `dashboard-queries.ts:122–141` | ✅ Kanonik |
| `/owner/pets` yönlendirme | Aktif `pet_memberships` sayım | `pets/page.tsx:10–14` | ✅ Kanonik |
| Pet detay sayfası | `can_view_pet` + `pets_select_own` RLS | `page.tsx:31–38`; migration L1551 | ✅ Kanonik |
| Aile/Davet UI (okuma) | Legacy `pet_members` + `pet_invites` okuma | `family/route.ts:99–108` | ✅ READ-ayna |
| Aile/Davet UI (yönetim kontrolleri) | `can_manage_pet_caregivers` | `FamilyTab.tsx:25,44,202,219,255` | ✅ Kanonik |
| Sosyal paylaşımlar | `pets.owner_id` | `social_posts` RLS | ⚠️ Faz 5 |
| AI-Vet, Bildirimler | `pets.owner_id` | İlgili route'lar | ⚠️ Faz 5 |
| Aşı kayıtları (`vaccine_records_v2`) | `pet_owners` varlık kontrolü | `20260529000002` | ⚠️ Faz 5 |
| Sağlık tedavileri, Journal | `pet_owners` varlık kontrolü | `20260529000002` | ⚠️ Faz 5 |
| Alerji, östrus döngüleri (app-level) | `pet_owners` sorgusu | API rotaları | ⚠️ Faz 5 |
| Masraf, beslenme atamaları | `pet_owners` sorgusu | API rotaları | ⚠️ Faz 5 |
| Östrus döngüleri (RLS) | `pets.owner_id` VEYA `pet_members` | `20260614120000` | ⚠️ Faz 5 |
| Takvim feed | `pet_members` varlık kontrolü | `calendar/feed` route | ⚠️ Faz 5 |
| Görevler | `pet_members` varlık kontrolü | Tasks API | ⚠️ Faz 5 |
| `pet_nutrition_logs` | `can_manage_pet_care` | `20260707000005` | ✅ Kanonik |
| `profiling_prompts` | `can_manage_pet_care` | `20260707000005` | ✅ Kanonik |

> ✅ **Faz 0'da kanonik modele geçirilen modüller** (tarayıcı E2E doğrulandı):
> Dashboard, pet listesi, pet detay, ekip yönetimi kontrolleri, beslenme logları, profil soruları.

## Rol ve yetenek matrisi

| Yetenek | DB fonksiyonu | Primary | Co-owner | Care admin | Care editor | Viewer |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| Peti görüntüleme | `can_view_pet` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pet profilini düzenleme | `can_edit_pet_profile` | ✓ | ✓ | | | |
| Bakım/sağlık verisi yönetme | `can_manage_pet_care` | ✓ | ✓ | ✓ | ✓ | |
| Bakıcıları yönetme | `can_manage_pet_caregivers` | ✓ | ✓ | ✓* | | |
| Kayıp ilanı yayımlama | `can_publish_pet_lost_report` | ✓ | ✓ | | | |
| Ortak sahip terfisi | `can_manage_pet_ownership` | ✓ | | | | |
| Birincil sahipliği transfer etme | `can_manage_pet_ownership` | ✓ | | | | |
| Pet silme | `can_delete_pet` | ✓ | | | | |
| Faturalandırma | `can_manage_pet_billing` | ✓ | | | | |

\* `care_admin` yalnızca alt bakıcı rolleri (`care_editor`, `viewer`) üzerinde
yönetim yapabilir; `co_owner` veya `primary_owner` atayamaz.

Yetenekler `current_pet_role` ve `can_*` fonksiyonları üzerinden çözülür.
`user_has_pet_access`, `user_is_pet_member`, `user_pet_role` ve
`user_owns_pet` eski imzalarını korur ancak kanonik yetenek katmanına yönlenir.

> **Adlandırma notu:** Spesifikasyon belgesindeki kısa isimler (`can_manage_care`,
> `can_manage_caregivers`) gerçek DB fonksiyon adlarından farklıdır. Gerçek
> adlar `public.can_manage_pet_care(uuid)` ve
> `public.can_manage_pet_caregivers(uuid)` şeklindedir. `src/lib/pets/access.ts`
> ve DB yetki granı doğru DB adlarını kullanmaktadır.

## Güvenli yazma yüzeyi

| İşlem | Tek yetkili yazma yolu | Migration satırı |
| --- | --- | --- |
| Pet + birincil üyelik oluşturma | `create_pet_with_primary_membership(jsonb)` | 584 |
| Bakıcı daveti oluşturma | `create_pet_caregiver_invite(uuid, text, text)` | 689 |
| Daveti kabul etme | `accept_pet_caregiver_invite(text)` | 841 |
| Bakıcı rolü değiştirme / co-owner terfisi | `change_pet_caregiver_role(uuid, uuid, text)` | 1195 |
| Bakıcıyı kaldırma | `remove_pet_caregiver(uuid, uuid)` | 1107 |
| Birincil sahipliği devretme | `transfer_pet_primary_owner(uuid, uuid, uuid)` | 1322 |
| Pet ve üyelikleri silme | `delete_pet_with_memberships(uuid, uuid)` | 1481 |

Bu işlemler transaction içinde kanonik kayıt, legacy ayna, davet durumu,
aktivite/audit ve ilgili ödül güncellemelerini birlikte tamamlar.

## RLS sınırları (Faz 0 sonrası)

- `pet_memberships`: doğrulanmış kullanıcı `can_view_pet` yetkisine sahip olduğu
  petlerin üyelik grafiğini okuyabilir; mutasyonlar yalnızca atomik RPC'lerdir.
- `pets` SELECT: primary owner, co-owner, care admin/editor ve viewer rolleri
  `can_view_pet(id)` politikasıyla pet kabuğunu okuyabilir.
- `pet_membership_events` ve `pet_membership_migration_issues`: yalnızca
  `service_role`; `authenticated` ve `anon`'dan REVOKE ALL yapıldı.
- `pet_owners`, `pet_members`, `pet_invites`: `authenticated` için sadece
  yetkili `SELECT`; `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` ve
  `TRIGGER` verilmez (REVOKE ALL + GRANT SELECT).
- `pets.owner_id`: `authenticated` kullanıcı tarafından güncellenemez
  (`REVOKE UPDATE` + `guard_pet_primary_owner_change` trigger).
- `pets` silme: `authenticated` tablo silme yetkisi yoktur (`REVOKE DELETE`);
  atomik `delete_pet_with_memberships` RPC zorunludur.
- Veritabanı trigger'ı (`guard_pet_primary_owner_change`), `owner_id`
  değişimini transfer RPC'nin `_transferring` oturum değişkeni işareti olmadan
  reddeder.

## Kalan kontrollü geçiş (Faz 5 hedef listesi)

Pet kapsamlı sağlık, beslenme, takvim ve sosyal modüllerdeki legacy
`pet_owners`/`owner_id` okuma kontrolleri Faz 0 uyumluluk katmanı sayesinde
çalışmaya devam eder. Öncelik sırası:

1. `pet_nutrition_logs`, `profiling_prompts` → `can_manage_pet_care` (şu an 403 riski)
2. Sağlık, aşı, parazit, journal RLS → `can_manage_pet_care`
3. Owner layout içindeki kalan `owner_id` varsayımları → `can_view_pet`
4. Takvim, görev, bildirim → `can_view_pet` / `can_manage_pet_care`
5. Sosyal, eşleştirme, abonelik → `can_manage_pet_billing` / `can_view_pet`

Legacy tablolar veya `pets.owner_id`, kanıtlanmış tüm çağrı noktaları
`can_*` fonksiyonlarına geçmeden kaldırılmamalıdır.
