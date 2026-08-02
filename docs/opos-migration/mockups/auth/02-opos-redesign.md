# Auth Screen — OPOS Redesign Specification & Rationale

> **Screen:** Auth & Onboarding (`/login`, `/register`, `/reset-password`)  

---

## 1. Redesign Rationale & Principles

1. **Lilac-Tinted Glass Canvas**: Replace generic white or dark background with OPOS `#F9F8FF` background featuring a subtle radial purple glow (`bg-[#F9F8FF]`).
2. **16px iOS Font Lock**: Enforce `16px` (`text-base`) input typography on all email and password fields to completely eliminate iOS viewport zoom bugs.
3. **Soft Glassmorphism Card**: Enclose auth forms in a elevated glass container (`bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]`).
4. **Tactile Primary CTAs**: Primary action ("Giriş Yap" / "Kayıt Ol") styled with solid `#4F2DBA` brand purple, 16px radius, and elastic `active:scale-[0.98]` compression physics.
5. **Brand Loyalty Logo System**: Integrate frozen semi-3D brand badge without altering logo vectors.
