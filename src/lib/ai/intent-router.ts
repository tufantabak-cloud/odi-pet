import { IntentType } from '@/app/owner/ai-vet/ai-vet-types';

const INTENT_PATTERNS: Record<IntentType, RegExp> = {
  INTENT_MEDICAL: /(kusma|kusuyor|ishal|ateş|öksürük|öksürüyor|halsiz|halsizlik|kan |kanı|yara|ağrı|topallıyor|titreme|hasta|rahatsız|titriyor)/i,
  INTENT_MEDICATION: /(ilaç|doz|antibiyotik|hap|şurup|damlası|damla|krem|pomad|merhem|yan etki)/i,
  INTENT_ALLERGY: /(alerji|kaşıntı|kaşınıyor|döküntü|kızarıklık|tüy dökülmesi|kabarma)/i,
  INTENT_WEIGHT: /(kilo|zayıf|şişman|obez|tartı|gram|kg|ağır|hafif|zayıfladı|şişmanladı)/i,
  INTENT_NUTRITION: /(mama|beslenme|çiğ|öğün|porsiyon|iştah|yaş mama|kuru mama|yiyor|yemiyor)/i,
  INTENT_VACCINE: /(aşı|kuduz|karma|lösemi|aşısı|takvimi|gecikti)/i,
  INTENT_PARASITE: /(pire|kene|parazit|iç|dış|ense)/i,
  INTENT_CARE: /(banyo|tırnak|kulak|traş|tıraş|diş|fırçalama|tüy tarama|tarama)/i,
  INTENT_REPRODUCTIVE: /(kızgınlık|çiftleşme|doğum|gebelik|estrus)/i,
  INTENT_GENERAL: /.*/ 
};

// Priority of checking intents. Medical/emergency stuff should trigger first.
const EVALUATION_ORDER: IntentType[] = [
  'INTENT_MEDICAL',
  'INTENT_ALLERGY',
  'INTENT_VACCINE',
  'INTENT_PARASITE',
  'INTENT_MEDICATION',
  'INTENT_NUTRITION',
  'INTENT_WEIGHT',
  'INTENT_REPRODUCTIVE',
  'INTENT_CARE'
];

export function determineIntent(query: string): IntentType {
  if (!query) return 'INTENT_GENERAL';
  const normalizedQuery = query.toLowerCase().trim();
  for (const intent of EVALUATION_ORDER) {
    if (INTENT_PATTERNS[intent].test(normalizedQuery)) {
      return intent;
    }
  }
  return 'INTENT_GENERAL';
}
