-- Pet avatar'ları için Supabase Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-avatars',
  'pet-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politikaları
-- Herkes görebilir (public bucket)
DROP POLICY IF EXISTS "Pet avatars are publicly accessible" ON storage.objects; CREATE POLICY "Pet avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-avatars');

-- Giriş yapmış kullanıcılar yükleyebilir
DROP POLICY IF EXISTS "Authenticated users can upload pet avatars" ON storage.objects; CREATE POLICY "Authenticated users can upload pet avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-avatars' 
    AND auth.role() = 'authenticated'
  );

-- Kullanıcılar sadece kendi yüklediklerini silebilir
CREATE POLICY "Users can delete own pet avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
