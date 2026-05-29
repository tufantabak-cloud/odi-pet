# Next Session — Odi.Pet QA

**Last session:** 2026-05-29
**Status:** Priority 1 (Critical Bug & Security) CLOSED ✅

## Where We Stopped

Priority 1 fully closed. Verification:
- npm run test → 58/58 ✅
- npm run build → success ✅
- npx tsc --noEmit → 0 errors ✅

## Next Priority: 2 — Empty / Loading / Error States (every page)

This is a LARGE cycle. ~70 routes across owner/vet/admin user types.

### Approach (waiting for team brief)
The agent team (via `odi brief`) will decide the breakdown strategy. 
Options to discuss with team:
- A) By user role: owner pages first → vet → admin
- B) By criticality: critical user paths first (dashboard, pets, SOS, AI Vet)
- C) By page type: data-heavy pages first (lists, search results)

Don't pick a strategy unilaterally. Wait for team brief.

### For each page in scope, check:
1. Empty state — text + visual when no data
2. Loading state — skeleton/spinner appropriate
3. Error state — Turkish, charter-compliant message + recovery action
4. Edge: data exists but partially missing (null fields)

### Constraints (same as Priority 1)
- ONLY existing files (no new routes, no new architecture)
- New E2E tests OK in e2e/ folder
- DB changes → MIGRATION_TODO_PRE_LAUNCH.md (no push)
- Permission boundary violations → STOP, ask user

## Open Items From Priority 1 (Don't Lose)

### Migration TODO (Pro Tier required, pre-launch)
See docs/MIGRATION_TODO_PRE_LAUNCH.md (5 items)

### Feature TODO (pre-launch)
See docs/PRE_LAUNCH_FEATURE_TODO.md:
- Public SOS page redesign (charter-compliant, no service_role, 
  minimum data, rate-limited, robots noindex)
- Research: how does QR code generation actually work in Odi.Pet? 
  (Antigravity found only 3rd-party tags integration, no own QR yet 
  — but Lost Pet Mode and Duman SOS were marked "implemented" in 
  past sprints — investigate before redesign)
- care_events and predictive_insights tables: what feature, used in UI?

### Security Note (from team review)
When pending RLS migration (20260529000002) is pushed pre-launch, 
family-sharing access will activate. This requires a SEPARATE 
security review before pushing — not just a `db push`. Test 
scenarios: family member access matrix (admin/editor/viewer roles).

## Resume Command

`odi stats` first to see current state. Then either:
- `odi brief "<priority 2 breakdown question>"` to ask team
- Or directly ask the user how to proceed
