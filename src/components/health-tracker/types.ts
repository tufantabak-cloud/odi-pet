export type TaskCategory = 'care' | 'health' | 'medication' | string;

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
  status: string; // will be calculated client-side as done, missed, upcoming, warning, future
  notes?: string | null;
  created_at?: string;
  pet_care_tasks?: PetCareTask; // Joined data
}

export type ComputedStatus = 'done' | 'missed' | 'upcoming' | 'warning' | 'future';

export interface ComputedEvent extends PetCareEvent {
  computedStatus: ComputedStatus;
}

export interface TrackerGroup {
  category: TaskCategory;
  label: string;
  events: ComputedEvent[];
}
