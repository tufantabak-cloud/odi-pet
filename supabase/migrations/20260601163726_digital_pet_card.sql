-- Create shared_pet_cards table
CREATE TABLE IF NOT EXISTS public.shared_pet_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    access_type TEXT NOT NULL DEFAULT 'temporary', -- 'temporary', 'permanent', 'adoption'
    expires_at TIMESTAMP WITH TIME ZONE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    can_log_entries BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    caregiver_custom_notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shared_pet_cards ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shared_pet_cards_pet_id ON public.shared_pet_cards(pet_id);
CREATE INDEX IF NOT EXISTS idx_shared_pet_cards_owner_user_id ON public.shared_pet_cards(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_pet_cards_share_token ON public.shared_pet_cards(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_pet_cards_expires_at ON public.shared_pet_cards(expires_at);

-- Create caregiver_logbook_entries table
CREATE TABLE IF NOT EXISTS public.caregiver_logbook_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_card_id UUID NOT NULL REFERENCES public.shared_pet_cards(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    caregiver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.caregiver_logbook_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_logbook_shared_card_id ON public.caregiver_logbook_entries(shared_card_id);
CREATE INDEX IF NOT EXISTS idx_logbook_pet_id ON public.caregiver_logbook_entries(pet_id);

-- Setup RLS Policies for shared_pet_cards

-- 1. Owners can manage their own shared cards
CREATE POLICY "Owners can CRUD their own shared pet cards" ON public.shared_pet_cards
    FOR ALL
    USING (auth.uid() = owner_user_id)
    WITH CHECK (auth.uid() = owner_user_id);

-- 2. Caregivers can view shared pet cards that are active and not expired
CREATE POLICY "Caregivers can view shared pet cards" ON public.shared_pet_cards
    FOR SELECT
    USING (
      (auth.uid() = shared_with_user_id) 
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
    );

-- Setup RLS Policies for caregiver_logbook_entries

-- 1. Owners can view all logbook entries for their pets
CREATE POLICY "Owners can view all logbook entries for their pets" ON public.caregiver_logbook_entries
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.shared_pet_cards 
        WHERE shared_pet_cards.id = shared_card_id 
        AND shared_pet_cards.owner_user_id = auth.uid()
      )
    );

-- 2. Caregivers can create and view their own logbook entries for active cards
CREATE POLICY "Caregivers can create and view their own logbook entries" ON public.caregiver_logbook_entries
    FOR ALL
    USING (
      auth.uid() = caregiver_user_id 
      AND EXISTS (
        SELECT 1 FROM public.shared_pet_cards 
        WHERE shared_pet_cards.id = shared_card_id 
        AND shared_pet_cards.shared_with_user_id = auth.uid() 
        AND shared_pet_cards.can_log_entries = TRUE 
        AND shared_pet_cards.is_active = TRUE
        AND (shared_pet_cards.expires_at IS NULL OR shared_pet_cards.expires_at > timezone('utc'::text, now()))
      )
    )
    WITH CHECK (
      auth.uid() = caregiver_user_id 
      AND EXISTS (
        SELECT 1 FROM public.shared_pet_cards 
        WHERE shared_pet_cards.id = shared_card_id 
        AND shared_pet_cards.shared_with_user_id = auth.uid() 
        AND shared_pet_cards.can_log_entries = TRUE 
        AND shared_pet_cards.is_active = TRUE
        AND (shared_pet_cards.expires_at IS NULL OR shared_pet_cards.expires_at > timezone('utc'::text, now()))
      )
    );

-- Extend pets RLS for Caregivers (ONLY SELECT)
CREATE POLICY "Caregivers can view pets shared with them" ON public.pets
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.shared_pet_cards 
        WHERE shared_pet_cards.pet_id = pets.id 
        AND shared_pet_cards.shared_with_user_id = auth.uid() 
        AND shared_pet_cards.is_active = TRUE
        AND (shared_pet_cards.expires_at IS NULL OR shared_pet_cards.expires_at > timezone('utc'::text, now()))
      )
    );

-- Trigger for updated_at on shared_pet_cards
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
    CREATE TRIGGER update_shared_pet_cards_modtime
        BEFORE UPDATE ON public.shared_pet_cards
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
  END IF;
END $$;
