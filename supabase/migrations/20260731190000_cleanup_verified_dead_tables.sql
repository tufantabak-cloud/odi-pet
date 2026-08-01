-- Migration: 20260731190000_cleanup_verified_dead_tables.sql
-- Description: Drop verified unused / legacy dead tables from public schema

DROP TABLE IF EXISTS public.vaccine_protocols_backup_20260715164000 CASCADE;
DROP TABLE IF EXISTS public.pet_membership_migration_issues CASCADE;
DROP TABLE IF EXISTS public.care_events CASCADE;
DROP TABLE IF EXISTS public.pet_care_events CASCADE;
DROP TABLE IF EXISTS public.pet_care_tasks CASCADE;
DROP TABLE IF EXISTS public.health_measurements CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.lost_report_contacts CASCADE;
DROP TABLE IF EXISTS public.data_quality_configs CASCADE;
DROP TABLE IF EXISTS public.admin_vet_override_logs CASCADE;
DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;
DROP TABLE IF EXISTS public.beta_signups CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.food_label_versions CASCADE;
DROP TABLE IF EXISTS public.funnel_events CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;
DROP TABLE IF EXISTS public.pet_clinic_access CASCADE;
DROP TABLE IF EXISTS public.pet_matches CASCADE;
DROP TABLE IF EXISTS public.pet_membership_events CASCADE;
DROP TABLE IF EXISTS public.pet_nutrition_logs CASCADE;
DROP TABLE IF EXISTS public.profiling_prompts CASCADE;
DROP TABLE IF EXISTS public.referral_rewards CASCADE;
DROP TABLE IF EXISTS public.security_audit_logs CASCADE;
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.smart_scanner_records CASCADE;
DROP TABLE IF EXISTS public.vets CASCADE;
