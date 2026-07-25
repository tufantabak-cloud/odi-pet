-- Complete the authenticated lost-report wizard without replacing existing data.
-- Existing rows remain valid because all new columns are nullable.

ALTER TABLE public.lost_reports
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS source_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lost_reports_source_session_id
  ON public.lost_reports (source_session_id)
  WHERE source_session_id IS NOT NULL;

ALTER TABLE public.lost_report_drafts
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lost_report_drafts_profile_id
  ON public.lost_report_drafts (profile_id);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'lost-report-photos',
  'lost-report-photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Lost report photos are publicly readable" ON storage.objects;
CREATE POLICY "Lost report photos are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'lost-report-photos');

DROP POLICY IF EXISTS "Users upload own lost report photos" ON storage.objects;
CREATE POLICY "Users upload own lost report photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lost-report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own lost report photos" ON storage.objects;
CREATE POLICY "Users update own lost report photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lost-report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'lost-report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own lost report photos" ON storage.objects;
CREATE POLICY "Users delete own lost report photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lost-report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
