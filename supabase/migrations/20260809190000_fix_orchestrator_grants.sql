-- =========================================================================================
-- Odi.Pet - Phase 19D - Fix Orchestrator Table Grants
-- Grants least privilege SELECT/INSERT table permissions to authenticated role for Orchestrator tables
-- =========================================================================================

GRANT SELECT ON TABLE public.orchestrator_campaigns TO authenticated;
GRANT SELECT ON TABLE public.orchestrator_prompts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.orchestrator_analytics TO authenticated;
