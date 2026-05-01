-- Düzeltme: vaccine_records tablosundaki eski foreign key'i health_schedules'a bağlama

ALTER TABLE public.vaccine_records
  DROP CONSTRAINT IF EXISTS vaccine_records_schedule_id_fkey;

ALTER TABLE public.vaccine_records
  ADD CONSTRAINT vaccine_records_schedule_id_fkey
  FOREIGN KEY (schedule_id)
  REFERENCES public.health_schedules(id)
  ON DELETE SET NULL;
