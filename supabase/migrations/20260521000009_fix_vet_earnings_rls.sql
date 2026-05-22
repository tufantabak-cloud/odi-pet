-- ==============================================================================
-- SECURITY FIX: Restrict overly permissive RLS on vet_earnings
-- Purpose: Close security vulnerability that allowed anonymous/authenticated users
-- to view or modify vet_earnings. Access should only be via service_role.
-- ==============================================================================

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Vets can view own earnings" ON public.vet_earnings;

-- We do not add a replacement policy. By default, with RLS enabled and no policies,
-- all operations are denied for normal users.
-- The API backend will continue to use the service_role key to bypass RLS 
-- when inserting or managing earnings.
