-- Create passkeys table for WebAuthn
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL,
    backed_up BOOLEAN NOT NULL DEFAULT false,
    transports TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own passkeys
CREATE POLICY "Users can view their own passkeys" ON public.passkeys
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role (server) can insert/update/delete passkeys directly via API
-- So we don't need additional insert policies for authenticated users.

-- Create an index for quick credential lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON public.passkeys (credential_id);
