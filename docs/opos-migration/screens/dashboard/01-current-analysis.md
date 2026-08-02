# Dashboard Domain — Current Architecture & Audit

> **Route:** `/owner/dashboard`  
> **Primary Components:** `src/app/owner/dashboard/page.tsx`, `src/components/dashboard/*`, `DashboardPendingReferral.tsx`, `OnboardingProgressCard.tsx`  

## 1. Architectural Structure
The Owner Dashboard serves as the command center for pet parents. It contains:
- Pet selector swipe bar & quick switcher.
- Daily action agenda & upcoming routine tasks.
- Health quick-access widget cards (Vaccine status, Parasite status, Nutrition stats).
- Promotional & onboarding progress cards (`OnboardingProgressCard`).
- Fixed bottom dock navigation (`BottomNav`).

## 2. Visual & Architectural Audit Findings
- **Card Containers**: Currently uses plain white cards `bg-white shadow-sm rounded-xl` without glassmorphic backdrop blur or `border-white/20` subtle stroke.
- **Typography**: Header title uses `text-2xl font-bold text-gray-900` instead of `display-lg-mobile` Montserrat tracking rules.
- **Buttons**: Action triggers use varying purple shades (`#3800a4` vs `#4f2dba`) and lack `active:scale-[0.98]` tactile press physics.
- **Category Triples**: Task badges use generic Tailwind colors instead of standardized OPOS category triplets (`cat-vaccine`, `cat-nutrition`, `cat-health`).
