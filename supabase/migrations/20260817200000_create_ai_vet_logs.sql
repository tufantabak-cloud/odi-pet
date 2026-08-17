-- Migration: 20260817200000_create_ai_vet_logs.sql
-- Description: Creates ai_vet_logs table for auditing AI Vet usage.

CREATE TABLE public.ai_vet_logs (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    pet_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    user_prompt text NOT NULL,
    ai_response jsonb NOT NULL,
    severity text NOT NULL,
    powered_by text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Primary Key
ALTER TABLE ONLY public.ai_vet_logs
    ADD CONSTRAINT ai_vet_logs_pkey PRIMARY KEY (id);

-- Foreign Keys
ALTER TABLE ONLY public.ai_vet_logs
    ADD CONSTRAINT ai_vet_logs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_vet_logs
    ADD CONSTRAINT ai_vet_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_ai_vet_logs_owner_id ON public.ai_vet_logs USING btree (owner_id);
CREATE INDEX idx_ai_vet_logs_pet_id ON public.ai_vet_logs USING btree (pet_id);
CREATE INDEX idx_ai_vet_logs_created_at ON public.ai_vet_logs USING btree (created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_vet_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only owners can read their own logs
CREATE POLICY "Users can view their own ai_vet_logs" ON public.ai_vet_logs
    FOR SELECT
    USING ((auth.uid() = owner_id));

-- No inserts from authenticated/anon roles (Backend inserts using service_role bypasses this)
-- No updates or deletes allowed to preserve audit trail integrity
