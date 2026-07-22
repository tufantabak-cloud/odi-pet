-- Migration: Admin Controlled Veterinarian Review Requirement & Immutable Override Audit
-- File: 20260722180000_vet_review_requirement_and_override.sql

-- 1. articles Tablosuna Yeni Kolonlar Ekle
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS vet_review_requirement text NOT NULL DEFAULT 'required',
  ADD COLUMN IF NOT EXISTS vet_review_override_reason text,
  ADD COLUMN IF NOT EXISTS vet_review_override_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vet_review_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- CHECK Constraint: vet_review_requirement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_vet_review_requirement_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_vet_review_requirement_check
      CHECK (vet_review_requirement IN ('required', 'optional', 'not_required'));
  END IF;
END $$;

-- 2. Backfill Mevcut Veriler
UPDATE public.articles
SET vet_review_requirement = CASE 
  WHEN is_medical_content = true THEN 'required'
  ELSE 'not_required'
END
WHERE vet_review_requirement IS NULL OR vet_review_requirement = 'required';

-- Özel makale Backfill kontrolleri
UPDATE public.articles
SET vet_review_requirement = 'not_required'
WHERE title ILIKE '%Köpeklerde Temel Sosyalleşme İlkeleri%';

UPDATE public.articles
SET vet_review_requirement = 'required'
WHERE title ILIKE '%Kedilerde Sıvı Alımı ve Beslenme İlişkisi%';

-- 3. Kalıcı Audit Tablosu (admin_vet_override_logs)
CREATE TABLE IF NOT EXISTS public.admin_vet_override_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  old_requirement text NOT NULL,
  new_requirement text NOT NULL,
  reason text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_vet_override_logs_article ON public.admin_vet_override_logs(article_id);

ALTER TABLE public.admin_vet_override_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and founder can view override logs" ON public.admin_vet_override_logs;
CREATE POLICY "Admin and founder can view override logs" ON public.admin_vet_override_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

-- 4. Atomik Gereksinim Değişikliği RPC Stored Procedure
CREATE OR REPLACE FUNCTION change_vet_review_requirement(
  p_article_id uuid,
  p_new_requirement text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing articles%ROWTYPE;
  v_actor_role text;
  v_actor_id uuid;
  v_updated_article articles%ROWTYPE;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadı.';
  END IF;

  -- Rol kontrolü
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'founder') THEN
    RAISE EXCEPTION 'Yetkisiz erişim: Yalnız admin veya founder veteriner gereksinimini değiştirebilir.';
  END IF;

  IF p_new_requirement NOT IN ('required', 'optional', 'not_required') THEN
    RAISE EXCEPTION 'Geçersiz veteriner inceleme gereksinimi: %', p_new_requirement;
  END IF;

  SELECT * INTO v_existing FROM public.articles WHERE id = p_article_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Makale bulunamadı: %', p_article_id;
  END IF;

  -- Tıbbi içeriklerde required -> optional / not_required geçişinde gerekçe zorunluluğu
  IF v_existing.is_medical_content = true AND v_existing.vet_review_requirement = 'required' AND p_new_requirement IN ('optional', 'not_required') THEN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
      RAISE EXCEPTION 'Tıbbi içeriklerde veteriner onay zorunluluğunu esnetmek için gerekçe belirtilmesi zorunludur.';
    END IF;
  END IF;

  -- 1. Kalıcı Audit Kaydı Oluştur (Aynı Transaction İçinde)
  INSERT INTO public.admin_vet_override_logs (
    article_id,
    old_requirement,
    new_requirement,
    reason,
    actor_id,
    actor_role,
    created_at
  ) VALUES (
    p_article_id,
    COALESCE(v_existing.vet_review_requirement, 'required'),
    p_new_requirement,
    COALESCE(trim(p_reason), 'Gereksinim güncellendi'),
    v_actor_id,
    v_actor_role,
    now()
  );

  -- 2. Articles Tablosunu Güncelle (İstemciden gelen actor bilgisi kabul edilmez, server timestamp ve auth.uid kullanır)
  UPDATE public.articles SET
    vet_review_requirement = p_new_requirement,
    vet_review_override_reason = trim(p_reason),
    vet_review_override_by = v_actor_id,
    vet_review_override_at = now(),
    vet_review_status = CASE WHEN p_new_requirement = 'not_required' THEN 'not_required' ELSE vet_review_status END
  WHERE id = p_article_id
  RETURNING * INTO v_updated_article;

  RETURN to_jsonb(v_updated_article);
END;
$$;

-- 5. Sürüm Revizyon RPC Güncellemesi (vet_review_requirement desteği)
CREATE OR REPLACE FUNCTION update_article_with_revision(
  p_article_id uuid,
  p_updates jsonb,
  p_change_summary text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing articles%ROWTYPE;
  v_max_rev_ver integer;
  v_new_version integer;
  v_updated_article articles%ROWTYPE;
BEGIN
  -- Mevcut makaleyi FOR UPDATE kilidi ile çek
  SELECT * INTO v_existing
  FROM articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Makale bulunamadı: %', p_article_id;
  END IF;

  -- En yüksek sürüm numarasını bul
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_rev_ver
  FROM article_revisions
  WHERE article_id = p_article_id;

  v_new_version := GREATEST(COALESCE(v_existing.content_version, 1), v_max_rev_ver) + 1;

  -- 1. Articles Tablosunu Güncelle (İstemciden override_by/override_at/published_by KABUL EDİLMEZ)
  UPDATE articles SET
    title = COALESCE(p_updates->>'title', title),
    slug = COALESCE(p_updates->>'slug', slug),
    excerpt = COALESCE(p_updates->>'excerpt', excerpt),
    content = COALESCE(p_updates->>'content', content),
    cover_url = CASE WHEN p_updates ? 'cover_url' THEN p_updates->>'cover_url' ELSE cover_url END,
    category = COALESCE(p_updates->>'category', category),
    read_time_minutes = CASE WHEN p_updates ? 'read_time_minutes' THEN (p_updates->>'read_time_minutes')::integer ELSE read_time_minutes END,
    species_filter = CASE WHEN p_updates ? 'species_filter' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'species_filter') x) ELSE species_filter END,
    target_breed_keys = CASE WHEN p_updates ? 'target_breed_keys' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'target_breed_keys') x) ELSE target_breed_keys END,
    target_breed_traits = CASE WHEN p_updates ? 'target_breed_traits' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'target_breed_traits') x) ELSE target_breed_traits END,
    target_life_stages = CASE WHEN p_updates ? 'target_life_stages' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'target_life_stages') x) ELSE target_life_stages END,
    target_genders = CASE WHEN p_updates ? 'target_genders' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'target_genders') x) ELSE target_genders END,
    target_neutered_status = COALESCE(p_updates->>'target_neutered_status', target_neutered_status),
    target_seasons = CASE WHEN p_updates ? 'target_seasons' THEN (SELECT array_agg(x)::text[] FROM jsonb_array_elements_text(p_updates->'target_seasons') x) ELSE target_seasons END,
    priority_order = CASE WHEN p_updates ? 'priority_order' THEN (p_updates->>'priority_order')::integer ELSE priority_order END,
    is_medical_content = CASE WHEN p_updates ? 'is_medical_content' THEN (p_updates->>'is_medical_content')::boolean ELSE is_medical_content END,
    vet_review_requirement = COALESCE(p_updates->>'vet_review_requirement', vet_review_requirement),
    vet_review_status = COALESCE(p_updates->>'vet_review_status', vet_review_status),
    is_published = CASE WHEN p_updates ? 'is_published' THEN (p_updates->>'is_published')::boolean ELSE is_published END,
    freshness_type = COALESCE(p_updates->>'freshness_type', freshness_type),
    review_interval_days = CASE WHEN p_updates ? 'review_interval_days' THEN (p_updates->>'review_interval_days')::integer ELSE review_interval_days END,
    content_reviewed_at = now(),
    content_reviewed_by = COALESCE(p_actor_id, content_reviewed_by),
    source_checked_at = now(),
    next_review_at = now() + (COALESCE((p_updates->>'review_interval_days')::integer, review_interval_days, 365) || ' days')::interval,
    content_version = v_new_version,
    latest_change_summary = p_change_summary,
    archived_at = CASE WHEN p_updates ? 'archived_at' THEN (p_updates->>'archived_at')::timestamptz ELSE archived_at END
  WHERE id = p_article_id
  RETURNING * INTO v_updated_article;

  -- 2. Sürüm Snapshot'ı Oluştur (article_revisions)
  INSERT INTO article_revisions (
    article_id,
    version_number,
    content_snapshot,
    change_summary,
    changed_by,
    changed_at
  ) VALUES (
    p_article_id,
    v_new_version,
    to_jsonb(v_updated_article),
    p_change_summary,
    p_actor_id,
    now()
  )
  ON CONFLICT (article_id, version_number) DO UPDATE SET
    content_snapshot = EXCLUDED.content_snapshot,
    change_summary = EXCLUDED.change_summary,
    changed_by = EXCLUDED.changed_by,
    changed_at = EXCLUDED.changed_at;

  RETURN to_jsonb(v_updated_article);
END;
$$;

-- 6. RLS Okuma Politikası Güncellemesi (Mevcut tüm görünürlük şartlarını korur)
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can read eligible published articles" ON public.articles;

CREATE POLICY "Anyone can read eligible published articles" ON public.articles
  FOR SELECT
  USING (
    (
      is_published = true 
      AND (
        is_medical_content = false 
        OR vet_review_requirement = 'not_required'
        OR vet_review_requirement = 'optional'
        OR (vet_review_requirement = 'required' AND vet_review_status = 'approved')
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

NOTIFY pgrst, 'reload schema';
