const fs = require('fs');
const file = 'src/app/owner/pets/[id]/PetDetailClient.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /<div className="flex flex-col gap-3">[\s\S]*?(?:\{\/\* Alerjiler — sadece veri varsa \*\/})/g;

c = c.replace(regex, `<HealthTracker petId={pet.id} />\n\n          {/* Alerjiler — sadece veri varsa */}`);

// inject import at the top
if (!c.includes('import { HealthTracker }')) {
  c = c.replace("import FloatingSOS from '@/components/FloatingSOS'", "import FloatingSOS from '@/components/FloatingSOS'\nimport { HealthTracker } from '@/components/health-tracker/HealthTracker'");
}

fs.writeFileSync(file, c);
