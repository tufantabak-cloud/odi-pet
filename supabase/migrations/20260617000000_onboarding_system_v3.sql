-- Create user_onboarding_steps table
CREATE TABLE IF NOT EXISTS public.user_onboarding_steps (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, step_id)
);

-- Enable RLS
ALTER TABLE public.user_onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own onboarding steps"
    ON public.user_onboarding_steps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding steps"
    ON public.user_onboarding_steps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding steps"
    ON public.user_onboarding_steps FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_steps_user_id ON public.user_onboarding_steps(user_id);
