const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('e2e').filter(f => f.endsWith('.spec.ts'));
files.forEach(file => {
  if (file === 'onboarding_lifecycle.spec.ts') return;
  const p = path.join('e2e', file);
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@playwright\/test['"]/g, (m, imports) => {
    let parts = imports.split(',').map(s => s.trim());
    if (parts.includes('test')) {
      parts = parts.filter(s => s !== 'test' && s !== '');
      if (parts.length > 0) {
        return `import { ${parts.join(', ')} } from '@playwright/test';\nimport { test } from './fixtures';`;
      } else {
        return `import { test } from './fixtures';`;
      }
    }
    return m;
  });
  fs.writeFileSync(p, c, 'utf8');
});
