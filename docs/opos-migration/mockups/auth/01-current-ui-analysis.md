# Auth Screen (Login / Register) — Current UI Analysis

> **Screen:** Auth & Onboarding (`/login`, `/register`, `/reset-password`)  
> **Evaluation Mode:** VISUAL AUDIT ONLY  

---

## 1. Inconsistencies & Deficiencies Identified

| UI Element | Current Implementation | OPOS Standard Violation | Impact / Severity |
| :--- | :--- | :--- | :---: |
| **Typography** | System sans / mixed Inter (`text-sm font-medium`, `text-xs`) | Violates Montserrat typography rule & 16px iOS font lock | High |
| **Color Tokens** | Direct hex codes `#3800A4`, `#4F2DBA`, `#111827` | Hardcoded colors instead of OPOS semantic tokens | Medium |
| **Spacing Rhythm** | `p-4`, `py-3`, `gap-3` non-8px rhythm | Violates 8px vertical baseline grid | Medium |
| **Border Radius** | `rounded-lg` (8px) & `rounded-xl` (12px) mixed | Violates strict **16px** (`rounded-2xl`) card/button radius rule | High |
| **Glassmorphism Elevation** | Solid white background `bg-white shadow-md` | Lacks semi-transparent glass filter (`bg-white/90 backdrop-blur-xl border-white/20`) | High |
| **Button Physics** | Generic CSS hover opacity transition | Lacks `active:scale-[0.98]` tactile press spring physics | Medium |
| **Form Inputs** | `text-sm` (14px) input fields | Causes automatic iOS Safari viewport zooming on focus | Critical |
| **Biometric CTA** | Custom icon button without category tint | Lacks standard OPOS tactile luxury styling | Low |
