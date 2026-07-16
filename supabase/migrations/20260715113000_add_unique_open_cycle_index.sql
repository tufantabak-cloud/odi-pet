-- Aktif (açık) kızgınlık döngülerinin her pet için benzersiz olmasını garanti altına alır
CREATE UNIQUE INDEX IF NOT EXISTS one_active_estrus_cycle_per_pet
ON public.pet_estrus_cycles (pet_id)
WHERE end_date IS NULL;
