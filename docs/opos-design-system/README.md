# OPOS Design System — Official Master Index & Sitemap

> **Status:** GOVERNANCE LOCKED / OFFICIAL SINGLE SOURCE OF TRUTH  
> **Authority Level:** MAXIMUM  
> **Product:** Odi Pet — Can Dostunun Yaşam Platformu | "Sevgiyle Bak Sağlıkla Büyüt"  

---

## Overview
Welcome to the official **OPOS (Odi.Pet Design System)** documentation repository. This directory (`docs/opos-design-system/`) is the executable, unchallengeable **SINGLE SOURCE OF TRUTH** for every visual, aesthetic, structural, and component decision across the entire Odi.Pet web, mobile (PWA), and desktop application ecosystem.

All production code (`/src`) is explicitly stripped of visual authority and serves exclusively as a container for Business Logic, DOM Hierarchy, Routing, Accessibility relationships, Information Architecture, and State Management.

---

## Documentation Sitemap & Navigation Index

| Index | Document Title | Primary Topic / Scope |
| :---: | :--- | :--- |
| **00** | [`00_SINGLE_SOURCE_OF_TRUTH.md`](./00_SINGLE_SOURCE_OF_TRUTH.md) | Master System Governance & Authority Lock |
| **01** | [`01_brand.md`](./01_brand.md) | Brand Strategy, Identity & Tone of Voice |
| **02** | [`02_logo.md`](./02_logo.md) | Master Logo Specifications & Clear Space |
| **03** | [`03_typography.md`](./03_typography.md) | Font Families, Hierarchy & 16px iOS Input Lock |
| **04** | [`04_color-tokens.md`](./04_color-tokens.md) | Semantic Color Palette, Domain Soft Tints & Dark Mode |
| **05** | [`05_spacing.md`](./05_spacing.md) | 8px Baseline Grid & Safe-Area Paddings |
| **06** | [`06_grid.md`](./06_grid.md) | Layout Containers & 12-Column Grid Architecture |
| **07** | [`07_radius.md`](./07_radius.md) | Corner Radii Scale & Curvature Geometry |
| **08** | [`08_elevation.md`](./08_elevation.md) | Ambient Drop Shadows & Z-Index Layering Stack |
| **09** | [`09_glass-system.md`](./09_glass-system.md) | Soft Glassmorphism, Backdrop Blur & Lilac Canvas |
| **10** | [`10_buttons.md`](./10_buttons.md) | `OPButton` Specifications & Tactile Compression Physics |
| **11** | [`11_inputs.md`](./11_inputs.md) | `OPInput`, Form Controls & Focus Glow Rings |
| **12** | [`12_cards.md`](./12_cards.md) | `OPGlassCard`, `PetHeroCard` & Health Widgets |
| **13** | [`13_navigation.md`](./13_navigation.md) | Floating Mobile Dock `BottomNav` & Desktop `SideNav` |
| **14** | [`14_forms.md`](./14_forms.md) | `OPFormField` & Progressive Profiling Architecture |
| **15** | [`15_empty-states.md`](./15_empty-states.md) | `EmptyState`, `ErrorState` & Skeleton Loaders |
| **16** | [`16_icons.md`](./16_icons.md) | `OPIcon` & Pet-Centric Iconography Rules |
| **17** | [`17_illustrations.md`](./17_illustrations.md) | `OPIllustration` & Semi-3D Brand Illustrations |
| **18** | [`18_motion.md`](./18_motion.md) | Easing Curves, Micro-Animations & Reduced Motion |
| **19** | [`19_dark-mode.md`](./19_dark-mode.md) | Dark Luxury Palette & Midnight Navy Canvas |
| **20** | [`20_accessibility.md`](./20_accessibility.md) | WCAG 2.1 AA Compliance & 44px Touch Target Rule |
| **21** | [`21_responsive.md`](./21_responsive.md) | Viewport Breakpoints (320px to 1920px) |
| **22** | [`22_component-library.md`](./22_component-library.md) | Master OP Primitive Component Catalog |
| **23** | [`23_page-templates.md`](./23_page-templates.md) | Screen Blueprints (Auth, Dashboard, Pet Detail) |
| **24** | [`24_design-rules.md`](./24_design-rules.md) | 10 Master OPOS Rules & Pre-Delivery Validation |
| **25** | [`25_do-not.md`](./25_do-not.md) | Comprehensive Blacklist Catalogue of Forbidden Patterns |

---

## Mandatory Execution Protocol for AI Agents & Developers

1. **Preload Phase:** Index all 26 OPOS specification documents before commencing any UI refactoring or screen design task.
2. **Decoupled Execution:** Preserve all underlying business logic, Supabase RPC hooks, state management, and accessibility DOM structures from `/src`.
3. **OPOS Upgrade:** Replace 100% of legacy visual styling with official OP primitives and token utilities.
4. **Validation Phase:** Run the 6-question self-validation checklist in `24_design-rules.md`.
5. **Approval Protocol:** Request human approval (Tufan) prior to finalizing screen deployment.
