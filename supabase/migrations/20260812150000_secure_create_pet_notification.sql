-- Migration: 20260812150000_secure_create_pet_notification.sql
-- FORENSIC FIX: public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)
--
-- ROOT CAUSE (kanıt):
-- 20240429000004_task_assignment.sql, satır 37-48:
--   CREATE OR REPLACE FUNCTION public.create_pet_notification(...)
--   RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
--     INSERT INTO public.pet_notifications(...) VALUES (p_pet_id, p_profile_id, ...);
--   $$;
-- Bu fonksiyon için repo genelinde (tüm migration'lar tek tek tarandı)
-- HİÇBİR GRANT/REVOKE ifadesi yoktur. SECURITY DEFINER bir fonksiyon için
-- açık bir REVOKE olmadığında Postgres varsayılanı geçerlidir: PUBLIC
-- (dolayısıyla anon + authenticated) EXECUTE hakkına sahiptir. Fonksiyon
-- gövdesinde hiçbir auth.uid() / ownership kontrolü yoktur; p_pet_id ve
-- p_profile_id tamamen çağıranın verdiği parametrelerdir ve doğrudan
-- public.pet_notifications tablosuna insert edilir.
--
-- CANLI CALLER DOĞRULAMASI (bu turda tekrar okunarak doğrulandı):
--   1) public.on_task_assigned() trigger'ı (20240429000004_task_assignment.sql,
--      satır 51-100) — health_schedules üzerindeki AFTER UPDATE trigger'ı,
--      PERFORM public.create_pet_notification(NEW.pet_id, NEW.assigned_to/by, ...)
--      ile çağırıyor. SECURITY DEFINER olduğu için tanımlayıcı rolün
--      yetkisiyle çalışır.
--   2) public.run_escalation_check() (20240429000005_calendar_escalation.sql
--      satır 48, ve 20240429000006_escalation_feedback_loop.sql satır 28,39
--      ile yeniden tanımlanmış hali) — yine SECURITY DEFINER, cron/trigger
--      bağlamında PERFORM ile çağırıyor.
-- src/** içinde `.rpc('create_pet_notification', ...)` şeklinde HİÇBİR
-- uygulama-seviyeli çağıran yoktur (grep ile doğrulandı) — yani dışarıdan
-- (PostgREST üzerinden) çağrılması amaçlanmamış, saf bir internal helper'dır.
--
-- ATTACK SURFACE (düzeltilmeden önce): Kimliği doğrulanmış (hatta REVOKE
-- edilmediği için muhtemelen anon dahi) herhangi bir kullanıcı
-- `supabase.rpc('create_pet_notification', { p_pet_id, p_profile_id: <kurban>,
-- p_type, p_title, p_body })` çağırarak herhangi bir kullanıcının bildirim
-- akışına sahte/phishing bildirimi enjekte edebilirdi.
--
-- FIX (minimal, yalnızca GRANT/REVOKE — fonksiyon gövdesi, trigger'lar,
-- tablo/RLS yapısı DEĞİŞTİRİLMEDİ; aynı, bu projede
-- complete_recurring_plan / consume_feature_usage / claim_notification_jobs /
-- grant_membership_credit için kullanılan kanıtlanmış "service_role-only"
-- deseni tekrar uygulanıyor):

REVOKE EXECUTE ON FUNCTION public.create_pet_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pet_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_pet_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_pet_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
