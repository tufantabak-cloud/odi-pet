export interface QuickUpdateField {
  name: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  options?: { value: string | boolean; label: string }[]
}

export interface QuickUpdateConfig {
  title: string
  desc: string
  endpoint?: string
  method?: string
  fields: QuickUpdateField[]
}

export interface QuickUpdateModalProps {
  petId: string
  config: QuickUpdateConfig
  onClose: () => void
  onDone: () => void
}

export interface AIVetPet {
  id: string
  name: string
  species: string
  breed: string | null
  gender: string | null
  birth_date: string
  vet_name: string | null
  vet_phone: string | null
  vaccines: string[]
  diseases: string[]
}

export type AppActionId = 'add_weight' | 'go_to_vaccines' | 'go_to_parasites' | 'go_to_nutrition' | 'go_to_health' | 'find_vet';

export interface AIVetResponse {
  assessment_available: boolean
  is_emergency: boolean
  emergency_reason?: string
  emergency_action?: string
  severity: 'unknown' | 'low' | 'medium' | 'critical' | 'emergency'
  risk_score: number | null
  confidence_score: number | null
  summary?: string
  missing_critical_info?: string[]
  possible_explanations?: string[]
  recommended_actions?: string[]
  red_flags?: string[]
  when_to_see_vet?: string
  follow_up_questions?: string[]
  suggested_app_actions?: AppActionId[]
  
  // Phase 1/2 backward compat
  reasoning?: string
  known_context?: string
  missing_information?: string
}

export interface AIVetMessage {
  role: 'user' | 'ai'
  text: string
  response?: AIVetResponse
  poweredBy?: string
  contextUsed?: string[]
}

export type DataStatus = 'known_positive' | 'known_negative' | 'not_recorded' | 'stale';

export type IntentType = 
  | 'INTENT_MEDICAL' 
  | 'INTENT_MEDICATION' 
  | 'INTENT_ALLERGY' 
  | 'INTENT_WEIGHT' 
  | 'INTENT_NUTRITION' 
  | 'INTENT_VACCINE' 
  | 'INTENT_PARASITE' 
  | 'INTENT_CARE' 
  | 'INTENT_REPRODUCTIVE' 
  | 'INTENT_GENERAL';

export interface PetAIContext {
  core: {
    petId: string;
    identity: {
      name: string;
      species: 'cat' | 'dog';
      breed: string | null;
      gender: string | null;
      isNeutered: boolean | null;
      ageMonths: number;
      lifeStage: 'puppy_kitten' | 'adult' | 'senior';
    };
    weight: {
      valueKg: number | null;
      targetKg: number | null;
      recordedAt: string | null;
      status: DataStatus;
    };
    medicalStatus: {
      conditionsStatus: DataStatus;
      activeConditions: Array<{ name: string; diagnosedAt: string | null }>;
      medicationsStatus: DataStatus;
      activeMedications: Array<{ name: string; dose: string | null; duration: string | null }>;
      allergiesStatus: DataStatus;
      knownAllergies: Array<{ allergen: string; reaction: string | null }>;
    };
  };
  intentSpecific?: {
    intent: IntentType;
    vaccines?: {
      history: Array<{ name: string; administeredAt: string }>;
      upcomingOrOverdue: Array<{ name: string; dueDate: string; isOverdue: boolean }>;
    };
    parasites?: {
      protectionStatus: 'PROTECTED' | 'OVERDUE' | 'NOT_RECORDED' | 'STALE';
      lastAdministeredAt: string | null;
      lastProduct: string | null;
    };
    nutrition?: {
      primaryFood: string | null;
      dailyGramsTarget: number | null;
      mealsPerDay: number | null;
    };
    reproductive?: {
      isEligible: boolean;
      lastEstrusStart: string | null;
      activeSymptoms: string[];
    };
    care?: {
      recentEvents: Array<{ title: string; completedAt: string }>;
    };
  };
}
