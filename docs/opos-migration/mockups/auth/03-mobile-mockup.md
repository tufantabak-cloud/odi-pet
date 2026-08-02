# Auth Screen — Mobile High-Fidelity Mockup & Pixel Specifications

> **Screen:** Auth & Onboarding (`/login`, `/register`, `/reset-password`)  
> **Target Devices:** iPhone SE (320px), Android (360px), iPhone 16 (390px), Pro Max (430px)  
> **Visual Render:** ![Mobile 390 Mockup](file:///c:/Odi.Pet/docs/opos-migration/mockups/auth/opos-mobile-390.png)  

---

## 1. Pixel-Level Measurement Specifications

| UI Element | Property | Exact Value | Token / CSS Rule |
| :--- | :--- | :--- | :--- |
| **Root Canvas** | Background | `#F9F8FF` | Lilac Tinted Background |
| **Glass Card** | Fill Opacity | 90% White (`rgba(255,255,255,0.90)`) | `bg-white/90` |
| **Glass Card** | Backdrop Blur | 20px | `backdrop-blur-xl` |
| **Glass Card** | Border Stroke | 1px Solid White (`rgba(255,255,255,0.20)`) | `border border-white/20` |
| **Glass Card** | Radius | 16px | `rounded-2xl` |
| **Glass Card** | Elevation Shadow | `0 4px 20px -2px rgba(15,23,42,0.04)` | `shadow-sm` Soft Blur |
| **Glass Card** | Outer Padding | 24px (`p-6`) | `p-6` (8px Baseline Rhythm) |
| **Header Logo** | Height / Width | 48px × 48px | Semi-3D Brand Badge |
| **Header Title** | Font / Weight / Size | Montserrat / 800 (Bold) / 28px | `display-lg-mobile` (-0.02em) |
| **Header LineHeight** | Line Height | 36px | Tight 1.25x Ratio |
| **Input Fields** | Height | 48px (Touch Target Enforced) | `h-12` |
| **Input Fields** | Font Size (iOS Lock) | **16px** (Prevents Safari Zoom) | `input-field` Primitive |
| **Input Fields** | Border & Focus | 1px Solid `#E6E9EF` $\rightarrow$ 4px `#4F2DBA`/10 Glow | `focus:ring-4` |
| **Primary Button** | Height / Fill | 48px / Solid `#4F2DBA` Brand Purple | `bg-[#4F2DBA]` |
| **Primary Button** | Radius & Text | 16px / `#FFFFFF` Montserrat 700 (Bold) | `rounded-2xl` |
| **Primary Button** | Press Motion | Elastic scale compression (`scale-[0.98]`) | `active:scale-[0.98] transition-300` |

---

## 2. Visual Render Asset Links
- **iPhone SE (320px):** [opos-mobile-320.png](file:///c:/Odi.Pet/docs/opos-migration/mockups/auth/opos-mobile-320.png)
- **iPhone 16 (390px):** [opos-mobile-390.png](file:///c:/Odi.Pet/docs/opos-migration/mockups/auth/opos-mobile-390.png)
- **Tokens Annotation Overlay:** [tokens-overlay.png](file:///c:/Odi.Pet/docs/opos-migration/mockups/auth/tokens-overlay.png)
