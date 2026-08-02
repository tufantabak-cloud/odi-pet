# Odi.Pet OPOS Component Gap Analysis

> **Status:** AUDITED / READ-ONLY MIGRATION SPECIFICATION  
> **Objective:** Map all current ad-hoc, custom, and legacy UI elements to standard OPOS primitives.  

---

## 1. System-Wide Component Mapping Table

| Current Implementation | Target OPOS Component | Component Type | Complexity | Est. Reuse % | Refactoring Strategy |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `button` / purple `<div>` | `OPButton` | Action Primitive | Medium | 95% | Replace ad-hoc button classes with `OPButton` variant props (`variant="primary\|secondary\|outline\|ghost\|danger"`). |
| `div` with glass CSS | `HealthCard` / `InsightCard` | Surface Container | Low | 90% | Wrap card content in `InsightCard` or domain-specific `HealthCard` container with `backdrop-blur-xl`. |
| Inline Status `span` | `StatusBadge` | Feedback Chip | Low | 88% | Standardize status indicators using `StatusBadge` with domain tint triples (`cat-vaccine`, `cat-parasite`, etc.). |
| Custom Modal Divs | `FormModal` / `OPDialog` | Overlay | Medium | 85% | Migrate custom backdrop modals to accessible `FormModal` or primitive `OPDialog` with 16px/28px radius. |
| Custom Text Fields | `FormField` / `OPInput` | Form Primitive | Medium | 92% | Enforce 16px iOS font lock, label tracking, and focus ring via `FormField`. |
| Custom Skeletons | `Skeleton` | Loading State | Low | 95% | Replace pulse divs with `Skeleton` primitives. |
| Custom Page Headers | `PageHeader` | Layout Header | Low | 85% | Replace custom subheaders with `PageHeader` (title, subtitle, action slot, back button). |
| Custom Section Headers | `SectionHeader` | Layout Header | Low | 90% | Standardize section titles with `SectionHeader` and action link slot. |
| Custom List Rows | `ListRow` | Content Container | Low | 85% | Standardize key-value and actionable rows with `ListRow` primitive. |
| Custom Metric Blocks | `MetricItem` | Data Widget | Low | 88% | Wrap stats and vitals in `MetricItem` primitive. |
| Custom Category Chips | `TimelineChip` | Indicator | Low | 85% | Standardize timeline events and status tags with `TimelineChip`. |
| `FloatingSOS` | `OPFAB` (SOS Variant) | Floating Action | High | 75% | Retain custom double-pulse animation while inheriting OPOS tactile touch physics and elevation tokens. |
| `BottomNav` | `OPBottomNav` | Navigation | High | 80% | Standardize floating dock container, active magenta state, and safe-area padding (`pb-32`). |
| Custom Empty Layouts | `EmptyState` | State Feedback | Low | 95% | Standardize zero-state illustration, headline, description, and action CTA button via `EmptyState`. |
| Custom Error Strips | `ErrorState` | State Feedback | Low | 95% | Standardize retry action and error banner visual styling via `ErrorState`. |

---

## 2. Detailed Component Gap Specification

### 2.1 Buttons (`OPButton`)
- **Current State:** Buttons across views use varying classes like `bg-[#4F2DBA] rounded-full px-4 py-2 text-white font-bold`, `bg-purple-600 rounded-xl`, or `border border-purple-200`.
- **Target OPOS Standard (`OPButton`):**
  - **Primary**: `bg-[#4F2DBA] text-white rounded-2xl h-12 px-6 font-semibold active:scale-[0.98] transition-all shadow-[0_4px_14px_0_rgba(79,45,186,0.39)]`
  - **Secondary**: `bg-[#F2EEFF] text-[#3800A4] rounded-2xl h-12 px-6 font-semibold active:scale-[0.98] transition-all`
  - **Outline**: `border border-[#E6E9EF] bg-transparent text-[#161B2A] rounded-2xl h-12 px-6 font-semibold active:scale-[0.98]`
  - **Touch Target**: Minimum 44x44px enforce.

### 2.2 Glass Cards (`HealthCard` & `InsightCard`)
- **Current State:** Plain `bg-white rounded-xl p-4 shadow-sm` or `bg-white/80 backdrop-blur-md border border-gray-100`.
- **Target OPOS Standard:**
  - `bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]`
  - Header icons styled with category soft tint triples (10% bg opacity, saturated icon fill, high contrast label).

### 2.3 Form Fields (`FormField`)
- **Current State:** Direct `<input className="w-full p-2 border rounded text-sm" />`.
- **Target OPOS Standard:**
  - Enforced `fontSize: 16px` (`text-base`) to prevent iOS auto-zoom.
  - Background `bg-white/80 backdrop-blur-sm border border-[#E6E9EF] rounded-2xl h-12 px-4`.
  - Focus state: `focus:border-[#4F2DBA] focus:ring-4 focus:ring-[#4F2DBA]/10 transition-all`.

### 2.4 Modals & Bottom Sheets (`FormModal`)
- **Current State:** Custom fixed `z-50` overlay wrappers with non-standard animations and close buttons.
- **Target OPOS Standard:**
  - Desktop: Centered modal with 16px radius, `bg-white/95 backdrop-blur-2xl border border-white/20`.
  - Mobile: Bottom drawer sheet with `rounded-t-[28px]`, pull handle bar, and focus lock.
