-- 20260706000004_parasite_upcoming_tasks_view.sql

CREATE OR REPLACE VIEW public.parasite_upcoming_tasks AS
SELECT
  ppi.id,
  ppi.pet_id,
  ppi.parasite_type,
  ppi.application_method,
  ppi.dose_number,
  ppi.recommended_start    AS due_date,
  ppi.recommended_end,
  ppi.status,
  ppi.applied_by,
  ppi.extra_data,
  pp.name                  AS product_name,
  pp.protection_duration_days,
  pp.covers_ear_mites,
  p.name                   AS pet_name,
  p.species
FROM public.parasite_plan_items ppi
LEFT JOIN public.parasite_products pp ON pp.id = ppi.product_id
JOIN public.pets p ON p.id = ppi.pet_id
WHERE
  ppi.status IN ('upcoming', 'due', 'overdue')
  AND ppi.recommended_start <= CURRENT_DATE + INTERVAL '30 days';
