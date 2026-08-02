# Auth Domain — Component Map

```
AuthPageLayout
├── BrandHeaderBanner
├── AuthCard -> InsightCard
│   ├── EmailField -> FormField (16px Input Lock)
│   ├── PasswordField -> FormField (16px Input Lock)
│   ├── SubmitCTA -> OPButton (Primary)
│   └── BiometricCTA -> BiometricLogin
└── OAuthRow -> OPButton (Variant: Outline)
```
