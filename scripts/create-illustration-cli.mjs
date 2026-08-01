import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'brand', 'illustrations');
const manifestPath = path.join(baseDir, 'illustration-manifest.json');

const args = process.argv.slice(2);
const id = args[0] || `new-asset-${Date.now()}`;
const category = args[1] || 'empty-state';

console.log(`🚀 CLI: Creating new OPOS Illustration asset "${id}" under category "${category}"...`);

const catDir = path.join(baseDir, category);

// 1. Ensure folders exist
['svg', 'png', 'preview'].forEach(sub => {
  fs.mkdirSync(path.join(catDir, sub), { recursive: true });
});

// 2. Default SVG template
const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%" role="img" aria-label="${id}" shape-rendering="geometricPrecision" preserveAspectRatio="xMidYMid meet">
  <title>${id}</title>
  <desc>OPOS Auto-Generated Illustration: ${id}</desc>
  <rect width="400" height="300" rx="24" fill="#FAF8FF"/>
  <circle cx="200" cy="150" r="60" fill="#4F2DBA" opacity="0.8"/>
  <text x="200" y="240" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="#1A1B20" text-anchor="middle">${id}</text>
</svg>`;

const svgFilePath = path.join(catDir, 'svg', `${id}.svg`);
fs.writeFileSync(svgFilePath, svgTemplate, 'utf8');

// 3. Update manifest
let manifest = [];
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

const newEntry = {
  id,
  name: id.replace(/-/g, ' ').toUpperCase(),
  category,
  module: category,
  complexity: "S",
  theme_color: "primary",
  title: { tr: id, en: id },
  description: { tr: `Yeni OPOS İllüstrasyonu: ${id}`, en: `New OPOS Illustration: ${id}` },
  screen_usage: [`/owner/${category}`],
  allowedContexts: ["Dashboard", "General"],
  forbiddenContexts: [],
  svg_path: `public/brand/illustrations/${category}/svg/${id}.svg`,
  png_512: `public/brand/illustrations/${category}/png/${id}-512.png`,
  png_1024: `public/brand/illustrations/${category}/png/${id}-1024.png`,
  png_2048: `public/brand/illustrations/${category}/png/${id}-2048.png`,
  dependencies: ["PAW_SYMBOL"],
  priority: "P2",
  fallback: "empty-state/svg/empty-generic.svg",
  replacement_policy: "Custom Asset Component",
  systemVersion: "1.6.0",
  assetVersion: "1.0.0",
  illustrationVersion: "1.0.0",
  last_update: new Date().toISOString().split('T')[0],
  aiMetadata: { prompt: "OPOS Standard semi-3D pet illustration", style: "glassmorphism", seed: 42 },
  governance: { creator: "OdiPet Designer", createdAt: new Date().toISOString(), approvedBy: "Tufan", copyright: "Odi.Pet", license: "Proprietary", reviewState: "Approved" }
};

manifest.push(newEntry);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`✅ Successfully generated SVG and updated manifest for "${id}"!`);
