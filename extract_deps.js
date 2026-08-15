const fs = require('fs');
const path = require('path');

const srcDir = path.join('c:\\Odi.Pet', 'src');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') {
        console.log(`Skipping: ${dirFile}`);
      } else {
        throw err;
      }
    }
  });
  return filelist;
};

const extractDependencies = (content) => {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const deps = new Set();
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        deps.add(match[1]);
    }
    return Array.from(deps);
};

const files = walkSync(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

const featureDeps = {};

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const deps = extractDependencies(content);
    featureDeps[f.replace(srcDir, '')] = deps;
});

fs.writeFileSync('c:\\Odi.Pet\\deps.json', JSON.stringify(featureDeps, null, 2));
console.log('Dependencies extracted to deps.json');
