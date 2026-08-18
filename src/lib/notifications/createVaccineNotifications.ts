import { SupabaseClient } from '@supabase/supabase-js';

// T-14, T-7, T-2, T0, T+1 (gün cinsinden; negatif değer T+ gününü ifade eder)
const OFFSETS = [14, 7, 2, 0, -1] as const;

interface PlanForNotification {
  id?: string;
  sub_type: string;
  scheduled_at?: string;
}

interface CreateVaccineNotificationsResult {
  count: number;
  error: string | null;
}

/**
 * Üretilen aşı planlarından T-14/T-7/T-2/T0/T+1 hatırlatma bildirimleri oluşturur.
 * open_delay_minutes değeri aşının planlanan tarihine (scheduled_at) göre hesaplanır.
 */
export async function createVaccineNotifications(
  profileId: string,
  petId: string,
  plans: PlanForNotification[],
  supabase: SupabaseClient
): Promise<CreateVaccineNotificationsResult> {
  if (!plans || plans.length === 0) {
    return { count: 0, error: null };
  }

  const now = Date.now();

  const notifRows = plans.flatMap(plan => {
    const targetDate = plan.scheduled_at ? new Date(plan.scheduled_at) : new Date();
    return OFFSETS.map(offset => {
      // offset > 0: aşıdan X gün önce
      // offset === 0: aşı günü
      // offset < 0: aşıdan |X| gün sonra
      const reminderTime = targetDate.getTime() - (offset * 24 * 60 * 60 * 1000);
      const delayMinutes = Math.max(0, Math.round((reminderTime - now) / (1000 * 60)));

      return {
        profile_id: profileId,
        pet_id: petId,
        plan_id: plan.id ?? null,
        type: 'vaccine_reminder',
        title: `${plan.sub_type} hatırlatması`,
        message: offset > 0
          ? `${plan.sub_type} için ${offset} gün kaldı.`
          : offset === 0
          ? `Bugün ${plan.sub_type} günü.`
          : `${plan.sub_type} yapıldı mı?`,
        is_read: false,
        sent_email: false,
        open_delay_minutes: delayMinutes,
      };
    });
  });

  const { error } = await supabase.from('notifications').insert(notifRows);

  if (error) {
    console.error('[createVaccineNotifications] insert error:', error.message);
    return { count: 0, error: error.message };
  }

  return { count: notifRows.length, error: null };
}
