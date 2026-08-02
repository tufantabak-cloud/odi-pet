# Pet Detail Domain — Step-by-Step Migration Plan

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/pets/[id]`  
> **Target Sprint:** Sprint 5 (Critical Core Migration)  

## 1. Execution Steps
1. **Locked Region Check**: Verify no modifications are requested for `PetHeroCard.tsx`.
2. **Vitals Refactoring**: Refactor vital chips into `MetricItem` primitives.
3. **Module Cards**: Update Health, Vaccine, and Nutrition cards to `HealthCard` glass containers.
4. **Visual Approval**: Request Tufan sign-off on visual mockups prior to code commitment.
