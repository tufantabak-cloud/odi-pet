# Health Domain — Component Map

```
HealthLayout
├── PageHeader (Title: "Sağlık Geçmişi ve Tıbbi Kayıtlar")
├── VitalsOverview -> InsightCard
├── MedicalTimeline -> OPTimeline
│   └── TimelineItem -> TimelineChip (Variant: cat-health)
└── ExportReportCTA -> OPButton (Icon: Download)
```
