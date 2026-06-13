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
}

export interface ComputedEvent extends PetCareEvent {
  computedStatus: ComputedStatus;
}

/** Her satır = 1 görev (task) ve onun tekrarlayan event'leri */
export interface TaskRow {
  task: PetCareTask;
  events: ComputedEvent[];
}

/** Kategori grubu (Bakım, Sağlık, İlaç) — altında birden fazla TaskRow */
export interface CategoryGroup {
  category: TaskCategory;
  label: string;
  icon: string;
  taskRows: TaskRow[];
}
