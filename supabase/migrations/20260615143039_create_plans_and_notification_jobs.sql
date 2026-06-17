-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    extra_data JSONB DEFAULT '{}'::jsonb,
    repeat_rule TEXT,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
    ON public.plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
    ON public.plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
    ON public.plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
    ON public.plans FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
create trigger handle_plans_updated_at before update on public.plans
    for each row execute procedure extensions.moddatetime (updated_at);

-- Create notification_jobs table
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification_jobs"
    ON public.notification_jobs FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypasses RLS by default, but we can add explicit policies if needed
-- No insert/update/delete policies for normal users so they cannot modify notification_jobs
