const fs = require('fs');
const file = 'c:/Odi.Pet/src/app/owner/pets/[id]/PetDetailClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{tasks\.length > 0 && \(\s*<div className="flex flex-col gap-3">\s*<h4 className="text-\[11px\] font-black text-text-secondary uppercase tracking-widest px-1">Planlanmış Görevler<\/h4>[\s\S]*?<\/[dD][iI][vV]>\s*\)\}/g;

content = content.replace(regex, `{/* Planned Tasks */}
          {renderTasksSection(tasks.filter((t: any) => t.status !== 'done'), 'Planlanmış Görevler')}
          {renderTasksSection(tasks.filter((t: any) => t.status === 'done'), 'Tamamlanan Görevler')}`);

fs.writeFileSync(file, content);
console.log('done!');
