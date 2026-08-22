const fs = require('fs');
const file = 'src/app/owner/pets/[id]/PetDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

const dynamicTemplate = "const {name} = dynamic(() => import('{path}'){options});";
const namedDynamicTemplate = "const {name} = dynamic(() => import('{path}').then(mod => mod.{name}){options});";

const replaceDefault = (name, path, options = '') => {
  const regex = new RegExp(`import\\s+${name}\\s+from\\s+['"]${path}['"]`);
  const replacement = dynamicTemplate.replace('{name}', name).replace('{path}', path).replace('{options}', options ? `, ${options}` : '');
  code = code.replace(regex, replacement);
};

// Default imports
replaceDefault('FamilyTab', './FamilyTab', "{ loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> }");
replaceDefault('HealthTab', '@/components/pets/tabs/HealthTab', "{ loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> }");
replaceDefault('VeterinerTab', '@/components/pets/tabs/VeterinerTab', "{ loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> }");
replaceDefault('NutritionClient', './nutrition/NutritionClient', "{ loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> }");
replaceDefault('BreedHealthCard', '@/components/pets/BreedHealthCard');
replaceDefault('LostPetWizard', '@/components/pets/LostPetWizard');
replaceDefault('MinimalGrowthChart', '@/components/pets/MinimalGrowthChart');
replaceDefault('SmartCardBanner', '@/components/ui/SmartCardBanner');
replaceDefault('AllergyManager', '@/components/pets/AllergyManager');
replaceDefault('MedicationManager', '@/components/pets/MedicationManager');
replaceDefault('HealthTimeline', '@/components/pets/health/HealthTimeline', "{ loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> }");
replaceDefault('ParasitePlanCompletionModal', '@/components/pets/ParasitePlanCompletionModal');
replaceDefault('ConfirmModal', '@/components/ui/ConfirmModal');
replaceDefault('FloatingSOS', '@/components/FloatingSOS');
replaceDefault('AiDocumentScanner', '@/components/ai/AiDocumentScanner', "{ ssr: false }");

code = code.replace(
  /import\s+\{\s*SmartScanner\s*\}\s+from\s+['"]@\/components\/ui\/SmartScanner['"]/,
  "const SmartScanner = dynamic(() => import('@/components/ui/SmartScanner').then(mod => mod.SmartScanner), { ssr: false })"
);

code = code.replace(
  /import\s+\{\s*HealthTracker\s*\}\s+from\s+['"]@\/components\/health-tracker\/HealthTracker['"]/,
  "const HealthTracker = dynamic(() => import('@/components/health-tracker/HealthTracker').then(mod => mod.HealthTracker), { loading: () => <div className='animate-pulse bg-gray-100 rounded-2xl w-full h-12' /> })"
);

code = code.replace(
  /import\s+\{\s*EstrusTracker\s*\}\s+from\s+['"]@\/components\/estrus-tracker\/EstrusTracker['"]/,
  "const EstrusTracker = dynamic(() => import('@/components/estrus-tracker/EstrusTracker').then(mod => mod.EstrusTracker))"
);

code = code.replace(
  /import\s+\{\s*DeletePlanConfirmationModal\s*\}\s+from\s+['"]@\/components\/ui\/DeletePlanConfirmationModal['"]/,
  "const DeletePlanConfirmationModal = dynamic(() => import('@/components/ui/DeletePlanConfirmationModal').then(mod => mod.DeletePlanConfirmationModal))"
);

code = code.replace(
  /import\s+\{\s*PostponeModal\s*\}\s+from\s+['"]@\/components\/pets\/common\/PostponeModal['"]/,
  "const PostponeModal = dynamic(() => import('@/components/pets/common/PostponeModal').then(mod => mod.PostponeModal))"
);

code = code.replace(
  /import\s+\{\s*CompletionDetailsModal\s*\}\s+from\s+['"]@\/components\/pets\/common\/CompletionDetailsModal['"]/,
  "const CompletionDetailsModal = dynamic(() => import('@/components/pets/common/CompletionDetailsModal').then(mod => mod.CompletionDetailsModal))"
);

code = code.replace(
  /import\s+\{\s*PetTaskModals,\s*TaskModalType\s*\}\s+from\s+['"]@\/components\/pets\/PetTaskModals['"]/,
  "import type { TaskModalType } from '@/components/pets/PetTaskModals';\nconst PetTaskModals = dynamic(() => import('@/components/pets/PetTaskModals').then(mod => mod.PetTaskModals))"
);

// We need to also conditionally render ConfirmModal, the rule says:
// ConfirmModal koþullu render: {markFoundConfirmOpen && <ConfirmModal ... />}
code = code.replace(
  /<ConfirmModal\s+isOpen=\{markFoundConfirmOpen\}/,
  "{markFoundConfirmOpen && <ConfirmModal isOpen={markFoundConfirmOpen}"
);
code = code.replace(
  /onClose=\{\(\) => setMarkFoundConfirmOpen\(false\)\}\n\s+\/>/,
  "onClose={() => setMarkFoundConfirmOpen(false)}\n                      />}"
);
// Actually replacing JSX via regex is fragile, let's do a more robust string replacement for ConfirmModal
const targetConfirmModal = `<ConfirmModal
                      isOpen={markFoundConfirmOpen}
                      title="Emin misiniz?"
                      message="Bu iþlem evcil hayvanýnýzýn kayýp statüsünü kaldýracaktýr."
                      confirmText="Evet, Bulundu"
                      cancelText="Ýptal"
                      onConfirm={confirmMarkFound}
                      onClose={() => setMarkFoundConfirmOpen(false)}
                    />`;
const replacementConfirmModal = `{markFoundConfirmOpen && <ConfirmModal
                      isOpen={markFoundConfirmOpen}
                      title="Emin misiniz?"
                      message="Bu iþlem evcil hayvanýnýzýn kayýp statüsünü kaldýracaktýr."
                      confirmText="Evet, Bulundu"
                      cancelText="Ýptal"
                      onConfirm={confirmMarkFound}
                      onClose={() => setMarkFoundConfirmOpen(false)}
                    />}`;
code = code.replace(targetConfirmModal, replacementConfirmModal);

fs.writeFileSync(file, code);
console.log('Split completed');
