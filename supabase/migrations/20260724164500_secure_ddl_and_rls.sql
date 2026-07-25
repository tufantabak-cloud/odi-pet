-- 1. Açık kalan tehlikeli DDL/SQL fonksiyonlarını tamamen kaldırıyoruz (P0)
DROP FUNCTION IF EXISTS public.execute_ddl;
DROP FUNCTION IF EXISTS public.execute_sql;

-- 2. Referrals tablosundaki aşırı geniş politikayı daraltıyoruz (P1)
-- (Eğer bu poliçenin ismi farklıysa, önce mevcut ismi bulup onu DROP etmelisin)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.referrals;

CREATE POLICY "Kullanıcılar sadece kendi referanslarını görebilir" 
ON public.referrals 
FOR SELECT 
TO authenticated 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 3. Outreach Pipeline tablosunu sadece service_role/admin erişimine kapatıyoruz (P1)
-- Önce tablonun RLS'sinin aktif olduğundan emin olalım
ALTER TABLE public.outreach_pipeline ENABLE ROW LEVEL SECURITY;

-- Mevcut güvensiz politikayı kaldır (isme göre düzenle)
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.outreach_pipeline;

-- Sadece service_role yetkisi ver (API rotalarında Supabase Admin Client ile erişilecek)
CREATE POLICY "Sadece service_role erişebilir" 
ON public.outreach_pipeline 
TO service_role 
USING (true) 
WITH CHECK (true);
