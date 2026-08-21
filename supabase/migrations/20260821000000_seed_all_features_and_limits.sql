-- Comprehensive Seed for app_features and feature_limits across all tiers
-- Ensures all code-defined features have matching records in the database

-- 1. Insert/Update all registered features in app_features
INSERT INTO public.app_features (key, name, description, category, status, is_public)
VALUES
  ('smart_matching', 'Akıllı Eşleştirme', 'Akıllı eşleştirme ve sosyal özellikler.', 'social', 'active', true),
  ('breeding_listings', 'Çiftleştirme İlan Yönetimi', 'Çiftleştirme ilanı oluşturma, yönetme ve başvuru takibi.', 'social', 'active', true),
  ('breeding_forecast', 'Çiftleşme ve Östrus Tahmini', 'Östrus döngüsü analizi ve çiftleşme zamanı tahmini.', 'social', 'active', true),
  ('social_adoption', 'Sahiplendirme', 'Evcil hayvan sahiplendirme ve yuva bulma.', 'social', 'active', true),
  ('ai_vet', 'AI Veteriner Asistanı', 'Yapay zeka destekli semptom analizi ve veteriner danışmanlığı.', 'ai', 'active', true),
  ('nutrition_analysis', 'Beslenme Analizi', 'Yapay zeka ile mama içeriği ve besin değerleri analizi.', 'ai', 'active', true),
  ('scan_document', 'Belge ve Karne Tarama (OCR)', 'Aşı karnesi ve tahlil sonuçlarını yapay zeka ile otomatik okuma.', 'ai', 'active', true),
  ('pdf_export', 'PDF Sağlık Karnesi ve Raporlar', 'Evcil hayvan sağlık geçmişi ve aşı karnesini PDF olarak dışa aktarma.', 'reports', 'active', true),
  ('budget_tracking', 'Bütçe ve Gider Takibi', 'Temel evcil hayvan harcama ve bütçe kaydı.', 'monetization', 'active', true),
  ('budget_analytics', 'Gelişmiş Bütçe Analitiği', 'Kategori bazlı harcama dağılımı ve tahminler.', 'monetization', 'active', true),
  ('budget_export', 'Bütçe Raporu Dışa Aktarma', 'Harcama raporlarını Excel/CSV olarak indirme.', 'monetization', 'active', true),
  ('calendar_sync', 'Takvim Senkronizasyonu', 'Aşı ve bakım hatırlatıcılarını Google/Apple takvime aktarma.', 'core', 'active', true),
  ('gallery_capacity', 'Gelişmiş Medya Galerisi', 'Yüksek çözünürlüklü ve geniş kapasiteli fotoğraf/video saklama.', 'core', 'active', true),
  ('insurance_readiness', 'Sigorta Hazırlık Analizi', 'Evcil hayvan sigortası için uygunluk ve risk analizi.', 'health', 'active', true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  is_public = EXCLUDED.is_public;

-- 2. Insert feature_limits for AI+ (All features enabled & unlimited / high quota)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
SELECT key, 'ai_plus'::public.plan_tier_enum, 'unlimited', NULL, 30, true
FROM public.app_features
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = 'unlimited',
  limit_value = NULL,
  is_enabled = true;

-- 3. Insert feature_limits for PRO (All features enabled & unlimited / generous quota)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
SELECT key, 'pro'::public.plan_tier_enum, 'unlimited', NULL, 30, true
FROM public.app_features
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = 'unlimited',
  limit_value = NULL,
  is_enabled = true;

-- 4. Insert feature_limits for FREE Tier (Core features enabled, premium features disabled or limited)
-- 4a. Core Free Features (Unlimited)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
VALUES
  ('social_adoption', 'free'::public.plan_tier_enum, 'unlimited', NULL, 30, true),
  ('budget_tracking', 'free'::public.plan_tier_enum, 'unlimited', NULL, 30, true)
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = EXCLUDED.limit_type,
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;

-- 4b. Free Features with Monthly Quotas
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
VALUES
  ('ai_vet', 'free'::public.plan_tier_enum, 'quota', 1, 30, true),
  ('nutrition_analysis', 'free'::public.plan_tier_enum, 'quota', 1, 30, true),
  ('scan_document', 'free'::public.plan_tier_enum, 'quota', 1, 30, true),
  ('pdf_export', 'free'::public.plan_tier_enum, 'quota', 1, 30, true)
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = EXCLUDED.limit_type,
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;

-- 4c. Premium-Only Features (Disabled for Free tier)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
VALUES
  ('smart_matching', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('breeding_listings', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('breeding_forecast', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('budget_analytics', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('budget_export', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('calendar_sync', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('gallery_capacity', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false),
  ('insurance_readiness', 'free'::public.plan_tier_enum, 'boolean', 0, 30, false)
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = EXCLUDED.limit_type,
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;
