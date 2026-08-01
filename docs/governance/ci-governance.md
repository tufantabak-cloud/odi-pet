# OPOS Phase 5 — CI/CD Governance & Pipeline Policy

## Automated PR Validation Workflow (`.github/workflows/illustration-ci.yml`)
Every Pull Request automatically executes:
1. `npm run check:architecture`
2. `npm run typecheck`
3. `npm run lint`
4. Frozen asset change detection (Fails PR if files under `/public/brand/` are mutated without approval)
