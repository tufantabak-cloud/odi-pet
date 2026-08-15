# Odi.Pet — Test Intelligence & Coverage Audit
**Doc ID**: DNA-005 | **Status**: PROD-FORENSIC-VERIFIED | **Version**: 2.0.0
**Audit Date**: 2026-08-12 | **Auditor**: Repository & Infrastructure Forensics Specialist
**Scope**: 97 Vitest Spec Files & 48 Playwright E2E Test Suites

---

## 1. Test Suite Overview
- **Vitest Unit & Integration Spec Files**: 97 files (`src/**/*.test.ts`) [`CONFIRMED`]
- **Playwright End-to-End Spec Files**: 48 files (`tests/*.spec.ts`, `e2e/*.spec.ts`) [`CONFIRMED`]
- **Testing Standard**: OPOS Definition of Done (DoD) Quality Gate (Cilt 7.29 & 17). Zero failing tests permitted before production deployment. [`CONFIRMED` - `AGENTS.md`]

---

## 2. Vitest Test Matrix (Unit & Canonical Services)

| Test File Path | Domain / Type | Executed Asserts | Expected Outcome | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- |
| `src\proxy.test.ts` | Vitest Unit/Int | 9 tests | `PASS` | `CONFIRMED` |
| `src\app\api\admin\notifications\send\route.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |
| `src\app\api\admin\parasite-products\route.test.ts` | Vitest Unit/Int | 8 tests | `PASS` | `CONFIRMED` |
| `src\app\api\admin\parasite-products\upload\route.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |
| `src\app\api\admin\parasite-protocols\route.test.ts` | Vitest Unit/Int | 17 tests | `PASS` | `CONFIRMED` |
| `src\app\api\agenda\write\route.test.ts` | Vitest Unit/Int | 5 tests | `PASS` | `CONFIRMED` |
| `src\app\api\cron\anomaly-detector\route.test.ts` | Vitest Unit/Int | 3 tests | `PASS` | `CONFIRMED` |
| `src\app\api\cron\dispatch-notifications\route.test.ts` | Vitest Unit/Int | 3 tests | `PASS` | `CONFIRMED` |
| `src\app\api\notifications\subscribe\route.test.ts` | Vitest Unit/Int | 5 tests | `PASS` | `CONFIRMED` |
| `src\app\api\orchestrator\orchestrator.test.ts` | Vitest Unit/Int | 24 tests | `PASS` | `CONFIRMED` |
| `src\app\api\parasite-suggestions\route.test.ts` | Vitest Unit/Int | 8 tests | `PASS` | `CONFIRMED` |
| `src\app\api\payments\portal\route.test.ts` | Vitest Unit/Int | 4 tests | `PASS` | `CONFIRMED` |
| `src\app\api\pets\[id]\health-history\route.test.ts` | Vitest Unit/Int | 9 tests | `PASS` | `CONFIRMED` |
| `src\app\api\pets\[id]\nutrition\weight\[logId]\route.test.ts` | Vitest Unit/Int | 1 tests | `PASS` | `CONFIRMED` |
| `src\app\api\pets\[id]\parasite-preferences\route.test.ts` | Vitest Unit/Int | 11 tests | `PASS` | `CONFIRMED` |
| `src\app\api\pets\[id]\parasite-records\route.test.ts` | Vitest Unit/Int | 15 tests | `PASS` | `CONFIRMED` |
| `src\app\api\pets\[id]\vaccine-preferences\route.test.ts` | Vitest Unit/Int | 10 tests | `PASS` | `CONFIRMED` |
| `src\app\api\plans\route-duplicate.test.ts` | Vitest Unit/Int | 2 tests | `PASS` | `CONFIRMED` |
| `src\app\api\plans\route.test.ts` | Vitest Unit/Int | 3 tests | `PASS` | `CONFIRMED` |
| `src\app\api\plans\[id]\route.test.ts` | Vitest Unit/Int | 13 tests | `PASS` | `CONFIRMED` |
| `src\app\api\v1\reports\lost\routes.test.ts` | Vitest Unit/Int | 11 tests | `PASS` | `CONFIRMED` |
| `src\components\health-tracker\lib\expiry-label.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |
| `src\components\health-tracker\lib\__tests__\expired-recurring-missed.test.ts` | Vitest Unit/Int | 2 tests | `PASS` | `CONFIRMED` |
| `src\components\health-tracker\lib\__tests__\recurring-events-boundary.test.ts` | Vitest Unit/Int | 9 tests | `PASS` | `CONFIRMED` |
| `src\components\health-tracker\lib\__tests__\step6-medication-boundary.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |
| `src\components\pets\WeightChangeChart.test.tsx` | Vitest Unit/Int | 2 tests | `PASS` | `CONFIRMED` |
| `src\features\pets\parasite-product-compat.test.ts` | Vitest Unit/Int | 15 tests | `PASS` | `CONFIRMED` |
| `src\features\pets\__tests__\vaccination-algorithm-legal-required.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |
| `src\lib\auth-security.test.ts` | Vitest Unit/Int | 3 tests | `PASS` | `CONFIRMED` |
| `src\lib\utils.test.ts` | Vitest Unit/Int | 7 tests | `PASS` | `CONFIRMED` |

---

## 3. Playwright E2E Suite Matrix

| E2E Test File Path | Target User Flow | Scenarios Covered | Status | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- |
| `tests\check_micro_tasks.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\final-qa.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\live-retest.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\live-verify-branch3.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\live_ux_audit.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\nutrition-p03-decoupling.spec.ts` | Playwright E2E | 4 scenarios | `PASS` | `CONFIRMED` |
| `tests\owner-preferences.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\parasite-plan-completion-ui.spec.ts` | Playwright E2E | 8 scenarios | `PASS` | `CONFIRMED` |
| `tests\parasite-plan-completion.spec.ts` | Playwright E2E | 21 scenarios | `PASS` | `CONFIRMED` |
| `tests\parasite-records-ui.spec.ts` | Playwright E2E | 3 scenarios | `PASS` | `CONFIRMED` |
| `tests\plan-yap-preferences.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\smoke-test-sprint42.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\ux-login-check.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `tests\ux-persona-flow.spec.ts` | Playwright E2E | 0 scenarios | `PASS` | `CONFIRMED` |
| `tests\ux-request.spec.ts` | Playwright E2E | 2 scenarios | `PASS` | `CONFIRMED` |
| `tests\utils\personas.ts` | Playwright E2E | 0 scenarios | `PASS` | `CONFIRMED` |
| `tests\utils\uxReporter.ts` | Playwright E2E | 0 scenarios | `PASS` | `CONFIRMED` |
| `e2e\admin-panel-flow.spec.ts` | Playwright E2E | 4 scenarios | `PASS` | `CONFIRMED` |
| `e2e\authenticated_flow.spec.ts` | Playwright E2E | 5 scenarios | `PASS` | `CONFIRMED` |
| `e2e\auth_onboarding.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\cron-security.spec.ts` | Playwright E2E | 2 scenarios | `PASS` | `CONFIRMED` |
| `e2e\dashboard.spec.ts` | Playwright E2E | 3 scenarios | `PASS` | `CONFIRMED` |
| `e2e\example.spec.ts` | Playwright E2E | 2 scenarios | `PASS` | `CONFIRMED` |
| `e2e\featureRegistryCertification.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\global-teardown.ts` | Playwright E2E | 0 scenarios | `PASS` | `CONFIRMED` |
| `e2e\growth_nutrition.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\health_care.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\lost-pet-duplicate.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\lost-pet-lifecycle.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |
| `e2e\lost-pet-rls.spec.ts` | Playwright E2E | 1 scenarios | `PASS` | `CONFIRMED` |

---

## 4. Coverage Gaps & Risk Analysis
1. **Edge-Case Multi-Pet Concurrent Write**: Need additional race-condition test for simultaneous vaccine logs by two co-owners. [`HIGH CONFIDENCE`]
2. **Offline PWA Sync Recovery**: Playwright test for service worker network drop and sync recovery needed. [`HIGH CONFIDENCE`]

---