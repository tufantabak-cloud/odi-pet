-- =========================================================================================
-- Odi.Pet - Phase X - Experience Orchestrator Migration
-- OPOS Volume 6 (SSOT) & Volume 13 (AI Governance) Compliant
-- =========================================================================================

-- 1. Create ENUM Types
CREATE TYPE public.orchestrator_campaign_status AS ENUM (
    'draft',
    'testing',
    'scheduled',
    'active',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE public.orchestrator_display_type AS ENUM (
    'modal',
    'bottom_sheet',
    'inline_banner'
);

CREATE TYPE public.orchestrator_event_type AS ENUM (
    'shown',
    'opened',
    'started',
    'completed',
    'dismissed',
    'failed_validation',
    'timeout',
    'snoozed'
);

-- 2. Create orchestrator_campaigns table
CREATE TABLE public.orchestrator_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status public.orchestrator_campaign_status NOT NULL DEFAULT 'draft',
    base_priority INTEGER NOT NULL DEFAULT 0,
    target_segment_rules JSONB DEFAULT '{}'::jsonb,
    trigger_events TEXT[] DEFAULT '{}'::text[],
    cooldown_rules JSONB DEFAULT '{}'::jsonb,
    ab_test_config JSONB DEFAULT '{}'::jsonb,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create orchestrator_prompts table
CREATE TABLE public.orchestrator_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.orchestrator_campaigns(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    component_name TEXT NOT NULL,
    mutation_action TEXT, -- Protected via backend mapping
    display_type public.orchestrator_display_type NOT NULL DEFAULT 'modal',
    ui_config JSONB DEFAULT '{}'::jsonb,
    workflow_definition JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create orchestrator_analytics table
CREATE TABLE public.orchestrator_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.orchestrator_campaigns(id) ON DELETE SET NULL,
    prompt_id UUID REFERENCES public.orchestrator_prompts(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type public.orchestrator_event_type NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.orchestrator_campaigns
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.orchestrator_prompts
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.orchestrator_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestrator_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestrator_analytics ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies

-- orchestrator_campaigns: Authenticated users can read active campaigns (or all, filtering happens in API)
CREATE POLICY "Users can read orchestrator campaigns"
    ON public.orchestrator_campaigns FOR SELECT
    TO authenticated
    USING (true);

-- orchestrator_prompts: Authenticated users can read prompts
CREATE POLICY "Users can read orchestrator prompts"
    ON public.orchestrator_prompts FOR SELECT
    TO authenticated
    USING (true);

-- orchestrator_analytics: Users can only insert analytics for their own profile
CREATE POLICY "Users can insert their own analytics"
    ON public.orchestrator_analytics FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = profile_id);

-- orchestrator_analytics: Users can only read their own analytics
CREATE POLICY "Users can read their own analytics"
    ON public.orchestrator_analytics FOR SELECT
    TO authenticated
    USING (auth.uid() = profile_id);

-- 8. Add Indexes for performance
CREATE INDEX idx_orchestrator_campaigns_status ON public.orchestrator_campaigns(status);
CREATE INDEX idx_orchestrator_prompts_campaign_id ON public.orchestrator_prompts(campaign_id);
CREATE INDEX idx_orchestrator_analytics_profile_id ON public.orchestrator_analytics(profile_id);
CREATE INDEX idx_orchestrator_analytics_campaign_id ON public.orchestrator_analytics(campaign_id);
