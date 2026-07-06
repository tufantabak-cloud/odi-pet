-- 20260706000001_parasite_plan_items.sql

CREATE TABLE public.parasite_plan_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id                UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES public.parasite_products(id),
  parasite_type         TEXT NOT NULL CHECK (parasite_type IN (
                          'internal', 'external', 'combined'
                        )),
  application_method    TEXT NOT NULL CHECK (application_method IN (
                          'spot_on', 'tablet', 'collar', 'injection', 'other'
                        )),
  dose_number           INTEGER NOT NULL DEFAULT 1,
  recommended_start     DATE,
  recommended_end       DATE,
  scheduled_date        DATE,
  status                TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
                          'upcoming','due','scheduled','overdue',
                          'completed','skipped','not_applicable','cancelled'
                        )),
  plan_origin           TEXT NOT NULL DEFAULT 'system_rule' CHECK (plan_origin IN (
                          'system_rule','user_created','veterinarian'
                        )),
  applied_by            TEXT CHECK (applied_by IN ('owner','clinic')),
  completed_record_id   UUID,
  plans_mirror_id       UUID REFERENCES public.plans(id),
  extra_data            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pplan_pet_id  ON public.parasite_plan_items (pet_id);
CREATE INDEX idx_pplan_status  ON public.parasite_plan_items (status);
CREATE INDEX idx_pplan_type    ON public.parasite_plan_items (parasite_type);

ALTER TABLE public.parasite_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet parasite plans"
  ON public.parasite_plan_items FOR ALL
  USING (
    pet_id IN (
      SELECT id FROM public.pets WHERE owner_id = auth.uid()
    )
  );
