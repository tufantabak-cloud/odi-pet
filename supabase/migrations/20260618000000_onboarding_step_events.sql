-- 1. Create step_events table for tracking onboarding and usage flows
CREATE TABLE IF NOT EXISTS public.step_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    step_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- e.g., 'view', 'submit', 'error', 'skip'
    error_category TEXT, -- Taxonomy: 'validation', 'ux', 'motivation'
    error_details JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics and faster lookups
CREATE INDEX IF NOT EXISTS idx_step_events_user_id ON public.step_events(user_id);
CREATE INDEX IF NOT EXISTS idx_step_events_step_id ON public.step_events(step_id);

-- Enable RLS
ALTER TABLE public.step_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own step events"
    ON public.step_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own step events"
    ON public.step_events FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Create completeness_score function
-- Returns an integer from 0 to 100 based on profile and pet data quality.
CREATE OR REPLACE FUNCTION public.calculate_completeness_score(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    has_name BOOLEAN;
    pet_count INTEGER;
    completed_steps_count INTEGER;
BEGIN
    -- Check Profile (First Name / Last Name) - 30 points
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = target_user_id 
          AND first_name IS NOT NULL 
          AND first_name != ''
    ) INTO has_name;
    
    IF has_name THEN
        score := score + 30;
    END IF;

    -- Check Pets - 40 points
    SELECT COUNT(*) INTO pet_count 
    FROM public.pets 
    WHERE owner_id = target_user_id;

    IF pet_count > 0 THEN
        score := score + 40;
    END IF;

    -- Check Onboarding Steps - 30 points
    SELECT COUNT(*) INTO completed_steps_count 
    FROM public.user_onboarding_steps 
    WHERE user_id = target_user_id AND is_completed = true;

    IF completed_steps_count > 0 THEN
        score := score + 30;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
