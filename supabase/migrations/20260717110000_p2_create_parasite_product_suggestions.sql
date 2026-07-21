BEGIN;

-- ==========================================
-- P2: parasite_product_suggestions
-- ==========================================
-- Kullanıcı ürün önerileri KATALOGDAN AYRI tabloda yaşar
-- (vaccine_catalog_suggestions deseni). Böylece:
--   - pending satırlar hiçbir kullanıcı ürün sorgusuna sızamaz (yapısal garanti)
--   - parasite_products yalnızca yayınlanmış ürünleri içerir
--   - kayıt akışı öneriden tamamen bağımsızdır (kayıt-önce kuralı)
-- Enum alfabesi: application_method KAYIT alfabesini kullanır (spot_on);
-- admin onayında katalog alfabesine (spot-on) eşlenir.

CREATE TABLE IF NOT EXISTS public.parasite_product_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
    name_suggested TEXT NOT NULL CHECK (btrim(name_suggested) <> ''),
    brand TEXT NULL,
    parasite_type TEXT NOT NULL CHECK (parasite_type IN ('internal', 'external', 'combined', 'collar')),
    application_method TEXT NOT NULL CHECK (application_method IN ('spot_on', 'oral', 'collar', 'injection', 'spray', 'shampoo', 'other')),
    protection_duration_days INTEGER NOT NULL CHECK (protection_duration_days > 0 AND protection_duration_days <= 1095),
    reason TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
    merged_into_product_id UUID NULL REFERENCES public.parasite_products(id) ON DELETE SET NULL,
    approved_product_id UUID NULL REFERENCES public.parasite_products(id) ON DELETE SET NULL,
    admin_note TEXT NULL,
    reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parasite_suggestions_status
  ON public.parasite_product_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parasite_suggestions_user
  ON public.parasite_product_suggestions(suggested_by);

-- Yetkiler
REVOKE ALL ON TABLE public.parasite_product_suggestions FROM anon;
GRANT SELECT, INSERT ON TABLE public.parasite_product_suggestions TO authenticated;
GRANT ALL ON TABLE public.parasite_product_suggestions TO service_role;

-- RLS (asıl yazma yolu service-role endpoint'idir; bunlar savunma katmanı)
ALTER TABLE public.parasite_product_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parasite_suggestions_own_or_admin_read" ON public.parasite_product_suggestions;
CREATE POLICY "parasite_suggestions_own_or_admin_read"
  ON public.parasite_product_suggestions FOR SELECT
  TO authenticated
  USING (
    suggested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "parasite_suggestions_own_insert" ON public.parasite_product_suggestions;
CREATE POLICY "parasite_suggestions_own_insert"
  ON public.parasite_product_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    suggested_by = auth.uid()
    AND status = 'pending'
    AND merged_into_product_id IS NULL
    AND approved_product_id IS NULL
    AND admin_note IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

DROP POLICY IF EXISTS "parasite_suggestions_admin_update" ON public.parasite_product_suggestions;
CREATE POLICY "parasite_suggestions_admin_update"
  ON public.parasite_product_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

COMMIT;
