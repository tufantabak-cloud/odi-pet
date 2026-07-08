-- ─── 1. pet_clinic_access ─────────────────────────────────────────────────
-- pet_id üzerinden owner kontrolü
-- (TABLE MISSING ON REMOTE)
-- ALTER TABLE pet_clinic_access ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "owner_access_pet_clinic_access"
--   ON pet_clinic_access
--   USING (
--     pet_id IN (
--       SELECT id FROM pets WHERE owner_id = auth.uid()
--     )
--   );

-- ─── 2. pet_nutrition_logs ────────────────────────────────────────────────
ALTER TABLE pet_nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access_pet_nutrition_logs"
  ON pet_nutrition_logs
  USING (
    pet_id IN (
      SELECT id FROM pets WHERE owner_id = auth.uid()
    )
  );

-- ─── 3. profiling_prompts ─────────────────────────────────────────────────
ALTER TABLE profiling_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access_profiling_prompts"
  ON profiling_prompts
  USING (
    pet_id IN (
      SELECT id FROM pets WHERE owner_id = auth.uid()
    )
  );

-- ─── 4. user_activation_scores ───────────────────────────────────────────
-- user_id üzerinden direkt kontrol
ALTER TABLE user_activation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access_user_activation_scores"
  ON user_activation_scores
  USING (user_id = auth.uid());

-- ─── 5. data_quality_configs ─────────────────────────────────────────────
-- Sistem tablosu: herkes okuyabilir, sadece admin yazabilir
ALTER TABLE data_quality_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_data_quality_configs"
  ON data_quality_configs
  FOR SELECT
  USING (true);

CREATE POLICY "admin_write_data_quality_configs"
  ON data_quality_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 6. lost_report_contacts ─────────────────────────────────────────────
-- lost_reports tablosunda user_id bulunmadığı için admin-only politika kullanılıyor
-- (TABLE MISSING ON REMOTE)
-- ALTER TABLE lost_report_contacts ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "admin_only_lost_report_contacts"
--   ON lost_report_contacts
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- ─── 7. session_logs ─────────────────────────────────────────────────────
-- profile_id kolonunun tam yapısını bilmiyoruz
-- Güvenli varsayılan: sadece service_role erişebilir (uygulama okuyamaz)
-- Bu log tablosu — kullanıcının görmesine gerek yok
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Kasıtlı olarak politika eklenmedi:
-- RLS açık + politika yok = hiç kimse erişemez (sadece service_role)
-- Bu session_logs için doğru davranış
