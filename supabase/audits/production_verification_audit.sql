BEGIN TRANSACTION READ ONLY;

SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';

-- ══════════════════════════════════════════════════════════════════════════════
-- Odi.Pet Canlı Veritabanı Salt Okunur Şema & Veri Doğrulama Audit Scripti
-- 
-- UYARI: Bu script YALNIZCA SELECT ve denetim sorguları içerir.
-- Veritabanında hiçbir veriyi değiştirmez. Sonunda ROLLBACK ile sonlanır.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Migration ve Politika Varlığı
SELECT '1. Migration & Politika Varlığı' AS audit_section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pet_memberships', 'pet_membership_events', 'pet_membership_migration_issues');

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('can_view_pet', 'can_manage_pet_care', 'can_manage_pet_caregivers', 'user_owns_pet');

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pet_memberships', 'pets', 'pet_nutrition_logs', 'profiling_prompts')
ORDER BY tablename, policyname;

-- 2. REVOKE / GRANT ve Tablo İzinleri Snapshot
SELECT '2. İzin & REVOKE Snapshot' AS audit_section;
SELECT 
  'authenticated' AS role,
  'pet_owners' AS table_name,
  has_table_privilege('authenticated', 'public.pet_owners', 'INSERT') AS can_insert,
  has_table_privilege('authenticated', 'public.pet_owners', 'UPDATE') AS can_update,
  has_table_privilege('authenticated', 'public.pet_owners', 'DELETE') AS can_delete
UNION ALL
SELECT 
  'authenticated', 'pet_members',
  has_table_privilege('authenticated', 'public.pet_members', 'INSERT'),
  has_table_privilege('authenticated', 'public.pet_members', 'UPDATE'),
  has_table_privilege('authenticated', 'public.pet_members', 'DELETE')
UNION ALL
SELECT 
  'authenticated', 'pet_invites',
  has_table_privilege('authenticated', 'public.pet_invites', 'INSERT'),
  has_table_privilege('authenticated', 'public.pet_invites', 'UPDATE'),
  has_table_privilege('authenticated', 'public.pet_invites', 'DELETE')
UNION ALL
SELECT 
  'authenticated', 'profiling_prompts',
  has_table_privilege('authenticated', 'public.profiling_prompts', 'INSERT'),
  has_table_privilege('authenticated', 'public.profiling_prompts', 'UPDATE'),
  has_table_privilege('authenticated', 'public.profiling_prompts', 'DELETE');

-- 3. Her pette tam 1 aktif Primary Owner kontrolü
SELECT '3. Primary Owner Tutarlılığı' AS audit_section;
SELECT 
  p.id AS pet_id,
  p.name AS pet_name,
  count(pm.id) AS active_primary_owner_count
FROM public.pets p
LEFT JOIN public.pet_memberships pm 
  ON p.id = pm.pet_id 
 AND pm.role = 'primary_owner' 
 AND pm.status = 'active'
GROUP BY p.id, p.name
HAVING count(pm.id) != 1;

-- 4. pets.owner_id ile pet_memberships uyumu
SELECT '4. pets.owner_id & pet_memberships Uyumsuzlukları' AS audit_section;
SELECT 
  p.id AS pet_id,
  p.name AS pet_name,
  p.owner_id AS legacy_owner_id,
  pm.profile_id AS membership_primary_owner_id
FROM public.pets p
LEFT JOIN public.pet_memberships pm 
  ON p.id = pm.pet_id 
 AND pm.role = 'primary_owner' 
 AND pm.status = 'active'
WHERE p.owner_id IS DISTINCT FROM pm.profile_id;

-- 5. Legacy pet_owners / pet_members sapmaları
SELECT '5. Legacy Tablo Sapmaları' AS audit_section;
-- pet_owners tablosunda var ama pet_memberships'te aktif üye olmayanlar
SELECT 
  po.pet_id,
  po.profile_id,
  po.role AS legacy_owner_role,
  pm.role AS membership_role,
  pm.status AS membership_status
FROM public.pet_owners po
LEFT JOIN public.pet_memberships pm 
  ON po.pet_id = pm.pet_id 
 AND po.profile_id = pm.profile_id
WHERE pm.id IS NULL OR pm.status != 'active';

-- 6. Yetim veya Mükerrer Üyelik Kayıtları
SELECT '6. Yetim veya Mükerrer Üyelikler' AS audit_section;
-- Silinmiş pet veya profillere bağlı pet_memberships kayıtları
SELECT pm.id, pm.pet_id, pm.profile_id, pm.role, pm.status
FROM public.pet_memberships pm
LEFT JOIN public.pets p ON pm.pet_id = p.id
LEFT JOIN public.profiles pr ON pm.profile_id = pr.id
WHERE p.id IS NULL OR pr.id IS NULL;

-- Aynı pet ve profil için birden fazla aktif üyelik kaydı
SELECT pet_id, profile_id, count(*) AS active_count
FROM public.pet_memberships
WHERE status = 'active'
GROUP BY pet_id, profile_id
HAVING count(*) > 1;

-- 7. Referral UNIQUE Constraint ve Audit İzleme Bütünlüğü
SELECT '7. Referral & Audit Bütünlüğü' AS audit_section;
SELECT 
  tc.constraint_name, 
  tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'referral_rewards'
  AND tc.constraint_type = 'UNIQUE';

SELECT count(*) AS total_membership_audit_events
FROM public.pet_membership_events;

-- 8. pet_nutrition_logs & profiling_prompts RLS Snapshot
SELECT '8. Nutrition & Profiling RLS Snapshot' AS audit_section;
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pet_nutrition_logs', 'profiling_prompts');

ROLLBACK;
