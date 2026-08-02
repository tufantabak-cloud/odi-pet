# AI Vet Domain — Component Map

```
AIVetLayout
├── PageHeader (Title: "Odi AI Veteriner Asistanı")
├── MedicalDisclaimer -> StatusBanner (cat-vet / Indigo)
├── ChatMessageThread
│   ├── UserMessageBubble -> InsightCard (Variant: Primary Soft)
│   └── AIMessageBubble -> InsightCard (Variant: White Glass)
├── QuickPromptRow -> StatusBadge (Interactive)
└── ChatInputBar -> FormField (16px Input Lock, Send OPButton)
```
