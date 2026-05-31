-- RPC for processing smart scanner results atomically
CREATE OR REPLACE FUNCTION public.process_smart_scan_results(
    p_pet_id UUID,
    p_record_type TEXT,
    p_parsed_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_vaccine_id UUID;
    v_schedule_id UUID;
    v_medication_id UUID;
    v_result JSONB;
    v_daily_grams INT;
    v_meals_per_day INT;
    v_package_size_grams INT;
    v_existing_stock_grams INT;
    v_total_stock_grams INT;
    v_days_until_refill INT;
BEGIN
    v_result := '{}'::JSONB;

    -- Tip dönüşümü ve case-sensitivity koruması
    v_daily_grams := COALESCE((p_parsed_data->>'daily_grams')::INT, (p_parsed_data->>'dailyGrams')::INT, 0);
    v_meals_per_day := COALESCE((p_parsed_data->>'meals_per_day')::INT, (p_parsed_data->>'mealsPerDay')::INT, 2);
    v_package_size_grams := COALESCE((p_parsed_data->>'package_size_grams')::INT, (p_parsed_data->>'packageSizeGrams')::INT, 0);
    v_existing_stock_grams := COALESCE((p_parsed_data->>'existing_stock_grams')::INT, (p_parsed_data->>'existingStockGrams')::INT, 0);

    IF p_record_type = 'food_packaging' THEN
        -- Update pet_nutrition_profiles
        UPDATE public.pet_nutrition_profiles
        SET 
            food_brand = p_parsed_data->>'food_brand',
            food_product = p_parsed_data->>'food_product',
            food_type = p_parsed_data->>'food_type',
            package_size_grams = v_package_size_grams,
            daily_grams = CASE WHEN v_daily_grams > 0 THEN v_daily_grams ELSE daily_grams END,
            meals_per_day = CASE WHEN v_meals_per_day > 0 THEN v_meals_per_day ELSE meals_per_day END,
            updated_at = NOW()
        WHERE pet_id = p_pet_id;

        IF NOT FOUND THEN
            INSERT INTO public.pet_nutrition_profiles (pet_id, food_brand, food_product, food_type, package_size_grams, daily_grams, meals_per_day)
            VALUES (
                p_pet_id, 
                p_parsed_data->>'food_brand', 
                p_parsed_data->>'food_product', 
                p_parsed_data->>'food_type', 
                v_package_size_grams,
                v_daily_grams,
                v_meals_per_day
            );
        END IF;

        -- Update food_inventory
        v_total_stock_grams := v_package_size_grams + v_existing_stock_grams;
        
        UPDATE public.food_inventory
        SET current_stock_grams = v_total_stock_grams,
            estimated_daily_usage = CASE WHEN v_daily_grams > 0 THEN v_daily_grams ELSE estimated_daily_usage END,
            last_refill_date = NOW(),
            next_refill_estimate = CASE 
                WHEN (CASE WHEN v_daily_grams > 0 THEN v_daily_grams ELSE estimated_daily_usage END) > 0 
                THEN NOW() + ((v_total_stock_grams / (CASE WHEN v_daily_grams > 0 THEN v_daily_grams ELSE estimated_daily_usage END)) || ' days')::INTERVAL
                ELSE next_refill_estimate
            END
        WHERE pet_id = p_pet_id;

        IF NOT FOUND THEN
            INSERT INTO public.food_inventory (pet_id, current_stock_grams, estimated_daily_usage, last_refill_date, next_refill_estimate)
            VALUES (
                p_pet_id, 
                v_total_stock_grams, 
                v_daily_grams, 
                NOW(),
                CASE 
                    WHEN v_daily_grams > 0 
                    THEN NOW() + ((v_total_stock_grams / v_daily_grams) || ' days')::INTERVAL
                    ELSE NULL
                END
            );
        END IF;

        -- Create a reminder schedule 1 week before the estimated refill date
        IF v_daily_grams > 0 THEN
            -- First, mark any existing 'upcoming' food order reminder as 'done'
            UPDATE public.health_schedules
            SET status = 'done'
            WHERE pet_id = p_pet_id 
              AND plan_type = 'nutrition' 
              AND sub_category = 'Mama Siparişi'
              AND status = 'upcoming';

            -- Then insert the new one
            v_days_until_refill := (v_total_stock_grams / v_daily_grams) - 7;
            IF v_days_until_refill < 0 THEN
                v_days_until_refill := 0;
            END IF;

            INSERT INTO public.health_schedules (pet_id, plan_type, title, due_date, status, category, sub_category)
            VALUES (
                p_pet_id, 
                'nutrition', 
                COALESCE(p_parsed_data->>'food_brand', 'Mama') || ' Siparişi Hatırlatıcısı', 
                (NOW() + (v_days_until_refill || ' days')::INTERVAL)::DATE, 
                'upcoming', 
                'Beslenme', 
                'Mama Siparişi'
            );
        END IF;

        -- Update species/age info in pets table if provided
        IF p_parsed_data->>'target_species' IS NOT NULL THEN
            UPDATE public.pets
            SET species = CASE 
                WHEN p_parsed_data->>'target_species' = 'dog' THEN 'Köpek'
                WHEN p_parsed_data->>'target_species' = 'cat' THEN 'Kedi'
                WHEN p_parsed_data->>'target_species' = 'bird' THEN 'Kuş'
                ELSE species END
            WHERE id = p_pet_id;
        END IF;

        v_result := '{"status": "success", "message": "Nutrition profiles updated"}'::JSONB;

    ELSIF p_record_type = 'vaccine_card' THEN
        -- Find existing upcoming schedule
        UPDATE public.health_schedules
        SET status = 'done'
        WHERE pet_id = p_pet_id 
          AND plan_type = 'vaccine' 
          AND title ILIKE '%' || (p_parsed_data->>'title') || '%'
          AND status = 'upcoming';

        -- Add vaccine record
        INSERT INTO public.vaccine_records (pet_id, applied_date, brand_name, lot_number, next_due_date)
        VALUES (
            p_pet_id, 
            (p_parsed_data->>'date')::DATE, 
            p_parsed_data->>'brand', 
            p_parsed_data->>'lot_number', 
            (p_parsed_data->>'next_date')::DATE
        );

        -- Add new upcoming schedule if next_date exists
        IF p_parsed_data->>'next_date' IS NOT NULL THEN
            INSERT INTO public.health_schedules (pet_id, plan_type, title, due_date, status, category, sub_category)
            VALUES (
                p_pet_id, 
                'vaccine', 
                p_parsed_data->>'title', 
                (p_parsed_data->>'next_date')::DATE, 
                'upcoming', 
                'Medikal', 
                'Aşı'
            );
        END IF;

        -- Update pet vet info if provided
        IF p_parsed_data->>'vet_name' IS NOT NULL OR p_parsed_data->>'vet_company' IS NOT NULL THEN
            UPDATE public.pets
            SET vet_name = COALESCE(p_parsed_data->>'vet_name', vet_name),
                vet_company = COALESCE(p_parsed_data->>'vet_company', vet_company)
            WHERE id = p_pet_id;
        END IF;

        v_result := '{"status": "success", "message": "Vaccine records updated"}'::JSONB;

    ELSIF p_record_type = 'medicine_packaging' OR p_record_type = 'parasite_product' THEN
        -- Add medication
        INSERT INTO public.health_medications (pet_id, medication_name, dose, usage_duration)
        VALUES (
            p_pet_id, 
            p_parsed_data->>'title', 
            p_parsed_data->>'dose', 
            p_parsed_data->>'duration'
        ) RETURNING id INTO v_medication_id;

        -- Add schedule for medication/parasite
        IF p_parsed_data->>'next_date' IS NOT NULL THEN
            INSERT INTO public.health_schedules (pet_id, plan_type, title, due_date, status, category, sub_category)
            VALUES (
                p_pet_id, 
                'medication', 
                p_parsed_data->>'title', 
                (p_parsed_data->>'next_date')::DATE, 
                'upcoming', 
                'Saglik', 
                CASE WHEN p_record_type = 'parasite_product' THEN 'İç Parazit' ELSE 'İlaç' END
            );
        END IF;

        v_result := '{"status": "success", "message": "Medication records updated"}'::JSONB;
    ELSE
        v_result := '{"status": "error", "message": "Unknown record type"}'::JSONB;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.health_schedules SET sub_category = 'Mama Siparişi' WHERE sub_category = 'Planlanmış Beslenme Görevleri';
