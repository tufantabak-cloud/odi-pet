const fs = require('fs');

function addImports(file, importsStr) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("from '@/lib/species'")) return;
  
  // Find the last import statement
  const importLines = content.match(/^import .*/gm);
  if (importLines && importLines.length > 0) {
    const lastImport = importLines[importLines.length - 1];
    content = content.replace(lastImport, lastImport + '\n' + importsStr);
  } else {
    // If no imports but has 'use client'
    if (content.includes("'use client'") || content.includes('"use client"')) {
       content = content.replace(/['"]use client['"];?\n?/, (m) => m + '\n' + importsStr + '\n');
    } else {
       content = importsStr + '\n' + content;
    }
  }
  fs.writeFileSync(file, content, 'utf8');
}

const files = [
  { p: 'C:/Odi.Pet/src/app/owner/plan-yap/[kategori]/page.tsx', imp: "import { normalizeSpecies } from '@/lib/species';" },
  { p: 'C:/Odi.Pet/src/app/owner/scanner/ScannerClient.tsx', imp: "import { normalizeSpecies } from '@/lib/species';" },
  { p: 'C:/Odi.Pet/src/components/social/SocialTabs.tsx', imp: "import { normalizeSpecies, getSpeciesEmoji, getSpeciesLabel } from '@/lib/species';" }
];

files.forEach(f => {
  addImports(f.p, f.imp);
});
console.log('Imports fixed.');
