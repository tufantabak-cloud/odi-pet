# Dashboard Domain — Component Map & Refactoring Tree

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/dashboard`  

## 1. Target Component Hiearchy
```
OwnerDashboardLayout
├── LilacCanvasBackground (#F9F8FF)
├── PageHeader (Title: "Hoş Geldin, Tufan", PetSelectorDropdown)
├── OnboardingProgressCard -> InsightCard (Variant: Purple Tint)
├── DailyAgendaSection -> SectionHeader (Title: "Bugünün Rutinleri")
│   └── AgendaItemCard -> ListRow (Action: Checkbox, Pill: StatusBadge)
├── HealthSummaryGrid
│   ├── VaccineWidget -> HealthCard (Category: cat-vaccine / Sky Blue)
│   ├── ParasiteWidget -> HealthCard (Category: cat-parasite / Mint Green)
│   └── NutritionWidget -> HealthCard (Category: cat-nutrition / Amber)
├── QuickActionRow -> OPButton (Variants: Outline / Soft Tint)
└── FloatingDock -> OPBottomNav (Active State: Magenta #E05397)
```
