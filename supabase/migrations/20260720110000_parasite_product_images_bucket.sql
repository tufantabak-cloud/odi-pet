BEGIN;

-- ==========================================
-- Storage bucket: parasite-product-images
-- ==========================================
-- Admin ürün kataloğu görselleri için public (okuma) bucket.
-- Yazma yalnızca admin/founder (endpoint service-role ile yazar; RLS savunma katmanı).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parasite-product-images',
  'parasite-product-images',
  true,
  3145728, -- 3MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public okuma (public bucket zaten public URL ile servis eder; açık policy netlik için)
DROP POLICY IF EXISTS "parasite_product_images_public_read" ON storage.objects;
CREATE POLICY "parasite_product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'parasite-product-images');

-- Yazma: yalnızca admin/founder
DROP POLICY IF EXISTS "parasite_product_images_admin_insert" ON storage.objects;
CREATE POLICY "parasite_product_images_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'parasite-product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "parasite_product_images_admin_delete" ON storage.objects;
CREATE POLICY "parasite_product_images_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'parasite-product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'founder'))
  );

COMMIT;
