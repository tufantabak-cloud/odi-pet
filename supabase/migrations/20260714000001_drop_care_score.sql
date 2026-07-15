-- =============================================
-- BAKIM SKORU (CARE SCORE) SÜRECİNİN KALDIRILMASI
-- Uygulama artık bakım skoru ölçmüyor ve kullanmıyor.
-- Yalnızca care-score'a ait nesneler kaldırılır; başka tabloya dokunulmaz.
-- =============================================

DROP FUNCTION IF EXISTS public.adjust_care_score(uuid, integer) CASCADE;
DROP TABLE IF EXISTS public.daily_scores CASCADE;
