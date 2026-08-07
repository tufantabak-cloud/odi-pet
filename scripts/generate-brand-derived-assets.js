/**
 * Generates derived brand assets from the FROZEN official sources under
 * public/brand/ (never written to). Outputs go to public/generated/ (new,
 * non-frozen) and public/assets/ (existing splash slot).
 *
 * Deterministic, no hand-drawn content: every pixel comes from an official
 * frozen source, resized/recolored-matched/composited only. Re-run this
 * script any time the frozen sources change.
 *
 *   node scripts/generate-brand-derived-assets.js
 */
const sharp = require('sharp');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'public/brand');
const OUT_GENERATED = path.join(ROOT, 'public/generated');
const OUT_ASSETS = path.join(ROOT, 'public/assets');

// Colors sampled directly from the official frozen assets (see audit notes
// in docs/brand/LOGO_USAGE.md) — not invented values.
const ICON_GRADIENT_LIGHT = '#6824AD'; // sampled from odi-icon-512.png background fill
const ICON_GRADIENT_DARK = '#4C1596';  // sampled from odi-icon-512.png background fill
const SPLASH_SOLID = '#480376';        // matches SplashScreen.tsx wrapper + manifest.json theme_color

function gradientSquareSvg(size, c1, c2) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/></svg>`
  );
}

function solidRectSvg(w, h, c) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="${w}" height="${h}" fill="${c}"/></svg>`
  );
}

/**
 * odi-splash-logo.png (and its monochrome siblings) are flattened PNGs with
 * a baked-in solid background — no alpha. Compositing them as-is onto a
 * differently-colored canvas leaves a visible two-tone seam. This de-flattens
 * a white-glyph-on-solid-color asset into a true white-on-transparent PNG by
 * using each pixel's own min(r,g,b) as its alpha (white -> opaque, solid bg
 * -> transparent; anti-aliased edges fall in between, preserving smoothing).
 */
async function whiteOnTransparent(inputPath) {
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < data.length; i += channels, p += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let alpha = Math.min(r, g, b);
    if (alpha < 20) alpha = 0;   // background noise floor -> fully transparent
    if (alpha > 235) alpha = 255; // glyph core -> fully opaque
    out[p] = 255;
    out[p + 1] = 255;
    out[p + 2] = 255;
    out[p + 3] = alpha;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Bounding box of the opaque rounded-square+glyph inside odi-icon-512.png,
// excluding its own white drop-shadow margin (detected via chroma scan).
const ICON_CROP = { left: 34, top: 34, width: 444, height: 444 };

async function buildMaskableIcon() {
  const size = 512;
  // Android adaptive-icon safe zone: foreground content at 66% of canvas
  // (matches Android's own 72dp/108dp foreground guideline).
  const safeContent = Math.round(size * 0.66); // 338px

  const bg = await sharp(gradientSquareSvg(size, ICON_GRADIENT_LIGHT, ICON_GRADIENT_DARK))
    .png()
    .toBuffer();

  const glyph = await sharp(path.join(BRAND, 'app-icons/odi-icon-512.png'))
    .extract(ICON_CROP)
    .resize(safeContent, safeContent, { fit: 'contain' })
    .toBuffer();

  const offset = Math.round((size - safeContent) / 2);

  await sharp(bg)
    .composite([{ input: glyph, left: offset, top: offset }])
    .png()
    .toFile(path.join(OUT_GENERATED, 'odi-icon-512-maskable.png'));

  console.log('✓ odi-icon-512-maskable.png (512x512, 66% safe-zone content)');
}

async function buildOgImage() {
  const width = 1200;
  const height = 630;
  const logoHeight = 560; // leaves ~35px vertical breathing room top/bottom
  const bg = await sharp(solidRectSvg(width, height, SPLASH_SOLID)).png().toBuffer();

  const transparentLockup = await whiteOnTransparent(path.join(BRAND, 'logos/splash/odi-splash-logo.png'));
  const logo = await sharp(transparentLockup).resize({ height: logoHeight }).toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const left = Math.round((width - logoMeta.width) / 2);
  const top = Math.round((height - logoHeight) / 2);

  await sharp(bg)
    .composite([{ input: logo, left, top }])
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT_GENERATED, 'odi-og-image-1200x630.jpg'));

  console.log('✓ odi-og-image-1200x630.jpg');
}

async function buildSplashFrames() {
  // Phase 1 — icon-only mark reveal (matches SplashScreen.tsx phase 1, ~800ms)
  const s1 = await sharp(path.join(ROOT, 'public/assets/splash1.jpg')).metadata();
  const w1 = s1.width, h1 = s1.height;

  const bg1 = await sharp(solidRectSvg(w1, h1, SPLASH_SOLID)).png().toBuffer();
  const iconContentSize = Math.round(w1 * 0.52);
  const glyph1 = await sharp(path.join(BRAND, 'app-icons/odi-icon-512.png'))
    .extract(ICON_CROP)
    .resize(iconContentSize, iconContentSize, { fit: 'contain' })
    .toBuffer();
  await sharp(bg1)
    .composite([{ input: glyph1, left: Math.round((w1 - iconContentSize) / 2), top: Math.round((h1 - iconContentSize) / 2) }])
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT_ASSETS, 'splash1.jpg'));
  console.log(`✓ splash1.jpg (${w1}x${h1}, icon-only reveal)`);

  // Phase 2 — full lockup with wordmark + tagline (held ~4.2s)
  const s2meta = await sharp(path.join(ROOT, 'public/assets/splash2.jpg')).metadata();
  const w2 = s2meta.width, h2 = s2meta.height;
  const bg2 = await sharp(solidRectSvg(w2, h2, SPLASH_SOLID)).png().toBuffer();
  const lockupWidth = Math.round(w2 * 0.72);
  const transparentLockup2 = await whiteOnTransparent(path.join(BRAND, 'logos/splash/odi-splash-logo.png'));
  const lockup = await sharp(transparentLockup2).resize({ width: lockupWidth }).toBuffer();
  const lockupMeta = await sharp(lockup).metadata();
  await sharp(bg2)
    .composite([{ input: lockup, left: Math.round((w2 - lockupMeta.width) / 2), top: Math.round((h2 - lockupMeta.height) / 2) }])
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT_ASSETS, 'splash2.jpg'));
  console.log(`✓ splash2.jpg (${w2}x${h2}, full lockup + tagline)`);
}

async function main() {
  await buildMaskableIcon();
  await buildOgImage();
  await buildSplashFrames();
  console.log('\nAll derived brand assets generated.');
}

main().catch((e) => {
  console.error('Generation failed:', e);
  process.exit(1);
});
