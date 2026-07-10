-- ============================================================
-- Aşı belgeleri için PRIVATE storage bucket.
-- Önceden pet-avatars (public) bucket'ına yükleniyordu — aşı
-- karneleri/reçeteleri gibi hassas belgeler herkese açık bir
-- bucket'ta durmamalı. Path: {userId}/{petId}/{timestamp}_{filename}
-- Görüntüleme createSignedUrl (1 saatlik) ile yapılır.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vaccine-documents',
  'vaccine-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Kullanıcı sadece kendi klasörüne (ilk path segmenti = auth.uid()) yükleyebilir
DROP POLICY IF EXISTS "Users can upload their own vaccine documents" ON storage.objects;
CREATE POLICY "Users can upload their own vaccine documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vaccine-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Kullanıcı sadece kendi klasörünü görebilir (private bucket, herkese açık SELECT yok)
DROP POLICY IF EXISTS "Users can view their own vaccine documents" ON storage.objects;
CREATE POLICY "Users can view their own vaccine documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vaccine-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Kullanıcı sadece kendi belgesini silebilir
DROP POLICY IF EXISTS "Users can delete their own vaccine documents" ON storage.objects;
CREATE POLICY "Users can delete their own vaccine documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vaccine-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- document_image_url korunuyor (eski kayıtlar için) — yeni kayıtlar
-- document_storage_path kullanır, public URL yazılmaz.
ALTER TABLE vaccine_records_v2
ADD COLUMN IF NOT EXISTS document_storage_path text;
