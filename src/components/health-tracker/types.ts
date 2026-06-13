export type TaskCategory = 'care' | 'health' | 'medication' | string;

export type ComputedStatus = 'done' | 'missed' | 'upcoming' | 'today' | 'future';

export interface PetCareTask {
  id: string;
  pet_id: string;
  title: string;
  category: TaskCategory;
  frequency_days: number;
  frequency_label?: string | null;
  created_at?: string;
}

export interface PetCareEvent {
  id: string;
  task_id: string;
  pet_id: string;
  scheduled_at: string;
  completed_at?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  pet_care_tasks?: PetCareTask; // Joined data
  vaccines?: any;
  [key: string]: any;
}

export interface ComputedEvent extends PetCareEvent {
  computedStatus: ComputedStatus;
}

/** Her satır = 1 görev (task) ve onun tekrarlayan event'leri */
export interface TaskRow {
  task: PetCareTask;
  events: ComputedEvent[];
  /** Aşı kategorisinde alt grup etiketi (Zorunlu Aşılar / Opsiyonel Aşılar) */
  subGroupLabel?: string;
}

/** Alt grup (örneğin: Zorunlu Aşılar, Opsiyonel Aşılar) */
export interface SubCategoryGroup {
  label: string;
  taskRows: TaskRow[];
}

/** Kategori grubu — altında düz satırlar veya alt gruplar olabilir */
export interface CategoryGroup {
  category: TaskCategory;
  label: string;
  icon: string;
  taskRows: TaskRow[];
  /** Varsa alt gruplar (Aşı kategorisi için kullanılır) */
  subGroups?: SubCategoryGroup[];
}
