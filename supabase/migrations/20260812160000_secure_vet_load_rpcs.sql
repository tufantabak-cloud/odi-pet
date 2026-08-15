-- Migration: 20260812160000_secure_vet_load_rpcs.sql
-- FORENSIC FIX: public.increment_vet_load(uuid), public.decrement_vet_load(uuid)
--
-- ROOT CAUSE (kanıt):
-- 20240428000005_vet_rpc.sql, satır 1-19: her iki fonksiyon da SECURITY
-- DEFINER, `search_path` set edilmemiş, gövdede hiçbir `auth.uid()` kontrolü
-- yok, ve repo genelinde hiçbir GRANT/REVOKE ifadesi bulunmuyor — Postgres
-- varsayılanı gereği PUBLIC (dolayısıyla anon + authenticated) EXECUTE
-- hakkına sahip. `p_vet_id` tamamen çağıranın verdiği bir parametre.
--
-- CANLI CALLER DOĞRULAMASI (bu turda 3 route da tek tek tekrar okundu):
--   1) src/app/api/vet/reviews/[id]/claim/route.ts    -> createServerSupabaseClient()
--      (session-bound, `authenticated` rolü), requireRole(['vet','admin','founder'])
--      ile korunuyor; `vetId` client body'den geliyor.
--   2) src/app/api/vet/reviews/[id]/complete/route.ts -> aynı, requireRole ile korunuyor.
--   3) src/app/api/predictive-risk/[petId]/vet-review/route.ts -> createServerSupabaseClient()
--      (session-bound), ama caller SIRADAN bir pet owner (herhangi bir role) —
--      requireRole YOK, yalnızca withAPIFeatureGuard('ai_vet', ...) feature-
--      entitlement kontrolü var. `p_vet_id` burada client body'den DEĞİL,
--      sunucu tarafında bir sorgudan (en az yüklü online vet) geliyor.
-- Üçü de `authenticated` rolüyle (session-bound client) çalışıyor —
-- HİÇBİRİ service_role kullanmıyor. Bu nedenle `authenticated`'i REVOKE
-- etmek (grant_membership_credit/create_pet_notification'da uygulanan
-- desen) bu 3 route'u kırar.
--
-- KISIT (kanıt): `public.vets` tablosunun `auth.users`/`profiles` ile
-- hiçbir kimlik ilişkisi yoktur (bkz. vet/reviews/claim/route.ts içindeki
-- doğrulama yorumu) — bu nedenle `p_vet_id`'yi `auth.uid()`'e gerçek
-- anlamda (sahiplik/üyelik) bağlamak mümkün değildir; bu alt sistem
-- baştan sona MOCK/prototip olarak işaretlidir. 3 çağıranın ortak paydası
-- yalnızca "gerçekten oturum açmış (anon olmayan) bir kullanıcı" olmasıdır
-- — bu yüzden fonksiyon içine eklenen kontrol budur; yeni bir
-- authorization mimarisi icat edilmedi, mevcut auth.uid() birincil-kimlik
-- deseni kullanıldı.
--
-- FIX: Fonksiyon gövdesine yalnızca bir `auth.uid() IS NULL` guard'ı ve
-- açık bir `search_path` eklendi (gövdenin geri kalanı, UPDATE mantığı,
-- tablo/RLS yapısı DEĞİŞTİRİLMEDİ). GRANT authenticated'te kalıyor (3
-- route'un hiçbiri değişmiyor); anon/PUBLIC açıkça REVOKE ediliyor.

CREATE OR REPLACE FUNCTION public.increment_vet_load(p_vet_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;

  UPDATE public.vet_status
  SET current_load = current_load + 1
  WHERE vet_id = p_vet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_vet_load(p_vet_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;

  UPDATE public.vet_status
  SET current_load = GREATEST(0, current_load - 1)
  WHERE vet_id = p_vet_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_vet_load(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_vet_load(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_vet_load(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.decrement_vet_load(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_vet_load(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrement_vet_load(UUID) TO authenticated, service_role;
