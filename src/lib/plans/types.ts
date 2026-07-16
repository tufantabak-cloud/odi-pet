export type PlanCategory = 'saglik' | 'asi' | 'parazit' | 'bakim' | 'beslenme' | 'hijyen' | 'aktivite' | 'kontrol';
export type PlanStatus = 'active' | 'completed' | 'cancelled';
export type RepeatRule = 'hour' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type NotifUnit = 'minute' | 'hour' | 'day';

export interface Plan {
  id: string;
  pet_id: string;
  user_id: string;
  category: PlanCategory;
  sub_type: string;
  scheduled_at: string;
  repeat_rule?: RepeatRule | null;
  ends_at?: string | null;
  notif_before: number;
  notif_unit: NotifUnit;
  note?: string | null;
  extra_data: Record<string, any>;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationJob {
  id: string;
  plan_id: string;
  fire_at: string;
  sent: boolean;
  created_at: string;
  updated_at: string;
}
