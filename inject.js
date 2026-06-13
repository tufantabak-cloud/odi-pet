const fs = require('fs');
const file = 'src/app/owner/pets/[id]/PetDetailClient.tsx';
let c = fs.readFileSync(file, 'utf8');

// Find the end of pet-tasks
// We know it ends around line 1284, but we can also just find "Layer 2: Sağlık ve Bakım Accordion" and put it right before it
const hookPoint = '{/* ── Layer 2: Sağlık ve Bakım Accordion ── */}';
if (c.includes(hookPoint)) {
  c = c.replace(hookPoint, '<HealthTracker petId={pet.id} onEditTask={(t) => { setTaskToEdit(t); setTaskWizardOpen(true); }} />\n\n      ' + hookPoint);
}

if (!c.includes('import { HealthTracker }')) {
  c = c.replace("import FloatingSOS from '@/components/FloatingSOS'", "import FloatingSOS from '@/components/FloatingSOS'\nimport { HealthTracker } from '@/components/health-tracker/HealthTracker'");
}

fs.writeFileSync(file, c);
