# Vaccines Domain — Component Map & Migration Plan

```
VaccinePageLayout
├── PageHeader (Title: "Aşı Takvimi ve Karnesi")
├── ProtocolStatusBanner -> StatusBanner (Variant: Info / cat-vaccine)
├── VaccineTimeline
│   └── VaccineCard -> HealthCard (Category: cat-vaccine)
└── AddVaccineFAB -> OPButton (Primary CTA)
```

## Migration Execution
- Sprint Target: Sprint 4.
- Implement `HealthCard` container with Sky Blue category triplet.
- Verify booster date calculation logic is unchanged.
