-- =============================================
-- Cihaz Entegrasyonu Tablosu ve RLS Kuralları
-- =============================================

CREATE TABLE IF NOT EXISTS public.devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('camera', 'tag')),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
    wifi_name text,
    motion_alerts_enabled boolean NOT NULL DEFAULT true,
    sensitivity_level text NOT NULL DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high')),
    last_seen_at timestamp with time zone DEFAULT now(),
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS Etkinleştirme
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Politikası: Kullanıcı kendi evcil hayvanına ait cihazları okuyabilir.
CREATE POLICY "Users can view devices of their own pets" ON public.devices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = devices.pet_id
              AND (pets.owner_id = auth.uid() OR public.user_has_pet_access(pets.id))
        )
    );

-- 2. INSERT Politikası: Kullanıcı kendi evcil hayvanına yeni cihaz ekleyebilir.
CREATE POLICY "Users can insert devices for their own pets" ON public.devices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = devices.pet_id
              AND (pets.owner_id = auth.uid() OR public.user_has_pet_access(pets.id))
        )
    );

-- 3. UPDATE Politikası: Kullanıcı kendi evcil hayvanına ait cihazı güncelleyebilir.
CREATE POLICY "Users can update devices of their own pets" ON public.devices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = devices.pet_id
              AND (pets.owner_id = auth.uid() OR public.user_has_pet_access(pets.id))
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = devices.pet_id
              AND (pets.owner_id = auth.uid() OR public.user_has_pet_access(pets.id))
        )
    );

-- 4. DELETE Politikası: Kullanıcı kendi evcil hayvanına ait cihazı silebilir.
CREATE POLICY "Users can delete devices of their own pets" ON public.devices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = devices.pet_id
              AND (pets.owner_id = auth.uid() OR public.user_has_pet_access(pets.id))
        )
    );
