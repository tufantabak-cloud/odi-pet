# Pet Detail Domain — Component Map

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/pets/[id]`  

```
PetDetailLayout
├── PetHeroCard (LOCKED REGION — Requires Explicit Tufan Approval)
├── VitalsRow
│   ├── WeightMetric -> MetricItem
│   ├── AgeMetric -> MetricItem (Scaled: Yavru/Yetişkin/Yaşlı)
│   └── BreedMetric -> MetricItem
├── QuickModuleGrid
│   ├── VaccineCard -> HealthCard (cat-vaccine)
│   ├── ParasiteCard -> HealthCard (cat-parasite)
│   ├── NutritionCard -> HealthCard (cat-nutrition)
│   └── CareCard -> HealthCard (cat-care)
└── ActionDock -> OPButton (Primary CTA: "Rutin Ekle")
```
