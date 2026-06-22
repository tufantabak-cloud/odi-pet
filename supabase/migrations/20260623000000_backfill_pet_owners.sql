-- Backfill: demo/test pet b0000000-0000-0000-0000-000000000001 için
-- pet_owners kaydı yoksa ekle (401 hatasını önler)
INSERT INTO public.pet_owners (pet_id, profile_id, role)
SELECT 
  p.id,
  p.owner_id,
  'owner'
FROM public.pets p
LEFT JOIN public.pet_owners po ON po.pet_id = p.id AND po.profile_id = p.owner_id
WHERE po.id IS NULL
  AND p.owner_id IS NOT NULL;
