# Odi.Pet OPOS Mandatory Visual Approval Workflow & Pipeline

> **Status:** MANDATORY GOVERNANCE PROTOCOL  
> **Enforcement Level:** STRICT / GATED EXECUTION  
> **Project Owner Approval:** Required at Step 4 and Step 7 by **Tufan**  

---

## 1. Governance Pipeline Flowchart

```
[1. Existing Screen Audit]
          │
          ▼
[2. OPOS Gap Analysis]
          │
          ▼
[3. High-Fidelity Mockup Generation]
          │
          ▼
[4. Project Owner Approval (Tufan)] ◄─── (Stop execution until explicitly approved)
          │
          ▼
[5. Multi-Breakpoint Responsive Specs]
  ├── Mobile (375px)
  ├── Tablet (768px)
  └── Desktop (1440px)
          │
          ▼
[6. Accessibility & Contrast Review]
          │
          ▼
[7. Formal Design Gate Sign-Off]
          │
          ▼
[8. Component-by-Component Implementation]
          │
          ▼
[9. Automated Visual Regression Test (Playwright)]
          │
          ▼
[10. Functional & Business Logic E2E Test]
          │
          ▼
[11. Final Production Acceptance & Deployment]
```

---

## 2. Pipeline Phase Specifications

### Phase 1: Audit & Gap Identification
- **Step 1: Existing Screen Audit**: Document exact DOM node structure, classes, spacing, colors, and typography currently used on target route.
- **Step 2: OPOS Gap Analysis**: Formally map every non-compliant container, button, text element, input, and icon against `DESIGN.md`.

### Phase 2: Mockup & Design Approval Gate
- **Step 3: High-Fidelity Mockup Generation**: Create complete visual preview mockups of the target screen adhering 100% to OPOS tokens.
- **Step 4: User Approval (Tufan)**: Present high-fidelity mockup to Tufan. **NO CODE MAY BE WRITTEN BEFORE EXPRESS APPROVAL.**
- **Step 5: Multi-Breakpoint Responsive Specs**: Generate explicit layout specifications for Mobile (375px minimum), Tablet (768px), and Desktop (1440px max-width).
- **Step 6: Accessibility & Contrast Review**: Check WCAG 2.1 AA contrast ratios (minimum 4.5:1 for body text), touch target sizing (minimum 44x44px), and ARIA landmark structure.
- **Step 7: Formal Design Gate Sign-Off**: Freeze mockup specs and record visual baseline.

### Phase 3: Gated Implementation & Verification
- **Step 8: Component-by-Component Implementation**: Migrate UI elements using atomic primitive replacement (`OPButton`, `InsightCard`, `FormField`, etc.) without altering business logic hooks.
- **Step 9: Automated Visual Regression Test**: Execute Playwright visual comparison tests against approved mockups to ensure 0px unexpected layout drift.
- **Step 10: Functional & Business Logic E2E Test**: Execute Vitest & Playwright E2E suites to guarantee zero regression on data fetching, Supabase RLS, or state updates.
- **Step 11: Final Production Acceptance**: Confirm total compliance with OPOS design standards and release screen to production.

---

## 4. Mandatory Brand Compliance Gate (Kalıcı Marka Kapısı)
Before any mockup or screen is submitted for approval, the **Brand Compliance Gate** automatically verifies:
- [x] **Official Logo Verification:** Only assets from `/public/brand/` are used (`odi-icon-256.png`, `odi-logo-horizontal.png`, `odi-logo-primary.png`, `splash.png`).
- [x] **Official Tagline:** Exact phrase `"Sevgiyle Bak, Sağlıkla Büyüt"`.
- [x] **Zero Placeholder/AI Brand:** Strict check to ensure `PETPAL`, `FurEver`, `PetBuddy`, `PawCare`, AI logos, or AI colors **DO NOT EXIST**.
- [x] **Strict Failure Action:** If ANY non-compliant item is detected, execution **STOPS IMMEDIATELY** and a Brand Compliance Failure Report is returned instead of mockups.

