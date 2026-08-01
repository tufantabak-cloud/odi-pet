# OPOS Illustration Source & Design Asset Management (DAM)

## Figma & Design System Governance
- **Figma Design File Link:** `https://figma.com/file/odipet-corporate-illustrations-master`
- **Component Library Architecture:** Atomic Design System (Primitives -> Shared Assets -> Master Scenes)
- **Vector Export Preset:** SVG 1.1, UTF-8, Geometric Precision, Relative viewBox, Preserved Aspect Ratio.

## Export Governance
1. **SVG Master:** Export with `shape-rendering="geometricPrecision"` and `role="img"`.
2. **PNG Bundles:** Automatic 512px, 1024px, 2048px @ 300 DPI sRGB transparent exports.
3. **i18n Alignment:** Update `illustration-manifest.json` with `title` & `description` localized keys.
