-- Migration: 20260812170000_secure_calculate_completeness_score.sql
-- FORENSIC FIX: public.calculate_completeness_score(uuid)
--
-- ROOT CAUSE (kanıt):
-- 20260618000000_onboarding_step_events.sql, satır 32-72:
--   CREATE OR REPLACE FUNCTION public.calculate_completeness_score(target_user_id UUID)
--   RETURNS INTEGER AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
-- `search_path` set edilmemiş, repo genelinde bu fonksiyon için hiçbir
-- GRANT/REVOKE ifadesi yok → Postgres varsayılanı gereği PUBLIC
-- (dolayısıyla anon + authenticated) EXECUTE hakkına sahip. Gövdede
-- `auth.uid()` kontrolü yok; `target_user_id` tamamen çağıranın verdiği
-- bir parametre.
--
-- ETKİ DEĞERLENDİRMESİ (P3 — düşük): Fonksiyon SALT-OKUNURDUR (yalnızca
-- public.profiles/public.pets/public.user_onboarding_steps'ten okuyup 0-100
-- arası tek bir tamsayı skor döndürür; hiçbir tabloya yazmaz). İstismar
-- yüzeyi yalnızca düşük hassasiyetli bir bilgi sızıntısıdır: herhangi bir
-- kullanıcının profil/pet/onboarding tamamlanma durumunu kaba bir skora
-- (30/40/30 puanlık bileşenler) indirgeyerek üçüncü taraflara sızdırabilir.
--
-- CANLI CALLER DOĞRULAMASI: Uygulama içindeki tek sarmalayıcı
-- (src/lib/agents/dataQualityAgent.ts -> calculateCompleteness()) src/**
-- içinde hiçbir yerden çağrılmıyor (grep ile doğrulandı — dead app code).
-- RPC'nin kendisi yine de PostgREST üzerinden doğrudan erişilebilir
-- durumdaydı.
--
-- FIX (minimal — fonksiyon gövdesi/iş mantığı DEĞİŞTİRİLMEDİ):
--   1) search_path açıkça sabitlenir (gövde zaten tüm tablo referanslarını
--      `public.` öneki ile nitelendiriyor, bu yüzden davranış değişmez).
--   2) anon/PUBLIC REVOKE edilir. `authenticated` GRANT'ı KORUNUR — bu,
--      aynı repoda salt-okunur/düşük-hassasiyetli yardımcılar için zaten
--      kullanılan desenle tutarlıdır (bkz. user_owns_pet, get_credit_entitlement,
--      is_clinic_admin_of: hepsi authenticated'e açık, yalnızca anon/PUBLIC
--      kapalı) — yeni bir yetkilendirme mimarisi icat edilmedi.

ALTER FUNCTION public.calculate_completeness_score(UUID) SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.calculate_completeness_score(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_completeness_score(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_completeness_score(UUID) TO authenticated, service_role;
