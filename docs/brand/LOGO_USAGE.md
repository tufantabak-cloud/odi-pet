# Odi.Pet — Logo Usage Guide

> **Status:** ACTIVE
> **Official family:** [`public/brand/logos/`](../../public/brand/logos) — **frozen, read-only** (see [`docs/governance/asset-ownership.md`](../governance/asset-ownership.md)). Never edit files in this tree; only read from it.
> **Derived assets:** [`public/generated/`](../../public/generated) — programmatically produced FROM the frozen sources (never hand-edited); regenerate with `node scripts/generate-brand-derived-assets.js`.

This document is the numeric/practical logo spec. **No prior OPOS document defined these rules** — they are derived from the frozen asset structure itself and from platform standards (Android adaptive-icon spec, Open Graph spec) and are marked as such below.

---

## 1. The official family

| Folder | Contents | Use for |
|---|---|---|
| `logos/icon/`, `app-icons/` | Icon-only mark (cat+dog silhouette, no wordmark), sizes 16–1024px + SVG | App icons, favicons, any small/square in-app usage (headers, avatars, empty states) — **this is what belongs everywhere in the live UI today** |
| `logos/primary/` | Full lockup: icon + "Odi Pet" wordmark + tagline, horizontal/vertical/square | Marketing pages, large surfaces, print |
| `logos/monochrome/` | Single-color (black or white) full lockup | Overlay on a background where the multicolor gradient would clash |
| `logos/watermark/` | White lockup for dark photographic backgrounds | Overlay watermark on photos/dark hero imagery |
| `logos/splash/` | Full lockup pre-composed on solid purple | Splash/loading screens, OG-image source |
| `logos/social/` | Square avatar (profile picture format) + cover (vector) | Social profile pictures; cover needs a raster export before use (see §5) |
| `favicon/` | 16/32/48px PNG + `.ico` | Browser tab icon |

## 2. Variant selection rule

**Default to the icon-only mark** (`app-icons/odi-icon-*.png`) for any square container ≤ 96px — headers, auth screens, empty states, notification icons, PWA icons. Reserve the **primary/monochrome/watermark full lockup** for large, standalone brand moments (splash, marketing, OG image) where the wordmark and tagline have room to read clearly. Never mix: don't place the icon-only mark where a full lockup is expected (e.g. a marketing hero) or vice versa (e.g. squeezing the full lockup into a 40px header slot).

## 3. Minimum size *(inferred — no authoritative numeric spec exists)*

| Variant | Minimum size | Why |
|---|---|---|
| Icon-only mark | 24×24 px | Below this the cat/dog silhouette detail (ears, tail swirl) starts to lose legibility |
| Full lockup (wordmark + tagline) | 160 px width | The cursive tagline is the first element to become illegible; 160px is the practical floor observed across the frozen assets |

Live app usages today range 40–96px, all using the icon-only mark — comfortably above its floor.

## 4. Clearspace & background rules *(inferred from the frozen asset structure)*

- Keep clearspace ≥ the icon's own corner-radius on all sides when placing it in a container (i.e. don't crop or crowd the rounded corners).
- The icon-only mark's background is a purple gradient card baked into the asset — place it on white/light surfaces or transparent; don't recolor it.
- For dark/photographic backgrounds, use the **watermark** (white) variant, not the color icon — the color icon's own card can clash or become illegible against another dark color.
- Never stretch or distort aspect ratio. Always resize proportionally.

## 5. Derived assets — what and why

Two live surfaces need a shape the frozen library doesn't ship natively. Both are produced by [`scripts/generate-brand-derived-assets.js`](../../scripts/generate-brand-derived-assets.js), reading only official frozen pixels — no hand-drawn content:

1. **`public/generated/odi-icon-512-maskable.png`** — a true Android maskable icon. The frozen `odi-icon-*.png` files have their own rounded-square card baked to the image edge with no safe margin; an adaptive-icon mask (circle/squircle) would clip it. This derived version scales the official icon to **66% of the canvas** (Android's own adaptive-icon foreground convention — same ratio as the 72dp/108dp guideline) centered on a full-bleed gradient sampled directly from the icon's own colors (`#6824AD` → `#4C1596`), so any mask shape only ever crops into brand-colored background, never into the glyph or into blank space.
2. **`public/generated/odi-og-image-1200x630.jpg`** — the standard Open Graph/Twitter card size. No raster cover image existed in `logos/social/` (only a vector `.svg`, which most social crawlers — notably Facebook's — don't render for `og:image`). Built by de-flattening the official splash lockup (`logos/splash/odi-splash-logo.png`) into a transparent-background white cutout, then centering it on the app's own established splash purple (`#3E1EA3`, matching `SplashScreen.tsx` and `manifest.json theme_color`) at 1200×630.
3. **`public/assets/splash1.jpg` / `splash2.jpg`** (regenerated, not new paths) — the two-phase splash sequence previously showed a mark absent from the frozen family. Phase 1 (800ms, `SplashScreen.tsx`) now shows the icon-only mark; phase 2 (~4.2s hold) shows the full lockup with tagline — both on the same `#3E1EA3` field so the crossfade between phases has no color shift.

**Regeneration:** if any frozen source asset changes, re-run `node scripts/generate-brand-derived-assets.js` from the repo root (requires `sharp`, already a project dependency) to rebuild all four outputs deterministically.

## 6. Known gaps

- No authoritative numeric OPOS logo spec document existed prior to this file — §3–4 are inferred, not sourced.
- The maskable icon and OG image reuse the frozen icon/splash-logo pixels as-is (resized/recolored-background only); they are not new creative work, but they are also not hand-verified by a designer against every Android launcher shape.
- `docs/brand/` is a new location; if a future official design-system doc set is introduced, reconcile this file into it rather than maintaining two sources.

## 7. Do / Don't

**Do:** use the icon-only mark for anything ≤96px · keep the mark on its own light or brand-purple field · resize proportionally · regenerate derived assets from the script when the source changes.

**Don't:** recolor or gradient-shift the official mark · use `public/logo.webp` or any other non-`public/brand/`-sourced logo (removed — see git history) · hand-edit files under `public/brand/` · hand-edit files under `public/generated/` (edit the generator script instead) · stretch/distort the mark.
