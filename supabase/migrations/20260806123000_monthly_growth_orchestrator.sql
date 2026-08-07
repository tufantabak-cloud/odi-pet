-- =========================================================================================
-- Odi.Pet - Monthly Growth & Gallery Orchestrator Campaign
-- OPOS v1.0 Compliant
--
-- NOT: orchestrator_campaigns.id ve orchestrator_prompts.id kolonlari UUID tipindedir.
-- Deterministik (sabit) UUID'ler kullanilarak migration idempotent hale getirilmistir.
-- ON CONFLICT DO NOTHING tercih edilmistir: admin panelinden yapilan kampanya
-- ayar degisiklikleri her deploy'da sessizce ezilmemelidir.
-- =========================================================================================

-- 1. Campaign Tanimi (Idempotent insert)
INSERT INTO public.orchestrator_campaigns (
  id,
  name,
  description,
  status,
  base_priority,
  start_date,
  end_date,
  trigger_events,
  target_segment_rules,
  cooldown_rules
) VALUES (
  '3f7c1a20-5d84-4d1e-9c3a-8b6f2e0d4a11'::uuid,
  'Aylık Pet Gelişim ve Galeri Takibi',
  'Her ay pet gelişim fotoğrafı toplayan tekrarlayan kampanya (30 gün cooldown).',
  'active',
  15,
  now(),
  '2099-12-31T00:00:00Z'::timestamptz,
  ARRAY['on_load']::text[],
  '{"target_tags": ["pet_detail"], "requires": {"no_gallery_photo_in_days": 30, "category": "growth_timeline", "gallery_quota_available": true}}'::jsonb,
  '{"cooldown_hours": 720, "recurring": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Prompt Tanimi (Idempotent insert)
INSERT INTO public.orchestrator_prompts (
  id,
  campaign_id,
  component_name,
  mutation_action,
  display_type,
  ui_config
) VALUES (
  '6b2e9d44-1c73-4a58-b0f9-2d5c7e81a933'::uuid,
  '3f7c1a20-5d84-4d1e-9c3a-8b6f2e0d4a11'::uuid,
  'SmartMonthlyGrowthPrompt',
  'SAVE_MONTHLY_GROWTH',
  'bottom_sheet',
  '{"title": "Aylık Gelişim", "description": "Bu ayın büyüme fotoğrafını ekleyin, gelişimini zaman tünelinde izleyelim.", "cta_label": "Fotoğrafı Kaydet"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 3. Indeksler (Idempotent)
CREATE INDEX IF NOT EXISTS idx_pet_gallery_pet_category_taken ON public.pet_gallery(pet_id, category, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_gallery_pet_id_created_at ON public.pet_gallery(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_analytics_profile_campaign_created ON public.orchestrator_analytics(profile_id, campaign_id, created_at DESC);
