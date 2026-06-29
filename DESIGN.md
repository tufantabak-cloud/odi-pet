---
name: Odi.Pet
colors:
  surface: '#FFFFFF'
  surface-dim: '#dad9e0'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e8e7ee'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b20'
  on-surface-variant: '#484554'
  inverse-surface: '#2f3035'
  inverse-on-surface: '#f1f0f7'
  outline: '#797585'
  outline-variant: '#cac4d6'
  surface-tint: '#6244ce'
  primary: '#3800a4'
  on-primary: '#ffffff'
  primary-container: '#4f2dba'
  on-primary-container: '#c0b1ff'
  inverse-primary: '#cbbeff'
  secondary: '#ab276d'
  on-secondary: '#ffffff'
  secondary-container: '#fc6aae'
  on-secondary-container: '#6c0040'
  tertiary: '#755b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba744'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cbbeff'
  on-primary-fixed: '#1d0061'
  on-primary-fixed-variant: '#4a27b5'
  secondary-fixed: '#ffd9e5'
  secondary-fixed-dim: '#ffb0ce'
  on-secondary-fixed: '#3e0022'
  on-secondary-fixed-variant: '#8b0354'
  tertiary-fixed: '#ffdf92'
  tertiary-fixed-dim: '#e9c25d'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#faf8ff'
  on-background: '#1a1b20'
  surface-variant: '#e2e2e9'
  primary-dark: '#3E1EA2'
  primary-soft: '#F2EEFF'
  surface-secondary: '#F0F2F6'
  text-primary: '#161B2A'
  text-secondary: '#697386'
  text-muted: '#9AA3B2'
  border: '#E6E9EF'
  success: '#16A87A'
  warning: '#F2A23A'
  danger: '#E4474F'
  cat-vaccine: '#3B9FE8'
  cat-parasite: '#34C97A'
  cat-care: '#F06292'
  cat-nutrition: '#F59E0B'
  cat-hygiene: '#38BDF8'
  cat-activity: '#F97316'
  cat-health: '#EF4444'
  cat-vet: '#4F46E5'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
  body-base:
    fontFamily: Montserrat
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  body-bold:
    fontFamily: Montserrat
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 22px
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '900'
    lineHeight: 16px
    letterSpacing: 0.1em
  stat-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.01em
  input-field:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  caption:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system for this product is rooted in a "Premium Pet Care Ecosystem" narrative. It balances the emotional warmth of pet ownership with the clinical precision of a high-end health platform. The personality is vibrant, trustworthy, and high-quality, avoiding the sterile coldness of traditional medical apps by using a sophisticated, tinted palette.

### Design Style: Soft Glassmorphism & Tactile Luxury
The aesthetic combines **Minimalism** with **Glassmorphism**. Surfaces are predominantly white and semi-transparent, utilizing heavy backdrop blurs and hairline borders to create depth. This is layered over a specialized "Lilac-Tinted" background to establish a signature brand atmosphere.

**Key Visual Principles:**
- **Tactile Feedback:** Every interaction must feel physical. Elements use an elastic scale compression (`scale-98`) on press to simulate "squishy" physical buttons.
- **Physical Depth:** Depth is achieved through "Tonal Stacking"—floating semi-transparent cards over a tinted canvas with subtle, diffused shadows.
- **Categorical Recognition:** Color is used as a functional tool. Specific modules (Vaccine, Nutrition, etc.) are color-coded to build muscle memory and speed up navigation.

## Colors

The color strategy revolves around the **Lilac-Tinted White (#F9F8FF)** background, which should be applied as a subtle radial gradient to create a luxury feel.

### Primary & Interaction
- **Primary Brand Purple:** Reserved for high-priority CTAs and progress indicators.
- **Secondary Magenta:** Used exclusively for active navigation states in the bottom bar.
- **Premium Gold:** Reserved for PRO features and achievements.

### Domain Categorization
Functional modules are strictly mapped to their colors:
- **Vaccine:** Blue/Sky
- **Nutrition:** Amber/Orange
- **Health:** Red/Rose
- **Vet:** Indigo

Each category color should be used as a triplet: a high-contrast text color for labels, a saturated fill for icons, and a 10% opacity "soft tint" for background accents.

## Typography

This design system uses **Montserrat** exclusively to provide a geometric, trustworthy voice. 

### Critical Implementation Rules:
- **Input Lock:** All text inputs must use a minimum of **16px** font size to prevent automatic iOS browser zooming.
- **Letter Spacing:** Headlines use negative tracking (-0.01em to -0.02em) for a more premium, compact feel. Label-caps use wide tracking (0.1em) for structural clarity.
- **Line Heights:** Use a tight 1.15x ratio for headers and a more relaxed 1.5x ratio for body copy to ensure readability during longer medical logs.

## Layout & Spacing

The layout follows an **8px Baseline Rhythm** to ensure clean vertical alignment across all screen sizes.

### Grid Strategy
- **Mobile (< 768px):** Single-column fluid grid with 16px side margins. Fixed Bottom Navigation bar (72px height) with safe-area padding.
- **Tablet/Desktop:** Multi-column grid (2 or 3 columns) with a maximum content width of 1440px. Left sidebar navigation (256px) is fixed.
- **Touch Targets:** A minimum clickable target of **44x44px** is strictly enforced for all interactive elements.
- **Safe Areas:** A permanent bottom padding of 128px (`pb-32`) is required on all mobile scroll views to prevent the Bottom Navigation from obscuring content.

## Elevation & Depth

Visual hierarchy is conveyed through a "Glassmorphic Stack" rather than traditional heavy shadows.

- **Background:** The base layer is the lilac-tinted white canvas.
- **Surface Layer:** Cards and containers use semi-transparent white (90% opacity) with a `backdrop-blur-xl` filter. 
- **Outlines:** Every elevated surface must have a thin 1px solid white border (`border-white/20`) to catch "light" and define edges.
- **Shadows:** Use extremely diffused, low-opacity shadows. 
    - *Default:* `0 4px 20px -2px rgba(15, 23, 42, 0.04)`
    - *Hover/Floating:* `0 12px 32px -4px rgba(15, 23, 42, 0.08)`

## Shapes

In accordance with the "Design Constitution," a strict **16px border radius** is applied to all primary components including buttons, cards, inputs, and profile widgets.

- **Standard Elements:** All cards, buttons, and form fields use a 16px (`1rem`) radius.
- **Special Components:** Mobile bottom sheets use a 28px top-only radius to create a soft, native-feeling "drawer" effect. 
- **Circular Elements:** Avatars and status indicators use a full `rounded-full` (9999px) radius.

## Components

### Buttons
- **Primary:** Solid Brand Purple (#4F2DBA) with white text. Apply a soft purple glow shadow. Transition to a darker purple on hover.
- **Secondary:** Transparent background with a 1px border (#E6E9EF). On hover, fill with Primary-Soft (#F2EEFF).
- **Interactions:** Always include `active:scale-[0.98]` with a 300ms transition for a tactile feel.

### Cards
- Floating cards must use the semi-transparent glass style defined in the Elevation section. 
- Headers inside cards should use the specific category color associated with the module (e.g., Green for Parasite tasks).

### Inputs & Forms
- Backgrounds are semi-transparent white with 16px radius.
- On focus, the border animates to 50% opacity Brand Purple with a 4px glow ring of the same color.

### Navigation
- **Bottom Bar:** 4-column layout. The active icon and label use the Magenta-Pink (#E05397) color and a slight scale lift.
- **Floating SOS:** A bottom-right red circle (#EF4444) with a continuous double-ring pulse animation.

### Domain Modules
- **Pet Slider:** A horizontal swiping container with 200x200px profile cards.
- **Smart Task Wizard:** Multi-step overlays. Selection tiles must highlight with the specific category color border when active.