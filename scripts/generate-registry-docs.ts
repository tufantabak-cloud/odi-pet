import fs from 'fs';
import path from 'path';
import { featureRegistry } from '../src/lib/features/registry';

function generateRegistryDocs() {
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'premium-feature-catalog.md');
  const features = Array.from(featureRegistry.values());
  
  // Sort features by category then name
  features.sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });

  let md = '# Odi.Pet Premium Feature Catalog\n\n';
  md += '> Otomatik üretilmiş (Generated) bir dokümandır. Bu dosyayı elle düzenlemeyin.\n\n';
  md += `**Toplam Özellik Sayısı:** ${features.length}\n\n`;
  md += `**Son Güncelleme:** ${new Date().toISOString()}\n\n`;

  md += '## Tüm Özellikler (Feature Registry)\n\n';
  md += '| Feature Key | Adı | Kategori | Durum (State) | Bağımlılıklar |\n';
  md += '| :--- | :--- | :--- | :--- | :--- |\n';

  for (const f of features) {
    const deps = f.dependsOn && f.dependsOn.length > 0 ? f.dependsOn.join(', ') : '-';
    md += `| \`${f.key}\` | **${f.name}** | ${f.category} | ${f.state} | ${deps} |\n`;
  }

  md += '\n## Detaylı Özellik Listesi\n\n';

  let currentCategory = '';
  for (const f of features) {
    if (f.category !== currentCategory) {
      currentCategory = f.category;
      md += `### Kategori: ${currentCategory.toUpperCase()}\n\n`;
    }

    md += `#### \`${f.key}\` - ${f.name}\n`;
    md += `- **Açıklama:** ${f.description}\n`;
    md += `- **İkon:** ${f.icon}\n`;
    md += `- **Visibility:** ${f.visibility}\n`;
    md += `- **Etiketler (Tags):** ${f.tags ? f.tags.join(', ') : '-'}\n`;
    md += `- **Requires Auth:** ${f.requiresAuth ? 'Evet' : 'Hayır'}\n`;
    md += `- **Requires Pet:** ${f.requiresPet ? 'Evet' : 'Hayır'}\n`;
    
    if (f.metadata) {
      if (f.metadata.owner) md += `- **Owner:** ${f.metadata.owner}\n`;
      if (f.metadata.team) md += `- **Team:** ${f.metadata.team}\n`;
      if (f.metadata.introducedIn) md += `- **Introduced In:** ${f.metadata.introducedIn}\n`;
      if (f.metadata.lastModified) md += `- **Last Modified:** ${f.metadata.lastModified}\n`;
    }
    
    md += '\n';
  }

  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`✅ Documentation generated at ${outputPath}`);
}

generateRegistryDocs();
