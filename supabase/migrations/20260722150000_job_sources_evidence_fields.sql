-- Odi.Pet — Add Evidence Fields to content_generation_job_sources

ALTER TABLE content_generation_job_sources
  ADD COLUMN IF NOT EXISTS grounding_provider text DEFAULT 'google_search_grounding',
  ADD COLUMN IF NOT EXISTS grounding_chunk_index integer,
  ADD COLUMN IF NOT EXISTS original_grounding_url text,
  ADD COLUMN IF NOT EXISTS final_url text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS page_h1 text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS http_status integer,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS technical_validation_status text DEFAULT 'passed',
  ADD COLUMN IF NOT EXISTS semantic_relevance text DEFAULT 'relevant',
  ADD COLUMN IF NOT EXISTS semantic_validation_reason text,
  ADD COLUMN IF NOT EXISTS external_identifier text,
  ADD COLUMN IF NOT EXISTS external_identifier_type text,
  ADD COLUMN IF NOT EXISTS publication_date text;
