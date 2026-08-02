# Auth Screen — Atomic Component Breakdown & Overlay Map

> **Screen:** Auth & Onboarding (`/login`, `/register`, `/reset-password`)  
> **Visual Render:** ![Component Overlay Diagram](file:///c:/Odi.Pet/docs/opos-migration/mockups/auth/component-overlay.png)  

---

## 1. Full Atomic Component Hierarchy

```
OPScreen (Root Layout Wrapper / #F9F8FF)
│
├── BrandHeaderLogo
│   ├── Semi3DBadge (48px Icon)
│   ├── Title: "Odi.Pet" (Montserrat 28px -0.02em)
│   └── Subtitle: "Evcil Dostunuzun Akıllı Dünyası" (Montserrat 14px)
│
├── OPGlassContainer (bg-white/90 backdrop-blur-xl 16px radius border-white/20)
│   │
│   ├── SegmentedTabControl
│   │   ├── TabItem: "Giriş Yap" (Active Pill: bg-[#F2EEFF] text-[#3800A4])
│   │   └── TabItem: "Kayıt Ol" (Inactive: text-[#697386])
│   │
│   ├── FormField: Email
│   │   ├── LabelCaps: "E-POSTA ADRESİ" (Montserrat 12px CAPS 0.1em tracking)
│   │   ├── InputWrapper (Height 48px, bg-white/80, 16px radius)
│   │   └── IconPrefix: EmailSVG (20px fill-[#697386])
│   │
│   ├── FormField: Password
│   │   ├── LabelCaps: "ŞİFRE" (Montserrat 12px CAPS 0.1em tracking)
│   │   ├── InputWrapper (Height 48px, bg-white/80, 16px radius)
│   │   ├── IconPrefix: LockSVG (20px fill-[#697386])
│   │   └── ToggleVisibilitySuffix: EyeSVG
│   │
│   ├── ForgotPasswordLink (Montserrat 13px Right Alignment text-[#6244CE])
│   │
│   ├── PrimaryButton: OPButton
│   │   ├── Label: "GİRİŞ YAP" (Montserrat 15px Bold)
│   │   └── InteractionState (Normal: #4F2DBA, Pressed: scale-[0.98])
│   │
│   ├── Divider (Text: "ya da", 1px Border #E6E9EF)
│   │
│   ├── BiometricCTA: OPButton
│   │   ├── Icon: PasskeyID (20px)
│   │   └── Label: "Face ID / Touch ID ile Giriş" (Variant: Outline)
│   │
│   └── OAuthButtonRow
│       ├── GoogleLoginCTA (Variant: Outline)
│       └── AppleLoginCTA (Variant: Outline)
│
└── FooterLegalLinks
    ├── Link: "KVKK Aydınlatma Metni"
    └── Link: "Kullanım Koşulları"
```
