-- ══════════════════════════════════════════════════════════════════════════════
-- Faz 5 (kısmi): pet_nutrition_logs ve profiling_prompts RLS geçişi
-- owner_id-only → kanonik can_view_pet / can_manage_pet_care modeli
--
-- Etki: yalnızca bu iki tablo. nutrition_logs, user_survey_stats ve diğer
-- tablolara dokunulmaz. API rotaları ve frontend bileşenleri değişmez.
--
-- Tasarım kararları:
--   pet_nutrition_logs   — yazar: can_manage_pet_care (primary/co_owner/care_admin/care_editor)
--                          okur : can_view_pet (tüm roller)
--                          own-row kuralı: UPDATE/DELETE yalnızca kendi profile_id'si
--                          taşıma koruması: WITH CHECK profile_id/pet_id sabittir
--
--   profiling_prompts    — SELECT kullanıcı-satır-bazlıdır: response_value
--                          diğer bakıcılara görünmez (gizlilik kararı)
--                          SELECT: profile_id = auth.uid() AND can_view_pet(pet_id)
--                          INSERT: can_manage_pet_care + profile_id = uid
--                          UPDATE: profile_id = uid AND can_view_pet (kendi yanıtını günceller)
--                          DELETE: service_role only — savunma amaçlı REVOKE uygulandı
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. pet_nutrition_logs ───────────────────────────────────────────────────

-- Eski owner-only FOR ALL politikasını kaldır
DROP POLICY IF EXISTS "owner_access_pet_nutrition_logs" ON public.pet_nutrition_logs;

-- SELECT: can_view_pet — tüm kanonik roller beslenme geçmişini görebilir
CREATE POLICY "pm_nutrition_logs_select"
  ON public.pet_nutrition_logs
  FOR SELECT
  TO authenticated
  USING (public.can_view_pet(pet_id));

-- INSERT: can_manage_pet_care + caller kendi profile_id'sini ekler
CREATE POLICY "pm_nutrition_logs_insert"
  ON public.pet_nutrition_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND public.can_manage_pet_care(pet_id)
  );

-- UPDATE: kendi kaydı + can_manage_pet_care; WITH CHECK profile_id/pet_id taşımayı engeller
CREATE POLICY "pm_nutrition_logs_update"
  ON public.pet_nutrition_logs
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND public.can_manage_pet_care(pet_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND public.can_manage_pet_care(pet_id)
  );

-- DELETE: kendi kaydı + can_manage_pet_care
CREATE POLICY "pm_nutrition_logs_delete"
  ON public.pet_nutrition_logs
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND public.can_manage_pet_care(pet_id)
  );

-- ─── 2. profiling_prompts ─────────────────────────────────────────────────────

-- Eski owner-only FOR ALL politikasını kaldır
DROP POLICY IF EXISTS "owner_access_profiling_prompts" ON public.profiling_prompts;

-- SELECT: kullanıcı-satır-bazlı — yalnızca kendi yanıtlarını görür
--         (response_value diğer bakıcılara gizli; gizlilik bilinçli ürün kararı)
CREATE POLICY "pm_profiling_prompts_select"
  ON public.profiling_prompts
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND public.can_view_pet(pet_id)
  );

-- INSERT: can_manage_pet_care + caller kendi profile_id'sini ekler
CREATE POLICY "pm_profiling_prompts_insert"
  ON public.profiling_prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND public.can_manage_pet_care(pet_id)
  );

-- UPDATE: kendi kaydı (dismissal, completion, response güncelleme);
--         can_view_pet yeterli — viewer da kendi sorusunu yanıtlayabilir.
--         WITH CHECK: profile_id veya pet_id başka kullanıcı/pete taşınamaz.
CREATE POLICY "pm_profiling_prompts_update"
  ON public.profiling_prompts
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND public.can_view_pet(pet_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND public.can_view_pet(pet_id)
  );

-- DELETE: service_role only.
-- Politika eklenmemesi (RLS açık + politika yok) authenticated'ı engeller.
-- Ek savunma: REVOKE DELETE doğrudan yetkiyi de kaldırır.
REVOKE DELETE ON TABLE public.profiling_prompts FROM anon, authenticated;
