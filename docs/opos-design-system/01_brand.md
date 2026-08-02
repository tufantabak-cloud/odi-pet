# OPOS Design System — 01 Brand Identity & Guidelines

> **Status:** GOVERNANCE LOCKED / OFFICIAL BRAND SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Brand Strategy, Visual Persona, Tone of Voice, Asset Ownership  

---

## Purpose
This document defines the official brand identity, visual DNA, and emotional resonance of Odi.Pet. It provides absolute standards for brand presentation across all application screens, marketing collateral, notifications, and PWA manifests, ensuring that Odi.Pet maintains a modern, luxury, pet-centric brand presence.

---

## Scope
Governs:
- Brand philosophy, vision, and positioning.
- Slogan and core brand messaging.
- Brand personality traits and tone of voice.
- Color palette brand association rules.
- Permitted vs. forbidden brand assets and terminology.
- Brand asset folder structure in `/public/brand/`.

---

## Principles

### 1. Pet-First Emotional Connection
Odi.Pet is designed around the unconditional love, health, and well-being of pets (dogs and cats). Every visual element must evoke warmth, reliability, premium care, and effortless technology.

### 2. Modern Tactile Luxury (Soft Glassmorphism)
The brand avoids flat, sterile medical aesthetics as well as childish, overly cartoonish graphics. It strikes a balance with modern tactile luxury: soft glass surfaces, vibrant lilac/purple brand accents, high-contrast typography, and rich depth.

### 3. Absolute Brand Integrity & Compliance
The brand identity is immutable. Placeholder names (`PETPAL`, `FurEver`, `PawCare`, `PetBuddy`), AI-generated generic mascot logos, and ad-hoc visual designs are strictly prohibited. Only verified, frozen brand assets residing in `/public/brand/` are legal.

---

## Brand Architecture & Asset Inventory

### Official Slogan
- **Turkish:** *"Evcil Dostunuzun Akıllı Sağlık & Bakım Asistanı"*
- **English:** *"Smart Health & Care Assistant for Your Companion"*

### Authorized Asset Directory Structure
All brand assets are frozen inside `/public/brand/`:
```
public/brand/
├── logos/
│   ├── odi-logo-primary.svg       (Master Vertical/Full Logo)
│   ├── odi-logo-horizontal.svg    (Horizontal Header Logo)
│   ├── odi-logo-icon.svg          (Standalone Brand Mark / Icon)
│   └── odi-watermark.svg          (Monochrome Background Watermark)
├── app-icons/
│   ├── icon-192x192.png           (PWA Android Main Icon)
│   ├── icon-512x512.png           (PWA Splash/Store Icon)
│   └── apple-touch-icon.png       (iOS Home Screen Icon)
├── illustrations/
│   ├── hero-pet-health.svg        (Health & Vaccine Hero)
│   ├── empty-state-pet.svg        (Zero State Pet Illustration)
│   └── estrus-calendar-hero.svg   (Cycle Tracking Hero)
├── favicon/
│   ├── favicon.ico
│   └── favicon-32x32.png
└── pwa/
    ├── splash-640x1136.png
    └── splash-1242x2688.png
```

---

## Tone of Voice & Language Rules

1. **Language Standard:** All user-facing UI strings must be in clean, natural **Turkish**.
2. **Empathetic & Clear:** Use encouraging, reassuring, and precise language. Avoid overly complex veterinary jargon without accompanying explanatory subtext.
3. **Action-Oriented:** CTAs must state exact benefits (e.g. *"Aşı Takvimini İncele"*, *"Aşı Ekle"*, *"Profil Oluştur"*).
4. **Pet Persona Recognition:** Always address the pet by name and species (e.g. *"Pamuk'un Aşı Takvimi"*, *"Luna'nın Beslenme Planı"*).

---

## Brand Color Associations

| Brand Tier | Primary Color Token | Hex Code | Visual Association & Purpose |
| :--- | :--- | :--- | :--- |
| **Master Brand** | `--color-primary` | `#6D3DF5` | Core interactive actions, primary buttons, brand mark |
| **Brand Deep** | `--color-primary-dark` | `#4E24C8` | Pressed states, dark mode headers, primary text contrast |
| **Brand Soft** | `--color-primary-soft` | `#F2EEFF` | Highlight backgrounds, secondary chips, active states |
| **Health / Medical**| `--color-danger` | `#E4474F` | Critical health alerts, urgent vaccine warnings, SOS |
| **Vaccines** | `--color-info` | `#3B82F6` | Routine immunization schedules, medical logs |
| **Hygiene / Care** | `--color-success` | `#16A87A` | Grooming, parasite tracking, successful records |
| **Nutrition** | `--color-warning` | `#F2A23A` | Food schedules, weight tracking, diet logs |

---

## Usage

- **Header Placement:** Use `odi-logo-horizontal.svg` in main desktop and mobile page headers with a maximum height of `32px` or `40px`.
- **Favicon & PWA:** Ensure PWA manifest (`manifest.json`) references exact icons in `/public/brand/app-icons/`.
- **Watermarks:** Use `odi-watermark.svg` with `5%` opacity for luxury background subtle framing on onboarding screens.

---

## Responsive Behaviour
- **Mobile (<768px):** Header displays compact `odi-logo-icon.svg` or compact horizontal logo (`h-7` / `28px`).
- **Tablet & Desktop (>=768px):** Header displays full `odi-logo-horizontal.svg` (`h-9` / `36px`) alongside navigation links.

---

## Accessibility Notes
- Brand logo images must include explicit `alt="Odi.Pet Logo"` attributes.
- Brand colors must never rely solely on color to convey state; pair with text labels and high-contrast icons.

---

## Examples

### DO
- Use `/public/brand/logos/odi-logo-primary.svg` for main welcome screens.
- Maintain clear whitespace equal to at least 50% of the logo height around all brand marks.

### DON'T
- DO NOT stretch, skew, re-color, or rotate official brand logos.
- DO NOT use unapproved third-party pet icons or stock human imagery.
- DO NOT refer to the application as "PetPal", "PetBuddy", "FurEver", or "PawCare".

---

## Migration Notes
- Any legacy placeholder text or mock logo SVGs found in `src/components/` must be immediately replaced with official `/public/brand/` SVGs.

---

## Future Compatibility
- Brand assets are permanently frozen. Any update to official logos or slogans must be updated in `/public/brand/` and reflected in this document.
