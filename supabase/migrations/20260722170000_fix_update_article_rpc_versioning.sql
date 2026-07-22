-- Migration: Fix update_article_with_revision RPC version conflict & ensure excerpt column
-- File: 20260722170000_fix_update_article_rpc_versioning.sql

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS excerpt text;

COMMENT ON COLUMN public.articles.excerpt
  IS 'Kullanıcıya içerik kartlarında ve detay girişinde gösterilen kısa özet.';

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

  -- article_revisions tablosundaki en yüksek sürüm numarasını bul
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_rev_ver
  FROM article_revisions
  WHERE article_id = p_article_id;

  v_new_version := GREATEST(COALESCE(v_existing.content_version, 1), v_max_rev_ver) + 1;

  -- 1. Articles Tablosunu Atomik Olarak Güncelle
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

NOTIFY pgrst, 'reload schema';
