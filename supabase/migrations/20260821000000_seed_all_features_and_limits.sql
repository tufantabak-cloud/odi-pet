-- Comprehensive Seed for app_features and feature_limits across all tiers
-- Ensures all code-defined features have matching records in the database

-- 1. Insert/Update all registered features in app_features
INSERT INTO public.app_features (key, label, description, scope, status, visibility, tags, metadata)
VALUES
  ('smart_matching', 'Akıllı Eşleştirme', 'Akıllı eşleştirme ve sosyal özellikler.', 'global', 'active', 'public', ARRAY['social'], '{"category": "social"}'::jsonb),
  ('breeding_listings', 'Çiftleştirme İlan Yönetimi', 'Çiftleştirme ilanı oluşturma, yönetme ve başvuru takibi.', 'global', 'active', 'public', ARRAY['social'], '{"category": "social"}'::jsonb),
  ('breeding_forecast', 'Çiftleşme ve Östrus Tahmini', 'Östrus döngüsü analizi ve çiftleşme zamanı tahmini.', 'global', 'active', 'public', ARRAY['social'], '{"category": "social"}'::jsonb),
  ('social_adoption', 'Sahiplendirme', 'Evcil hayvan sahiplendirme ve yuva bulma.', 'global', 'active', 'public', ARRAY['social'], '{"category": "social"}'::jsonb),
  ('ai_vet', 'AI Veteriner Asistanı', 'Yapay zeka destekli semptom analizi ve veteriner danışmanlığı.', 'global', 'active', 'public', ARRAY['ai'], '{"category": "ai"}'::jsonb),
  ('nutrition_analysis', 'Beslenme Analizi', 'Yapay zeka ile mama içeriği ve besin değerleri analizi.', 'global', 'active', 'public', ARRAY['ai'], '{"category": "ai"}'::jsonb),
  ('scan_document', 'Belge ve Karne Tarama (OCR)', 'Aşı karnesi ve tahlil sonuçlarını yapay zeka ile otomatik okuma.', 'global', 'active', 'public', ARRAY['ai'], '{"category": "ai"}'::jsonb),
  ('pdf_export', 'PDF Sağlık Karnesi ve Raporlar', 'Evcil hayvan sağlık geçmişi ve aşı karnesini PDF olarak dışa aktarma.', 'global', 'active', 'public', ARRAY['reports'], '{"category": "reports"}'::jsonb),
  ('budget_tracking', 'Bütçe ve Gider Takibi', 'Temel evcil hayvan harcama ve bütçe kaydı.', 'global', 'active', 'public', ARRAY['monetization'], '{"category": "monetization"}'::jsonb),
  ('budget_analytics', 'Gelişmiş Bütçe Analitiği', 'Kategori bazlı harcama dağılımı ve tahminler.', 'global', 'active', 'public', ARRAY['monetization'], '{"category": "monetization"}'::jsonb),
  ('budget_export', 'Bütçe Raporu Dışa Aktarma', 'Harcama raporlarını Excel/CSV olarak indirme.', 'global', 'active', 'public', ARRAY['monetization'], '{"category": "monetization"}'::jsonb),
  ('calendar_sync', 'Takvim Senkronizasyonu', 'Aşı ve bakım hatırlatıcılarını Google/Apple takvime aktarma.', 'global', 'active', 'public', ARRAY['core'], '{"category": "core"}'::jsonb),
  ('gallery_capacity', 'Gelişmiş Medya Galerisi', 'Yüksek çözünürlüklü ve geniş kapasiteli fotoğraf/video saklama.', 'global', 'active', 'public', ARRAY['core'], '{"category": "core"}'::jsonb),
  ('insurance_readiness', 'Sigorta Hazırlık Analizi', 'Evcil hayvan sigortası için uygunluk ve risk analizi.', 'global', 'active', 'public', ARRAY['health'], '{"category": "health"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  status = EXCLUDED.status,
  visibility = EXCLUDED.visibility,
  tags = EXCLUDED.tags,
  metadata = public.app_features.metadata || EXCLUDED.metadata;

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
