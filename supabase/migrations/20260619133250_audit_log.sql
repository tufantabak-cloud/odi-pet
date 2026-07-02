-- Append-only Audit Log table (Module 6)
-- Features SHA256 hash-chain trigger for integrity verification

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL,
    actor_id UUID,
    ip_address INET,
    resource_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previous_hash TEXT,
    hash TEXT
);

-- Deny UPDATE and DELETE to make it append-only
CREATE RULE deny_audit_update AS ON UPDATE TO public.security_audit_logs DO INSTEAD NOTHING;
CREATE RULE deny_audit_delete AS ON DELETE TO public.security_audit_logs DO INSTEAD NOTHING;

-- Trigger to calculate hash chain
CREATE OR REPLACE FUNCTION public.calculate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
    data_to_hash TEXT;
BEGIN
    -- Get the hash of the most recent log entry
    SELECT hash INTO prev_hash
    FROM public.security_audit_logs
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    -- If this is the first entry, use a default genesis hash
    IF prev_hash IS NULL THEN
        prev_hash := encode(digest('GENESIS_HASH_ODI_PET', 'sha256'), 'hex');
    END IF;

    -- Assign previous_hash
    NEW.previous_hash := prev_hash;

    -- Calculate the current hash: SHA256(prev_hash + action_type + actor_id + created_at)
    data_to_hash := prev_hash || NEW.action_type || COALESCE(NEW.actor_id::text, '') || NEW.created_at::text;
    
    -- Note: Requires pgcrypto extension
    NEW.hash := encode(digest(data_to_hash, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create trigger
DROP TRIGGER IF EXISTS audit_log_hash_trigger ON public.security_audit_logs;
CREATE TRIGGER audit_log_hash_trigger
    BEFORE INSERT ON public.security_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_audit_hash();

-- Row Level Security (RLS)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin or postgres roles can read
CREATE POLICY "Super admins can read audit logs" ON public.security_audit_logs
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Only internal authenticated server roles can insert
-- Or we can just let service role handle inserts and deny all insert for normal authenticated users
CREATE POLICY "Deny insert for normal users" ON public.security_audit_logs
    FOR INSERT
    WITH CHECK (false); -- Handled via database functions/service role bypasses RLS
