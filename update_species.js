const fs = require('fs');

function processPetHeroCard() {
  const file = 'C:/Odi.Pet/src/app/owner/pets/[id]/PetHeroCard.tsx';
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;

  // Add imports
  if (!content.includes('getSpeciesEmoji')) {
    content = content.replace(/(import .*?\n)+/, (m) => m + "import { getSpeciesEmoji, getSpeciesLabel } from '@/lib/species';\n");
  }

  // Replace emoji logic
  const pattern = /\{pet\.species === 'cat' \|\|\s*pet\.species === 'kedi'\s*\?\s*'🐱'\s*:\s*'🐶'\}/g;
  content = content.replace(pattern, '{getSpeciesEmoji(pet.species)}');

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    return 1;
  }
  return 0;
}

function processSocialTabs() {
  const file = 'C:/Odi.Pet/src/components/social/SocialTabs.tsx';
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;

  if (!content.includes('normalizeSpecies')) {
    content = content.replace(/(import .*?\n)+/, (m) => m + "import { normalizeSpecies, getSpeciesEmoji, getSpeciesLabel } from '@/lib/species';\n");
  }

  content = content.replace(/species !== 'cat' && species !== 'kedi'/g, `normalizeSpecies(species) !== 'cat'`);
  content = content.replace(/species !== 'dog' && species !== 'köpek'/g, `normalizeSpecies(species) !== 'dog'`);
  
  content = content.replace(/pet\?\.species === 'Kedi' \|\| pet\?\.species === 'cat' \? '🐱' : pet\?\.species === 'Köpek' \|\| pet\?\.species === 'dog' \? '🐶' : '🐾'/g, `getSpeciesEmoji(pet?.species)`);
  
  // petSpeciesLower logic
  content = content.replace(/const matchSpecies = lostSpeciesFilter === 'Kedi' \? 'kedi' : 'köpek'\s+const petSpeciesLower = \(pet\.species \|\| ''\)\.toLowerCase\(\)\s+if \(petSpeciesLower !== matchSpecies && petSpeciesLower !== \(matchSpecies === 'kedi' \? 'cat' : 'dog'\)\) \{/g, `const matchSpecies = lostSpeciesFilter === 'Kedi' ? 'cat' : 'dog'
                if (normalizeSpecies(pet.species) !== matchSpecies) {`);

  // options
  content = content.replace(/<option value=\"cat\">🐱 Kedi<\/option>/g, `<option value="cat">{getSpeciesEmoji('cat')} {getSpeciesLabel('cat')}</option>`);
  content = content.replace(/<option value=\"dog\">🐶 Köpek<\/option>/g, `<option value="dog">{getSpeciesEmoji('dog')} {getSpeciesLabel('dog')}</option>`);

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    return 1;
  }
  return 0;
}

function processPlanYap() {
  const file = 'C:/Odi.Pet/src/app/owner/plan-yap/[kategori]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;

  if (!content.includes('normalizeSpecies')) {
    content = content.replace(/(import .*?\n)+/, (m) => m + "import { normalizeSpecies } from '@/lib/species';\n");
  }

  content = content.replace(/const isCat = speciesStr\.toLowerCase\(\) === 'cat' \|\| speciesStr\.toLowerCase\(\) === 'kedi';\s+const speciesEng = isCat \? 'cat' : 'dog';/g, `const speciesEng = normalizeSpecies(speciesStr);`);
  
  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    return 1;
  }
  return 0;
}

function processOtherFiles() {
  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    });
    return results;
  }
  const files = walk('C:/Odi.Pet/src');
  let changedCount = 0;
  files.forEach(f => {
    if (f.includes('PetHeroCard.tsx') || f.includes('SocialTabs.tsx') || f.includes('plan-yap')) return;
    
    let content = fs.readFileSync(f, 'utf8');
    let orig = content;
    
    // Simplest replacement for other files: pet.species === 'cat' || pet.species === 'kedi' -> normalizeSpecies(pet.species) === 'cat'
    const pattern = /([a-zA-Z0-9_?.]+)\.species === 'cat' \|\|\s*\1\.species === 'kedi'/g;
    content = content.replace(pattern, "normalizeSpecies($1.species) === 'cat'");
    
    const pattern2 = /([a-zA-Z0-9_?.]+)\.species === 'Kedi' \|\|\s*\1\.species === 'cat'/g;
    content = content.replace(pattern2, "normalizeSpecies($1.species) === 'cat'");

    const pattern3 = /([a-zA-Z0-9_?.]+)\.species === 'Köpek' \|\|\s*\1\.species === 'dog'/g;
    content = content.replace(pattern3, "normalizeSpecies($1.species) === 'dog'");

    if (content !== orig) {
      if (!content.includes('normalizeSpecies')) {
        content = content.replace(/(import .*?\n)+/, (m) => m + "import { normalizeSpecies } from '@/lib/species';\n");
      }
      fs.writeFileSync(f, content, 'utf8');
      changedCount++;
    }
  });
  return changedCount;
}

let c = 0;
c += processPetHeroCard();
c += processSocialTabs();
c += processPlanYap();
c += processOtherFiles();

console.log('Processed:', c);
