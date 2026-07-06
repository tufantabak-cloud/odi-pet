-- ============================================================
-- OdiPet — Faz 2: vaccination_plan_items Tablosu (Geçiş Dönemi)
-- Migration: 20260705000005_vaccination_plan_items.sql
-- Tarih: 5 Temmuz 2026
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccination_plan_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  antigen_code      TEXT NOT NULL,
  brand_id          UUID REFERENCES public.vaccine_brands(id),
  dose_number       INTEGER NOT NULL DEFAULT 1,
  recommended_start DATE,
  recommended_end   DATE,
  scheduled_date    DATE,
  status            TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN (
      'upcoming','due','scheduled','overdue',
      'completed','skipped','not_applicable',
      'vet_review_required','cancelled'
    )),
  plan_origin       TEXT NOT NULL DEFAULT 'system_rule'
    CHECK (plan_origin IN (
      'system_rule','fresh_start','imported_plan',
      'user_created','veterinarian'
    )),
  administration_route TEXT
    CHECK (administration_route IN (
      'intranasal','oral','parenteral_sc','parenteral_im'
    )),
  completed_record_id UUID REFERENCES public.vaccine_records_v2(id) ON DELETE SET NULL,
  plans_mirror_id   UUID REFERENCES public.plans(id) ON DELETE SET NULL, -- geçiş dönemi bağlantısı
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vplan_pet_id     ON public.vaccination_plan_items (pet_id);
CREATE INDEX IF NOT EXISTS idx_vplan_status     ON public.vaccination_plan_items (status);
CREATE INDEX IF NOT EXISTS idx_vplan_antigen    ON public.vaccination_plan_items (antigen_code);

-- RLS: Herkes okuyabilir, sadece yetkililer yönetebilir
ALTER TABLE public.vaccination_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage vaccination_plan_items" ON public.vaccination_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = vaccination_plan_items.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );
