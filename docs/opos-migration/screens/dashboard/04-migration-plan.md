# Dashboard Domain — Step-by-Step Migration Plan

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/dashboard`  
> **Planned Sprint:** Sprint 6 (Core Portal Migration)  

## 1. Migration Steps
1. **Mockup Sign-off**: Obtain approval for Desktop, Tablet, and Mobile high-fidelity mockups from Tufan.
2. **Background Canvas Alignment**: Apply lilac radial gradient `#F9F8FF` to root layout wrapper.
3. **Card Container Refactoring**: Replace ad-hoc white cards in `DashboardPendingReferral` and `OnboardingProgressCard` with `InsightCard` glass containers.
4. **Action Controls**: Replace custom purple buttons with `OPButton` and bind `active:scale-[0.98]` tactile press physics.
5. **Bottom Dock Clearance**: Ensure `pb-32` bottom padding is enforced on mobile scroll container.
6. **Regression Verification**: Execute Playwright visual regression suite against approved mockups.
