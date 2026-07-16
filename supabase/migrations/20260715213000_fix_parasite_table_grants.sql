BEGIN;

-- ==========================================
-- 1. authenticated Rolünden Tüm Yetkileri Geri Al ve Sadece Temel CRUD Yetkilerini Ver
-- ==========================================
REVOKE ALL PRIVILEGES ON TABLE
  public.parasite_protocols,
  public.pet_parasite_preferences,
  public.parasite_records
FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
  public.parasite_protocols,
  public.pet_parasite_preferences,
  public.parasite_records
TO authenticated;

-- ==========================================
-- 2. anon Rolünden Tüm Yetkileri Geri Al (Güvenlik Önlemi)
-- ==========================================
REVOKE ALL PRIVILEGES ON TABLE
  public.parasite_protocols,
  public.pet_parasite_preferences,
  public.parasite_records
FROM anon;

-- ==========================================
-- 3. service_role Rolüne Tam Yetki Tanımla
-- ==========================================
GRANT ALL PRIVILEGES ON TABLE
  public.parasite_protocols,
  public.pet_parasite_preferences,
  public.parasite_records
TO service_role;

COMMIT;
