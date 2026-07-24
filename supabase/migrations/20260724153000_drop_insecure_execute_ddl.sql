-- Migration: 20260724153000_drop_insecure_execute_ddl.sql
-- Description: Drop insecure execute_ddl function and revoke all privileges

BEGIN;

REVOKE ALL PRIVILEGES
ON FUNCTION public.execute_ddl(text)
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON FUNCTION public.execute_ddl(text)
FROM anon;

REVOKE ALL PRIVILEGES
ON FUNCTION public.execute_ddl(text)
FROM authenticated;

REVOKE ALL PRIVILEGES
ON FUNCTION public.execute_ddl(text)
FROM service_role;

DROP FUNCTION IF EXISTS public.execute_ddl(text);

COMMIT;
