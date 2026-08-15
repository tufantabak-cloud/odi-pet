# Odi.Pet — Empirical Technical Debt Inventory
**Doc ID**: DNA-008 | **Status**: PROD-FORENSIC-VERIFIED | **Version**: 2.0.0
**Audit Date**: 2026-08-12 | **Auditor**: Repository & Infrastructure Forensics Specialist
**Scope**: Architectural Debt, Code Duplication, Schema Drift & Refactoring Roadmap

---

## 1. Technical Debt Inventory

| Item ID | Category | Description & Evidence | Risk / Impact | Priority | Location | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TD-001` | Temporary Scripts | Legacy root JS/SQL test scripts (`test-db.js`, `replace.js`, `scratch.sql`) left in root folder. | Low (Clutter) | Medium | `c:\Odi.Pet\*.js` | `CONFIRMED` |
| `TD-002` | Migration Consolidation| 254 individual migration SQL files cause slow initial setup in local dev container. | Medium | Medium | `supabase/migrations/` | `CONFIRMED` |
| `TD-003` | Type Duplication | Duplicate TypeScript interfaces between `src/types/` and inline route parameter types. | Low | Low | `src/types/` | `CONFIRMED` |
| `TD-004` | Legacy CSS Classes | Occasional custom pixel padding overrides in legacy components prior to OPOS token freeze. | Low | Low | `src/components/` | `CONFIRMED` |

---

## 2. Refactoring Roadmap & Remediation Plan
1. **Root Script Cleanup**: Move test scripts from root into `scripts/dev/` or `scratch/`. [`HIGH CONFIDENCE`]
2. **Migration Flattening**: Create a single baseline `20260801_baseline_schema.sql` snapshot for fresh DB provisioning while keeping historical migrations. [`HIGH CONFIDENCE`]

---