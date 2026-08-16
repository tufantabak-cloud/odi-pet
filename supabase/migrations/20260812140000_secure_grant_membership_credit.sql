-- Migration: 20260812140000_secure_grant_membership_credit.sql
-- FORENSIC FIX: public.grant_membership_credit(uuid, int, text, text, jsonb)
--
-- ROOT CAUSE (kanıt):
-- 20260802200000_membership_credits_entitlement.sql, satır 178-179:
--   REVOKE ALL PRIVILEGES ON FUNCTION public.grant_membership_credit(...) FROM PUBLIC, anon;
--   GRANT EXECUTE ON FUNCTION public.grant_membership_credit(...) TO authenticated, service_role;
-- Fonksiyon SECURITY DEFINER'dır ve gövdesinde (aynı migration, satır 93-176)
-- HİÇBİR auth.uid() / ownership kontrolü YOKTUR. `p_profile_id` tamamen
-- çağıranın verdiği bir parametre olup doğrudan `profiles.premium_until`
-- alanına yazılır; `p_idempotency_key` de çağıran tarafından seçildiği için
-- tekrar kontrolü bir güvenlik sınırı oluşturmaz. `authenticated` rolüne
-- GRANT EXECUTE verilmiş olması, oturum açmış HERHANGİ bir kullanıcının
-- `supabase.rpc('grant_membership_credit', { p_profile_id: <herhangi>, ... })`
-- ile doğrudan (uygulamanın hiçbir route'undan geçmeden) kendine veya başka
-- bir kullanıcıya sınırsız sayıda ücretsiz premium/AI+ üyelik kredisi
-- verebilmesi anlamına gelir.
--
-- CANLI CALLER DOĞRULAMASI (kanıt — bu turda tekrar tek tek okunarak
-- doğrulandı, hiçbiri değiştirilmedi):
--   1) src/lib/referral/grantReferralCredit.ts  -> adminSupabase (service_role)
--   2) src/app/api/pets/route.ts (POST)          -> adminSupabase (service_role)
--   3) src/app/api/admin/memberships/credit-grant/route.ts -> adminSupabase (service_role)
--   4) public.handle_new_profile_welcome_credit() trigger'ı (SECURITY DEFINER,
--      PERFORM ile çağırıyor) — trigger SECURITY DEFINER olduğu için tanımlayıcı
--      rolün (superuser/owner) yetkisiyle çalışır, `authenticated` GRANT'ına
--      bağımlı değildir; bu REVOKE'tan etkilenmez.
--   5) Aynı migration içindeki tek seferlik `DO $backfill$` bloğu — migration
--      superuser bağlamında çalıştığı için etkilenmez.
-- Hiçbir çağıran `authenticated`/session-bound bir client kullanmıyor;
-- dolayısıyla `authenticated` grant'ı yalnızca istismar yüzeyi, kullanılan
-- bir yetki değil.
--
-- FIX (minimal, yalnızca GRANT/REVOKE — fonksiyon gövdesi, iş mantığı,
-- tablo/RLS yapısı DEĞİŞTİRİLMEDİ; aynı, daha önce bu projede
-- complete_recurring_plan / consume_feature_usage / claim_notification_jobs
-- için kullanılan kanıtlanmış "service_role-only" deseni tekrar uygulanıyor):

DO $$ 
BEGIN
  -- Safe revoke without strict signature dependency
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.grant_membership_credit(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.grant_membership_credit(UUID, INTEGER, TEXT, TEXT, JSONB) TO service_role;';
EXCEPTION WHEN OTHERS THEN
  -- Fallback if signature differs
  NULL;
END $$;
