# Navigation Domain — OPOS Gap & Component Map

| Element | Current | Target OPOS Component |
| :--- | :--- | :--- |
| Mobile Bottom Bar | Floating dock (`BottomNav.tsx`) | `OPBottomNav` (Enforce `pb-32` scroll clearance) |
| Desktop Sidebar | 256px Fixed (`SideNav.tsx`) | `OPSideNav` (Enforce Montserrat & 16px active pill) |
| Floating SOS | Red pulse button (`FloatingSOS.tsx`) | `OPFAB` (SOS Variant with tactile compression) |
| Modal Wrapper | Custom backdrop | `FormModal` / `OPDialog` (28px mobile sheet radius) |
