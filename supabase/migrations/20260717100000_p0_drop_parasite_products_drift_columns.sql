BEGIN;

-- ==========================================
-- P0: parasite_products şema drift temizliği
-- ==========================================
-- status / suggested_by / admin_note kolonları hiçbir migration'da tanımlı
-- olmadığı halde canlı DB'de mevcuttu (uygulanmış bir migration'ın geriye
-- dönük düzenlenmesinin kalıntısı — bkz. scratch/fix_parasites.js).
-- Kullanıcı ürün önerileri ayrı bir parasite_product_suggestions tablosunda
-- yaşayacağı için (P2) bu kolonlar kaldırılıyor.
--
-- Katalog kuralı bundan sonra: parasite_products YALNIZCA yayınlanmış
-- ürünleri içerir; operasyonel gizleme is_active ile yapılır.

-- Guard: kolonlarda gerçek öneri verisi varsa migration DURUR (fail-closed).
DO $$
DECLARE
    col_exists boolean;
    bad_count integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'parasite_products' AND column_name = 'status'
    ) INTO col_exists;

    IF col_exists THEN
        EXECUTE 'SELECT count(*) FROM public.parasite_products WHERE status IS DISTINCT FROM ''approved'''
        INTO bad_count;
        IF bad_count > 0 THEN
            RAISE EXCEPTION 'Drift temizliği durduruldu: % satırda status <> approved (bekleyen öneri olabilir). Önce bu satırları inceleyin.', bad_count;
        END IF;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'parasite_products' AND column_name = 'suggested_by'
    ) INTO col_exists;

    IF col_exists THEN
        EXECUTE 'SELECT count(*) FROM public.parasite_products WHERE suggested_by IS NOT NULL'
        INTO bad_count;
        IF bad_count > 0 THEN
            RAISE EXCEPTION 'Drift temizliği durduruldu: % satırda suggested_by dolu (kullanıcı önerisi olabilir). Önce bu satırları inceleyin.', bad_count;
        END IF;
    END IF;
END $$;

-- Drift POLICY temizliği: canlıda migration'sız policy'ler de tespit edildi
-- (örn. "parasite_pending_own_read" suggested_by kolonuna bağımlı ve DROP'u
-- engelliyordu). Tablodaki TÜM policy'ler kaldırılıp reponun tanımladığı iki
-- kanonik policy (20260605000001 ile birebir) aynı transaction içinde yeniden
-- kurulur — erişim davranışı deterministik olarak repo durumuna döner.
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'parasite_products'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.parasite_products', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "parasite_products_read_all"
  ON public.parasite_products FOR SELECT
  USING (true);

CREATE POLICY "parasite_products_admin_write"
  ON public.parasite_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
    )
  );

ALTER TABLE public.parasite_products
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS suggested_by,
  DROP COLUMN IF EXISTS admin_note;

COMMIT;
