# Pet Detail Domain — OPOS Gap Specification

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/pets/[id]`  

## 1. Gap Summary
| Element | Current Implementation | OPOS Target Standard | Gap Severity |
| :--- | :--- | :--- | :---: |
| Hero Card | Locked Region (`PetHeroCard.tsx`) | Retain locked structure + enforce OPOS glass tokens | Gated |
| Vitals Chips | Generic Gray Chips | `MetricItem` primitive with soft category background | Medium |
| Module Grid Cards | Mixed `rounded-xl shadow` | `HealthCard` / `InsightCard` glass container with 16px radius | High |
| Action Buttons | Standard purple buttons | `OPButton` (`active:scale-[0.98]`) | High |
