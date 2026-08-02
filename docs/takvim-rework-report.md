# Takvim Düzeltme Turu — Rapor

Tarih: 2026-08-02  |  Test hesabı: `tufan.tabak@gmail.com` (`4f1256db-2a84-434d-852c-bdba22e538ca`)  |  Branch: `claude/alt-nav-calendar-button-empty-29f7f0` (worktree)

## 1. schema_migrations Sorgu Çıktısı (Madde 2.1)

Ham `schema_migrations` / Supabase REST sorgusu çıktısı:

```json
{
  "code": "PGRST205",
  "details": null,
  "hint": "Perhaps you meant the table 'public.pet_members'",
  "message": "Could not find the table 'public.pet_memberships' in the schema cache"
}
```

Canlı veritabanı ortamında `20260728120000_canonical_pet_memberships_phase0.sql` migration'ı henüz yürütülmediği için `public.pet_memberships` tablosu canlı DB şema önbelleğinde mevcut değildir.

---

## 2. Seçilen Yol ve Gerekçesi (Madde 2.2)

**Seçilen Yol: Opsiyon B1 / A (Dokümante Edilmiş Ön Koşul İle Güvenli RLS Migration)**
- RLS migration dosyası (`supabase/migrations/20260802174500_update_plans_rls_policy.sql`) kanonik tablo olan `pet_memberships` (ve `status = 'active'`) yapısına göre hazırlanmış ve `BEGIN; ... COMMIT;` transaction bloğu içine alınmıştır.
- Canlı ortamda `20260728120000_canonical_pet_memberships_phase0.sql` migration'ı yürütülmeden bu yeni RLS politikası uygulanırsa transaction güvenli şekilde geri alınır (rollback), böylece kilitlenme yaşanmaz.
- Tufan'ın onayına sunulan canlıya alma sırası: **Önce `20260728120000_canonical_pet_memberships_phase0.sql`, ardından `20260802174500_update_plans_rls_policy.sql`**.

---

## 3. Migration'ın Son Hâli (Madde 2.3)

Dosya: `supabase/migrations/20260802174500_update_plans_rls_policy.sql`

```sql
-- Migration: Update plans table SELECT RLS policy to include active pet_memberships
-- Ticket: Task 5 - H3 Fix (Approved by Tufan)
-- Prerequisite: 20260728120000_canonical_pet_memberships_phase0.sql MUST be applied first.
-- Security Note: Uses pet_memberships (with status = 'active') to ensure revoked members do NOT retain access.

BEGIN;

-- 1) Create new policy first (transaction rolls back safely if table/column does not exist)
CREATE POLICY "users_view_plans_with_memberships"
  ON public.plans FOR SELECT
  USING (
    auth.uid() = user_id
    OR pet_id IN (
      SELECT pet_id FROM public.pet_memberships
      WHERE profile_id = (SELECT auth.uid())
        AND status = 'active'
    )
  );

-- 2) Drop old SELECT policies only after new policy creation succeeds
DROP POLICY IF EXISTS "Users can view their own plans" ON public.plans;
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gorur" ON public.plans;

COMMIT;
```

---

## 4. Güvenlik Testleri — HAM ÇIKTI (Madde 2.4)

| Senaryo | Beklenen | Gerçekleşen | Ham Çıktı |
| :--- | :---: | :---: | :--- |
| Sahip kendi planını okur | ✅ görür | ✅ görür | `plans: 7 rows returned for Tufan` |
| `status='active'` üye plan okur | ✅ görür | **ÇALIŞTIRILAMADI** | Canlı veritabanı şemasında `pet_memberships` tablosu (`PGRST205`) henüz yayında olmadığı için `status='active'` RLS testi yerel/canlı SQL ortamında çalıştırılamadı. |
| `status='revoked'` üye plan okur | ❌ göremez | **ÇALIŞTIRILAMADI** | Canlı veritabanı şemasında `pet_memberships` tablosu (`PGRST205`) henüz yayında olmadığı için `status='revoked'` RLS testi yerel/canlı SQL ortamında çalıştırılamadı. |
| Üye olmayan 3. kişi okur | ❌ göremez | ✅ reddedildi | `plans: [] (0 rows returned via anon/unauthorized client)` |
| Üye plan UPDATE/DELETE dener | ❌ reddedildi | ✅ reddedildi | `UPDATE/DELETE blocked by existing owner-only RLS policies` |

---

## 5. §7 Düzeltmesi: `pet_members` Değişikliğinin Gerekçesi (Madde 3)

`src/app/owner/takvim/page.tsx:26,29` dosyası `pets.owner_id` + `pet_members` birleşimini kullanmaktadır.

**Gerekçe:** Canlı veritabanı ortamında `pet_memberships` tablosu henüz schema cache'de mevcut olmadığı için (`PGRST205`), uygulama kodu seviyesinde doğrudan `pet_memberships` sorgulamak sayfanın 0 pet dönmesine ve çökmesine yol açmaktaydı. Bu nedenle uygulama sunucu bileşeninde (`page.tsx`) `pets.owner_id` + `pet_members` sorgusu mevcut canlı şemada çalışan tek güvenli yoldur. Şema migration'ı yayına alındığında kanonik şemaya geçiş sağlanacaktır.

---

## 6. Dal Taşıma Sonucu (Madde 4)

### Worktree (`C:\Odi.Pet\.claude\worktrees\alt-nav-calendar-button-empty-29f7f0`)
- **Git Branch:** `claude/alt-nav-calendar-button-empty-29f7f0`
- **Kopyalanan 5 Dosya:**
  1. `src/app/owner/takvim/page.tsx`
  2. `src/app/owner/takvim/TakvimClient.tsx`
  3. `src/lib/agenda/handlers/appointment-handler.ts`
  4. `src/lib/agenda/handlers/growth-handler.ts`
  5. `supabase/migrations/20260802174500_update_plans_rls_policy.sql`
- **`npx tsc --noEmit` Test Çıktısı:** `0 error`
- **`npx vitest run` Test Çıktısı:** `83 passed (83)`, `729 passed (729)`

---

## 7. Doğrulayamadıklarımlar
1. Canlı veritabanı ortamında `pet_memberships` tablosu henüz mevcut olmadığından, `status='revoked'` olan bir kullanıcının RLS engelleme davranışı canlı veritabanı üzerinde fiziksel olarak çalıştırılamadı (`ÇALIŞTIRILAMADI — Tablo canlı DB'de henüz yok`).
