# Changelog

All notable changes to this project will be documented in this file.

## [Milestone] QA Priority 1 — Critical Bug & Security CLOSED (2026-05-29)

### Summary
Production-ready QA Priority 1 (Critical Bug & Security) tamamen 
kapatıldı. Beş alt madde, 5 senaryo, 4 yeni E2E test, 2 production-blocker 
bug yakalandı ve düzeltildi.

### Added
- E2E test: e2e/lost-pet-duplicate.spec.ts (race condition coverage)
- E2E test: e2e/lost-pet-validation.spec.ts (phone/date/location validation)
- E2E test: e2e/lost-pet-rls.spec.ts (unauthorized access prevention)
- E2E test: e2e/vet-guide-gps-denied.spec.ts (GPS permission edge cases)
- docs/MIGRATION_TODO_PRE_LAUNCH.md (5 pending migrations tracked)
- docs/PRE_LAUNCH_FEATURE_TODO.md (Public SOS redesign + feature gaps)

### Fixed
- TypeScript errors (TS2367, TS2554, TS2820, TS7031) → 0 compile errors
- Lost report duplicate prevention: .single() → .limit(1) (race-safe)
- Lost report contact_phone validation: regex on Frontend + API
- Lost report last_seen_at: defensive validation (future date check, 5y max)
- Vet Guide API error message: Turkish, charter-compliant
- Vet Guide GPS timeout: specific error message + maximumAge 60s
- manifest.ts maskable typing
- RLS policy mismatch: lost_reports public_read 'status=lost' → 'status=active'

### Reverted
- Public SOS page (/sos/[id]) — security issues (service_role exposure, 
  sensitive data leak in pets.* SELECT). Will be redesigned with team approval.

### Pending (Pre-Launch — Pro Tier required)
- 20260528000002_pet_journal_entries.sql (timestamp rename)
- 20260529000002_enforce_rls_priority_1.sql (family-sharing RLS + status=active fix)
- 20260529000003_fix_journal_entry_types.sql ('appetite' constraint)
- Partial unique index: lost_reports(pet_id) WHERE status='active'
- CHECK constraint: contact_phone regex
- CHECK constraint: last_seen_at not future

### Backups Created
- 15 CSV files (Supabase Dashboard manual export)
- 1.05 MB SQL pg_dump (DBeaver via Session Pooler)
- Both stored: Desktop/odi-pet-backup-2026-05-29 + Google Drive

## [Unreleased]

### Fixed
- **RLS Policy Fix**: Fixed `lost_reports` `public_read_lost_reports` policy. The condition `USING (status = 'lost')` was updated to `USING (status = 'active')` to match the exact schema DB CHECK constraint and API usage. This prevents a critical bug where SOS links would appear broken/empty to anonymous users scanning QR codes.

### Reverted
- **Public SOS page (/sos/[id])** — removed due to security issues (service_role exposure, sensitive data leak in pets.* SELECT, protected area violation). Will be redesigned with team approval.
