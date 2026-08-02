# Pet Detail Domain — Current Architecture & Audit

> **Route:** `/owner/pets/[id]`  
> **Primary Components:** `src/app/owner/pets/[id]/page.tsx`, `PetHeroCard.tsx`, `PetDetailClient.tsx`  
> **Locked Region Warning:** `PetHeroCard.tsx` and hero cover sections in `PetDetailClient.tsx` are **LOCKED REGIONS**. No code changes without explicit owner approval.

## 1. Architectural Overview
The Pet Detail view is the core pet management hub displaying pet vitals, health indicators, vaccine schedules, nutrition stats, and quick links.

## 2. Audit Findings
- **Hero & Cover Card**: Utilizes custom hero glass effect. Must remain untouched during UI updates unless specifically authorized.
- **Module Grid Cards**: Health, Vaccine, Nutrition, and Parasite summary cards currently use mixed shadow effects and border radiuses.
- **Vitals Metrics**: Weight, age, and breed chips use generic `bg-gray-100` badges rather than OPOS `MetricItem` primitives.
