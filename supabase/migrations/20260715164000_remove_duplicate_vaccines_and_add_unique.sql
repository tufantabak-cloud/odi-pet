BEGIN;

-- 1. Yedekleme tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.vaccine_protocols_backup_20260715164000 (
    id UUID PRIMARY KEY,
    vaccine_code VARCHAR(100),
    protocol_name VARCHAR(100),
    species VARCHAR(50),
    category VARCHAR(50),
    is_core BOOLEAN,
    is_active BOOLEAN,
    repeat_frequency VARCHAR(50),
    repeat_interval_days INTEGER,
    end_condition JSONB,
    doses JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
    target_count INTEGER;
    backup_count INTEGER;
    deleted_count INTEGER;
    total_count INTEGER;
    chlamydia_count INTEGER;
    lyme_count INTEGER;
    duplicate_groups INTEGER;
    constraint_exists INTEGER;
BEGIN
    -- 2. Silinecek ID'lerin mevcut durumunu kontrol et
    SELECT count(*) INTO target_count 
    FROM public.vaccine_protocols 
    WHERE id IN (
        '026eedeb-7749-400e-a50b-6786af2b5bd2',
        '6f6ce88d-5364-4117-99e4-f8fb4d55dc8d'
    );

    IF target_count = 1 THEN
        RAISE EXCEPTION 'Mevcut kayit durumu tutarsiz. ID''lerden sadece biri bulunuyor. Islem iptal ediliyor.';
    ELSIF target_count = 2 THEN
        -- 3. Ikisi de mevcutsa yedekle
        INSERT INTO public.vaccine_protocols_backup_20260715164000 (
            id, vaccine_code, protocol_name, species, category, is_core, is_active,
            repeat_frequency, repeat_interval_days, end_condition, doses, notes,
            created_at, updated_at
        )
        SELECT 
            id, vaccine_code, protocol_name, species, category, is_core, is_active,
            repeat_frequency, repeat_interval_days, end_condition, doses, notes,
            created_at, updated_at
        FROM public.vaccine_protocols
        WHERE id IN (
            '026eedeb-7749-400e-a50b-6786af2b5bd2',
            '6f6ce88d-5364-4117-99e4-f8fb4d55dc8d'
        )
        ON CONFLICT (id) DO NOTHING;

        -- Yedeklenen kayitlarin gercekten yedek tabloda bulundugunu dogrula
        SELECT count(*) INTO backup_count 
        FROM public.vaccine_protocols_backup_20260715164000
        WHERE id IN (
            '026eedeb-7749-400e-a50b-6786af2b5bd2',
            '6f6ce88d-5364-4117-99e4-f8fb4d55dc8d'
        );

        IF backup_count != 2 THEN
            RAISE EXCEPTION 'Yedekleme dogrulamasi basarisiz. İki kayit da yedek tablosunda bulunamadi.';
        END IF;

        -- 4. Guvenli Silme islemi
        WITH deleted_rows AS (
            DELETE FROM public.vaccine_protocols
            WHERE id IN (
                '026eedeb-7749-400e-a50b-6786af2b5bd2',
                '6f6ce88d-5364-4117-99e4-f8fb4d55dc8d'
            )
            RETURNING id
        )
        SELECT count(*) INTO deleted_count FROM deleted_rows;

        IF deleted_count != 2 THEN
            RAISE EXCEPTION 'Silme islemi basarisiz. 2 kayit silinmesi beklenirken % kayit silindi.', deleted_count;
        END IF;
    END IF;
    -- target_count = 0 ise temizlik daha once yapilmis demektir, dogrulamalara gecilir.

    -- 5. Etkisiz olabilecek eski unique constraint ve index'i temizle
    ALTER TABLE public.vaccine_protocols DROP CONSTRAINT IF EXISTS vaccine_protocols_vaccine_code_key;
    DROP INDEX IF EXISTS vaccine_protocols_vaccine_code_key;

    -- 6. Gerçek UNIQUE constraint'i ekle (zaten kaldirildi, yenisini ekliyoruz)
    ALTER TABLE public.vaccine_protocols
    ADD CONSTRAINT vaccine_protocols_vaccine_code_key UNIQUE (vaccine_code);

    -- 7. DOGRULAMALAR (İslem commit edilmeden once)
    SELECT count(*) INTO total_count FROM public.vaccine_protocols;
    
    SELECT count(*) INTO duplicate_groups FROM (
        SELECT vaccine_code FROM public.vaccine_protocols GROUP BY vaccine_code HAVING count(*) > 1
    ) sub;
    
    SELECT count(*) INTO chlamydia_count FROM public.vaccine_protocols WHERE vaccine_code = 'CAT_CHLAMYDIA';
    SELECT count(*) INTO lyme_count FROM public.vaccine_protocols WHERE vaccine_code = 'DOG_LYME';
    
    SELECT count(*) INTO constraint_exists 
    FROM pg_constraint 
    WHERE conname = 'vaccine_protocols_vaccine_code_key' 
      AND conrelid = 'public.vaccine_protocols'::regclass;

    IF total_count != 11 THEN
        RAISE EXCEPTION 'Dogrulama hatasi: Toplam kayit 11 olmali, ancak % bulundu.', total_count;
    END IF;

    IF duplicate_groups != 0 THEN
        RAISE EXCEPTION 'Dogrulama hatasi: Hala duplicate gruplar (% adet) mevcut.', duplicate_groups;
    END IF;

    IF chlamydia_count != 1 THEN
        RAISE EXCEPTION 'Dogrulama hatasi: CAT_CHLAMYDIA kayit sayisi 1 olmali, ancak % bulundu.', chlamydia_count;
    END IF;

    IF lyme_count != 1 THEN
        RAISE EXCEPTION 'Dogrulama hatasi: DOG_LYME kayit sayisi 1 olmali, ancak % bulundu.', lyme_count;
    END IF;

    IF constraint_exists != 1 THEN
        RAISE EXCEPTION 'Dogrulama hatasi: vaccine_protocols_vaccine_code_key constrainti mevcut veya gecerli degil.';
    END IF;

END $$;

COMMIT;
