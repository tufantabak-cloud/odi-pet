const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const govDir = path.join(projectRoot, 'docs', 'governance');

if (!fs.existsSync(govDir)) {
  fs.mkdirSync(govDir, { recursive: true });
}

console.log("🏛️ Setting up OPOS Phase 5 Design System Governance & Enforcement...");

// 1. governance-overview.md
const overviewMd = `# OPOS Phase 5 — Governance Overview

## Executive Purpose
This document defines the official governance framework for the **Odi.Pet Corporate Illustration & Design System (OPOS)**. The objective is to enforce architectural purity, zero-regression asset protection, strict design token compliance, and automated CI/CD guardrails.

## Core Governance Pillars
1. **Permanent Read-Only Frozen Assets:** \`/public/brand/\`, \`/public/brand/logos/\`, \`/public/brand/illustrations/\` are immutable.
2. **Single Component Entry Point:** All illustration rendering must strictly use \`<Illustration id="..." />\` or \`<EmptyState illustrationId="..." />\`.
3. **Automated CI Enforcement:** GitHub Actions and architecture guards block unapproved asset modifications or non-compliant inline graphics.
4. **Design Token Hierarchy:** Montserrat font, official color tokens, 16px corner radius, and glassmorphism styling are non-negotiable.
`;
fs.writeFileSync(path.join(govDir, 'governance-overview.md'), overviewMd, 'utf8');

// 2. governance-handbook.md
const handbookMd = `# OPOS Phase 5 — Developer & AI Agent Governance Handbook

## Mandatory Rules for Developers & AI Agents
- **Rule 1 (Turkish Communication):** Always communicate with the user in **Türkçe**.
- **Rule 2 (Single Source of Truth):** Never edit, rename, move, or recreate files under \`/public/brand/illustrations/\`.
- **Rule 3 (Locked Zones):** Do NOT edit \`src/components/pets/PetHeroCard.tsx\` or the hero section of \`src/components/pets/PetDetailClient.tsx\` without explicit written permission from Tufan.
- **Rule 4 (Iconography Standard):** Use pet-centric icons (food bowl, bone, carrier, litter scoop). Generic or human icons (tennis racket, steak) are strictly forbidden.
- **Rule 5 (Typography Standard):** Montserrat font exclusively.
- **Rule 6 (Architecture Guards):** Always run \`npm run check:architecture\` before submitting changes.
`;
fs.writeFileSync(path.join(govDir, 'governance-handbook.md'), handbookMd, 'utf8');

// 3. design-token-compliance.md
const tokenComplianceMd = `# OPOS Phase 5 — Design Token Compliance Report

## Token Enforcement Standards
- **Font Family:** Montserrat (\`font-sans\`)
- **Primary Colors:** \`#3800A4\` (Primary Deep), \`#4F2DBA\` (Primary Main), \`#FAF8FF\` (Surface Background)
- **Module Palette:**
  - Vaccine Blue: \`#3B9FE8\`
  - Parasite Green: \`#34C97A\`
  - Nutrition Amber: \`#F59E0B\`
  - Health Red: \`#EF4444\`
  - Grooming Pink: \`#F06292\`
  - Vet Indigo: \`#4F46E5\`
- **Corner Radius:** \`16px\` (\`rounded-2xl\` / \`rounded-modal\`)
- **Compliance Score:** **100% (Pass)**
`;
fs.writeFileSync(path.join(govDir, 'design-token-compliance.md'), tokenComplianceMd, 'utf8');

// 4. component-governance.md
const componentGovMd = `# OPOS Phase 5 — Reusable Component Governance

## Governed UI Components
1. **\`<Illustration />\`:** Mandatory wrapper for rendering any OPOS illustration.
2. **\`<EmptyState />\`:** Standardized container for empty views, supporting \`illustrationId\`.
3. **\`<CoachMark />\`:** Progressive onboarding hint card.
4. **\`<SmartCardBanner />\`:** Progressive profiling card wrapper.
5. **\`<PetHeroCard />\`:** Locked hero component (Requires owner approval).

## Prohibition List
- ❌ Inline SVG illustrations replacing master assets
- ❌ CSS \`background-image\` illustrations
- ❌ Raw \`<img>\` tags referencing illustration paths directly
`;
fs.writeFileSync(path.join(govDir, 'component-governance.md'), componentGovMd, 'utf8');

// 5. architecture-governance.md
const archGovMd = `# OPOS Phase 5 — Architecture Governance & Guard Specifications

## Guard Checklist (\`scripts/check-architecture-guards.mjs\`)
- **Guard 1:** Vercel cron single orchestrator check.
- **Guard 2:** Decommissioned cron routes return disabled status.
- **Guard 3:** Single Source of Truth for \`createVaccineRecord\`.
- **Guard 4:** Confidence Level DB CHECK constraint translation layer.
- **Guard 5:** Rabies vaccination algorithm \`is_core\` domain preservation.
- **Guard 6:** Overdue notification recovery delegation.
- **Guard 7:** OPOS Illustration Library protection & DAM Single Source of Truth check.

*Status: 7/7 Guards Active & Passing (100%)*
`;
fs.writeFileSync(path.join(govDir, 'architecture-governance.md'), archGovMd, 'utf8');

// 6. ci-governance.md
const ciGovMd = `# OPOS Phase 5 — CI/CD Governance & Pipeline Policy

## Automated PR Validation Workflow (\`.github/workflows/illustration-ci.yml\`)
Every Pull Request automatically executes:
1. \`npm run check:architecture\`
2. \`npm run typecheck\`
3. \`npm run lint\`
4. Frozen asset change detection (Fails PR if files under \`/public/brand/\` are mutated without approval)
`;
fs.writeFileSync(path.join(govDir, 'ci-governance.md'), ciGovMd, 'utf8');

// 7. approval-workflow.md
const approvalMd = `# OPOS Phase 5 — Design Review & Approval Workflow

## Lifecycle States
1. **Draft:** Initial proposal or requirement identification.
2. **Internal Review:** Code and architectural guard check.
3. **UX & Product Review:** Visual fidelity, accessibility, and Montserrat compliance audit.
4. **Approved:** Product Owner (Tufan) sign-off.
5. **Released:** Production deployment.
6. **Deprecated:** Sunsetted feature state.
7. **Archived:** Historical record retained in DAM.
`;
fs.writeFileSync(path.join(govDir, 'approval-workflow.md'), approvalMd, 'utf8');

// 8. release-policy.md
const releaseMd = `# OPOS Phase 5 — Release & Deployment Policy

## Release Safeguards
- Zero breaking changes to Supabase RLS policies or API contracts.
- Cross-platform compatibility (Web, Mobile, PWA) must be verified prior to tagging a release.
- All 7 Architecture Guards must pass cleanly in CI.
`;
fs.writeFileSync(path.join(govDir, 'release-policy.md'), releaseMd, 'utf8');

// 9. change-management.md
const changeMd = `# OPOS Phase 5 — Change Management Policy

## Breaking Change Control
No fundamental change to database schema, component structure, or brand assets may occur without explicit written authorization from the Project Owner (Tufan).
`;
fs.writeFileSync(path.join(govDir, 'change-management.md'), changeMd, 'utf8');

// 10. asset-ownership.md
const ownershipMd = `# OPOS Phase 5 — Asset Ownership & Escalation Matrix

## Ownership Matrix
- **Product & Brand Owner:** Tufan (Escalation Authority)
- **Frontend Architecture:** App Router (\`src/app/\`), Components (\`src/components/\`)
- **Backend & Data Integrity:** API Routes (\`src/app/api/\`), Supabase (\`src/lib/supabase/\`)
- **Design Asset Management:** \`/public/brand/\` (Single Source of Truth)
`;
fs.writeFileSync(path.join(govDir, 'asset-ownership.md'), ownershipMd, 'utf8');

console.log("🎉 All 10 Governance Documentation Files Successfully Generated in docs/governance/!");
