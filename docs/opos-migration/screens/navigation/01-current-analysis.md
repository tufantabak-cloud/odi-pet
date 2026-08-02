# Navigation & Overlays Domain — Current Architecture & Audit

> **Primary Components:** `BottomNav.tsx`, `SideNav.tsx`, `FloatingSOS.tsx`, `FormModal.tsx`, `Modal.tsx`, `SmartBackButton.tsx`  

## 1. Audit Findings
- Core navigation structure across Mobile Bottom Dock, Desktop Sidebar, SOS Floating Button, and Modal Overlays.
- BottomNav uses floating dock style with Magenta active state (`#E05397`).
- Floating SOS button uses double-ring pulse animation. Needs OPOS tactile scale binding.
- Drawers and Modals require 16px desktop radius and 28px mobile top-only drawer radius.
