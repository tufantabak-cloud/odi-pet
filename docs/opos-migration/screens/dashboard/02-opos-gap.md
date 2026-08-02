# Dashboard Domain — OPOS Gap Specification

> **Target Standard:** OPOS Design System  
> **Route:** `/owner/dashboard`  

## 1. Deficiencies & Gap Items
| Element | Current Implementation | OPOS Target Standard | Gap Severity |
| :--- | :--- | :--- | :---: |
| Background Canvas | Static white / light gray `#F3F4F6` | Lilac-tinted radial background `#F9F8FF` | High |
| Header Greeting | `text-2xl font-bold text-gray-900` | `display-lg-mobile` Montserrat -0.02em tracking | Medium |
| Module Cards | `bg-white rounded-xl shadow-sm border` | `InsightCard` glass container (`bg-white/90 backdrop-blur-xl border-white/20 rounded-2xl`) | High |
| Action Buttons | `bg-purple-600 rounded-lg text-sm` | `OPButton` (`bg-[#4F2DBA] rounded-2xl h-12 active:scale-[0.98]`) | High |
| Status Badges | Custom inline `span` tags | `StatusBadge` primitive with category color triples | Medium |
| Safe Bottom Padding | `pb-20` | Enforced `pb-32` for mobile bottom dock clearance | Critical |
