-- Migration: Article Sources & Atomic Revision Transactions
-- File: 20260722130000_article_sources_and_atomicity.sql

-- 1. Article Sources Tablosu
CREATE TABLE IF NOT EXISTS article_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_title text NOT NULL,
  source_url text,
  publisher text,
  source_type text NOT NULL DEFAULT 'scientific',
  published_at timestamptz,
  checked_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CHECK Constraint: source_type
ALTER TABLE article_sources DROP CONSTRAINT IF EXISTS article_sources_type_check;
ALTER TABLE article_sources ADD CONSTRAINT article_sources_type_check
  CHECK (source_type IN ('official', 'veterinary_guideline', 'scientific', 'manufacturer', 'reputable_editorial'));

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_article_sources_article_id ON article_sources(article_id);
CREATE INDEX IF NOT EXISTS idx_article_sources_active ON article_sources(article_id, is_active);

-- RLS Politikaları
ALTER TABLE article_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and founder full access to article_sources" ON article_sources;
CREATE POLICY "Admin and founder full access to article_sources" ON article_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

-- 2. Atomik Sürüm & Güncelleme RPC Stored Procedure
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

  v_new_version := COALESCE(v_existing.content_version, 1) + 1;

  -- 1. Sürüm Snapshot'ı Oluştur (article_revisions)
  INSERT INTO article_revisions (
    article_id,
    version_number,
    content_snapshot,
    change_summary,
    changed_by,
    changed_at
  ) VALUES (
    p_article_id,
    COALESCE(v_existing.content_version, 1),
    to_jsonb(v_existing),
    p_change_summary,
    p_actor_id,
    now()
  );

  -- 2. Articles Tablosunu Atomik Olarak Güncelle
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
    content_reviewed_by = p_actor_id,
    source_checked_at = now(),
    next_review_at = now() + (COALESCE((p_updates->>'review_interval_days')::integer, review_interval_days, 365) || ' days')::interval,
    content_version = v_new_version,
    latest_change_summary = p_change_summary,
    archived_at = CASE WHEN p_updates ? 'archived_at' THEN (p_updates->>'archived_at')::timestamptz ELSE archived_at END
  WHERE id = p_article_id
  RETURNING * INTO v_updated_article;

  RETURN to_jsonb(v_updated_article);
END;
$$;
