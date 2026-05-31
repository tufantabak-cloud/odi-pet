-- RLS Penetration Audit Enforcements
-- Target Tables: pets, profiles, vaccine_records_v2, health_treatments, pet_journal_entries, lost_reports, notifications, health_schedules, devices, push_subscriptions, event_stream
-- Note: sos_contacts is a JSONB column on pets, so it inherits pets RLS.

-- 1. Enable RLS explicitly on all requested tables to prevent anonymous/unauthorized access
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_records_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_stream ENABLE ROW LEVEL SECURITY;

-- 2. Ensure pet_owners table is used for Family-Shared Pets access
-- For tables linked to pets (like pet_journal_entries, health_treatments, etc.), 
-- we enforce that auth.uid() must exist in pet_owners for the given pet_id.

DO $$
BEGIN
    -- pets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pets' AND policyname = 'users_can_select_owned_or_shared_pets') THEN
        CREATE POLICY "users_can_select_owned_or_shared_pets" ON public.pets FOR SELECT USING (
            owner_id = auth.uid() OR id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_manage_own_profile_strict') THEN
        CREATE POLICY "users_manage_own_profile_strict" ON public.profiles FOR ALL USING (id = auth.uid());
    END IF;

    -- vaccine_records_v2
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vaccine_records_v2' AND policyname = 'users_manage_vaccine_records_strict') THEN
        CREATE POLICY "users_manage_vaccine_records_strict" ON public.vaccine_records_v2 FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- health_treatments
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_treatments') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_treatments' AND policyname = 'users_manage_treatments_strict') THEN
        CREATE POLICY "users_manage_treatments_strict" ON public.health_treatments FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- pet_journal_entries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pet_journal_entries' AND policyname = 'users_manage_journal_strict') THEN
        CREATE POLICY "users_manage_journal_strict" ON public.pet_journal_entries FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- lost_reports
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lost_reports' AND policyname = 'public_read_lost_reports') THEN
        CREATE POLICY "public_read_lost_reports" ON public.lost_reports FOR SELECT USING (status = 'active');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lost_reports' AND policyname = 'users_manage_lost_reports_strict') THEN
        CREATE POLICY "users_manage_lost_reports_strict" ON public.lost_reports FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- health_schedules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_schedules' AND policyname = 'users_manage_schedules_strict') THEN
        CREATE POLICY "users_manage_schedules_strict" ON public.health_schedules FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

    -- devices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devices' AND policyname = 'users_manage_devices_strict') THEN
        CREATE POLICY "users_manage_devices_strict" ON public.devices FOR ALL USING (
            pet_id IN (SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid())
        );
    END IF;

END
$$;
