-- 20260705000007_vaccination_upcoming_tasks_view.sql

-- Add extra_data JSONB to vaccination_plan_items if it doesn't exist
ALTER TABLE public.vaccination_plan_items
  ADD COLUMN IF NOT EXISTS extra_data JSONB;

-- Create or replace the view with all fields required by VaccinePlanItem
CREATE OR REPLACE VIEW public.vaccination_upcoming_tasks AS
SELECT
  vpi.id,
  vpi.pet_id,
  vpi.antigen_code,
  vpi.dose_number,
  vpi.recommended_start AS due_date,
  vpi.recommended_end,
  vpi.status,
  vpi.administration_route,
  vpi.extra_data,
  COALESCE(vpi.extra_data->>'sub_type', vpi.antigen_code) AS sub_type,
  COALESCE((vpi.extra_data->>'is_risk_based')::boolean, false) AS is_risk_based,
  vpi.extra_data->>'dose_basis' AS dose_basis,
  vb.brand_name,
  p.name AS pet_name,
  p.species
FROM public.vaccination_plan_items vpi
LEFT JOIN public.vaccine_brands vb ON vb.id = vpi.brand_id
JOIN public.pets p ON p.id = vpi.pet_id
WHERE
  vpi.status IN ('upcoming', 'due', 'overdue')
  AND vpi.recommended_start <= CURRENT_DATE + INTERVAL '30 days';
