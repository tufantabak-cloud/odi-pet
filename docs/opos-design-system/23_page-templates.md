# OPOS Design System — 23 Standard Page Templates & Screen Layout Specs

> **Status:** GOVERNANCE LOCKED / OFFICIAL PAGE TEMPLATES SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Architecture Patterns for Auth, Dashboard, Pet Detail, Medical, Settings Views  

---

## Purpose
This document defines the official page layout templates for all core screen types in Odi.Pet. It establishes rigid structural blueprints for Authentication, Main Dashboard, Pet Detail, Medical Logs, Forms, and Settings screens to ensure 100% architectural and visual consistency.

---

## Scope
Governs:
- **Authentication & Onboarding Screen Template** (`/login`, `/register`, `/onboarding`)
- **Main Dashboard Screen Template** (`/dashboard`)
- **Pet Detail & Health Overview Screen Template** (`/owner/pets/[id]`)
- **Medical & Vaccine Tracker Screen Template** (`/owner/pets/[id]/vaccines`)
- **Settings & Profile Screen Template** (`/settings`)

---

## Principles

### 1. Template Structure Consistency
Every page in Odi.Pet follows a strict vertical layer order:
1. Top Application Header / Breadcrumb (`PageHeader`)
2. Master Hero Card / Summary Section (`PetHeroCard` or Section Banner)
3. Grid Content Layout (Main Feed + Side Widgets)
4. Navigation Anchor (Mobile Floating Dock `BottomNav` or Fixed `SideNav`)

### 2. Standardized Layout Containers
Auth pages use `max-w-md` (`440px`), form wizards use `max-w-2xl` (`640px`), and main dashboard views use `max-w-7xl` (`1280px`).

---

## Page Template Specifications

### 1. Authentication & Onboarding Screen Template
```
+-------------------------------------------------------+
|  Lilac Canvas Background (bg-main + radial glow)      |
|                                                       |
|   +-----------------------------------------------+   |
|   |  Official Master Logo (odi-logo-primary.svg)  |   |
|   +-----------------------------------------------+   |
|                                                       |
|   +-----------------------------------------------+   |
|   |  Auth OPGlassCard (max-w-md, rounded-card)   |   |
|   |  - Header: Welcome Title + Subtitle           |   |
|   |  - Body: OPFormField (16px iOS locked inputs) |   |
|   |  - Action: OPButton (variant="primary", md)   |   |
|   +-----------------------------------------------+   |
+-------------------------------------------------------+
```

### 2. Main Dashboard Screen Template
```
+-------------------------------------------------------+
| Top PageHeader (Horizontal Logo + Notification Bell)  |
+-------------------------------------------------------+
| Pet Selector Bar / Multi-Pet Avatar Scroll Dock       |
+-------------------------------------------------------+
| PetHeroCard (Hero overview, age scale, quick actions) |
+-------------------------------------------------------+
| 12-Column Layout Grid (gap-6)                         |
| +-------------------------------+ +-----------------+ |
| | Main Health Feed (col-span-8) | | Sidebar (span-4)| |
| | - Upcoming Vaccine Card       | | - AI Insight    | |
| | - Parasite Control Card       | | - Weight Widget | |
| | - Recent Medical Log Card     | | - Quick SOS     | |
| +-------------------------------+ +-----------------+ |
+-------------------------------------------------------+
| Floating Mobile Bottom Dock (BottomNav)               |
+-------------------------------------------------------+
```

### 3. Pet Detail & Medical Tracker Screen Template
```
+-------------------------------------------------------+
| PageHeader (SmartBackButton + "Pamuk'un Aşı Takvimi")  |
+-------------------------------------------------------+
| Domain Status Summary Banner (Vaccine count, Due tag) |
+-------------------------------------------------------+
| Action Bar (OPButton "Aşı Ekle" + Filter Chips)        |
+-------------------------------------------------------+
| Stacked List View (OPGlassCard per Medical Record)    |
| - Header: Category Icon Avatar (Blue) + Title + Date  |
| - Body: Vet name, Batch number, Status Badge          |
| - Action: Edit / Certificate View Button              |
+-------------------------------------------------------+
```

---

## Usage

- Build new app screens by adopting the exact template layout structure documented above.

---

## Responsive Behaviour

- **Mobile Viewports (<768px):** Templates collapse to 1 column. Bottom dock grounds primary navigation.
- **Desktop Viewports (>=1024px):** Templates activate 12-column grid split view with fixed left SideNav.

---

## Accessibility Notes
- Every page template must contain a single `<h1>` tag located inside the main header or hero section.

---

## Examples

### DO
- Adhere to the established page template structures for all new module views.

### DON'T
- DO NOT invent arbitrary page layouts with missing headers or un-aligned containers.

---

## Migration Notes
- Refactor all existing view pages in `/src/app/(app)/` to conform to these official page templates.
