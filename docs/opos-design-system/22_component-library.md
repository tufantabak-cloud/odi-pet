# OPOS Design System — 22 Official OP Component Library Reference

> **Status:** GOVERNANCE LOCKED / OFFICIAL COMPONENT SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Master Catalog of All Authorized OP Primitives & Composite Components  

---

## Purpose
This document provides the master technical catalog of all official OPOS UI components. It documents every authorized primitive, its prop interface specifications, visual composition, variant tokens, accessibility bindings, and exact usage context across the Odi.Pet product suite.

---

## Scope
Governs:
- Master OP Component Catalog:
  - `OPScreen` (Root Layout Container)
  - `OPGlassCard` (Frosted Glass Container)
  - `OPButton` (Tactile Action Trigger)
  - `OPInput` (16px iOS Form Field)
  - `OPFormField` (Accessible Label & Error Wrapper)
  - `OPCheckbox` / `OPSwitch` (Form Select Controls)
  - `OPBadge` / `StatusBadge` (Pill Status Chip)
  - `OPModal` (Centered Desktop Dialog)
  - `OPBottomSheet` (Mobile Bottom Drawer)
  - `OPNavigation` / `BottomNav` / `SideNav` (App Navigation)
  - `OPIcon` (Pet-Centric Vector Icon Wrapper)
  - `OPIllustration` (Semi-3D SVG Illustration Wrapper)
  - `OPTypography` (Unified Text Hierarchy Renderer)
  - `OPAvatar` (Pet Profile Photo Avatar with Species Badge)
  - `OPDivider` (Glass Section Divider)
  - `OPToast` (Top System Alert Banner)

---

## Principles

### 1. Mandatory Component Reuse
Component invention or direct construction of ad-hoc HTML visual blocks is forbidden. All screens MUST be composed using components from this official library.

### 2. Strict Prop API Encapsulation
OP Components expose clean, strongly typed TypeScript prop interfaces. Styling variants are controlled exclusively via predefined enum props (`variant="primary"`, `size="md"`), preventing inline style leakage.

---

## Master Component Specifications

### 1. `OPScreen` (Root View Wrapper)
- **Purpose:** Wraps whole pages; provides lilac canvas backdrop, status bar integration, and layout gutters.
- **Props:** `title?: string; showHeader?: boolean; showNav?: boolean; children: React.ReactNode`

### 2. `OPGlassCard` (Surface Container)
- **Purpose:** Primary frosted glass surface container for content modules.
- **Props:** `variant?: 'default' | 'hero' | 'insight' | 'interactive'; padding?: 'sm' | 'md' | 'lg'`

### 3. `OPButton` (Action Control)
- **Purpose:** Primary action trigger featuring tactile compression physics.
- **Props:** `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; isLoading?: boolean`

### 4. `OPInput` (Form Input)
- **Purpose:** 16px iOS locked text field with glass surface and focus glow.
- **Props:** `label?: string; error?: string; helperText?: string; leftIcon?: React.ReactNode`

### 5. `OPBottomSheet` (Mobile Drawer)
- **Purpose:** Accessible bottom drawer sheet for mobile interactions.
- **Props:** `isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode`

### 6. `OPModal` (Desktop Overlay Dialog)
- **Purpose:** Centered overlay dialog with backdrop blur and focus trap.
- **Props:** `isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode`

### 7. `OPBadge` (Status Chip)
- **Purpose:** Displays pet health, vaccine, and cycle status indicators.
- **Props:** `variant?: 'success' | 'warning' | 'error' | 'primary' | 'health'; label: string`

### 8. `OPAvatar` (Pet Avatar)
- **Purpose:** Displays pet profile photo with species badge (Cat/Dog icon overlay) and status ring.
- **Props:** `src?: string; name: string; species: 'dog' | 'cat'; size?: 'sm' | 'md' | 'lg'`

---

## Component Matrix Reference Table

| Component | Target File Location | Core Variant Tokens | Primary Usage |
| :--- | :--- | :--- | :--- |
| **`OPScreen`** | `src/components/ui/primitives/` | `bg-bg-main min-h-screen` | Page layout container |
| **`OPGlassCard`**| `src/components/ui/primitives/` | `bg-white/90 backdrop-blur-xl rounded-card` | Medical logs, cards, widgets |
| **`OPButton`** | `src/components/ui/primitives/Button.tsx` | `rounded-btn h-12 px-7 active:scale-[0.98]` | Action triggers |
| **`OPInput`** | `src/components/ui/primitives/FormField.tsx` | `rounded-input h-12 px-4 text-base` | Text inputs |
| **`OPBadge`** | `src/components/ui/primitives/Badge.tsx` | `rounded-full text-[13px] font-bold` | Status indicators |
| **`OPBottomSheet`**| `src/components/ui/FormModal.tsx` | `rounded-t-[28px] bg-white/95` | Mobile action drawers |
| **`OPModal`** | `src/components/ui/Modal.tsx` | `rounded-[28px] bg-white/95 backdrop-blur-2xl`| Desktop dialog overlays |

---

## Usage

- Import primitives directly from `@/components/ui/primitives`:
```tsx
import { OPButton, OPGlassCard, OPBadge } from '@/components/ui/primitives';
```

---

## Responsive Behaviour

- All OP components include built-in responsive breakpoint adapters (e.g. `OPModal` renders as a bottom sheet on mobile and a centered dialog on desktop).

---

## Accessibility Notes
- Every component in the library enforces internal ARIA bindings, focus indicators, and screen reader announcements.

---

## Examples

### DO
- Reuse official OP library primitives across all app modules.

### DON'T
- DO NOT construct ad-hoc button or card elements with custom inline Tailwind classes.

---

## Migration Notes
- All legacy component files must be mapped to their OP library primitive equivalents as specified in this catalog.
