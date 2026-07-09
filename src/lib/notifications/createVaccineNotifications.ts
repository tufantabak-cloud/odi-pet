import { SupabaseClient } from '@supabase/supabase-js';

// T-14, T-7, T-2, T0, T+1 (gün cinsinden; negatif değer T+ gününü ifade eder)
const OFFSETS = [14, 7, 2, 0, -1] as const;

interface PlanForNotification {
  sub_type: string;
}

interface CreateVaccineNotificationsResult {
  count: number;
  error: string | null;
}

/**
 * Üretilen aşı planlarından T-14/T-7/T-2/T0/T+1 hatırlatma bildirimleri oluşturur.
 * Hem pet oluşturma (pets/route.ts) hem doğum tarihi güncelleme (pets/[id]/route.ts)
 * akışlarından çağrılır — bildirim üretimi bu iki yerde ayrı ayrı yazılmasın diye.
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

  const notifRows = plans.flatMap(plan =>
    OFFSETS.map(offset => ({
      profile_id: profileId,
      pet_id: petId,
      type: 'vaccine_reminder',
      title: `${plan.sub_type} hatırlatması`,
      message: offset > 0
        ? `${plan.sub_type} için ${offset} gün kaldı.`
        : offset === 0
        ? `Bugün ${plan.sub_type} günü.`
        : `${plan.sub_type} yapıldı mı?`,
      is_read: false,
      sent_email: false,
      open_delay_minutes: offset >= 0
        ? offset * 24 * 60
        : Math.abs(offset) * 24 * 60,
    }))
  );

  const { error } = await supabase.from('notifications').insert(notifRows);

  if (error) {
    console.error('[createVaccineNotifications] insert error:', error.message);
    return { count: 0, error: error.message };
  }

  return { count: notifRows.length, error: null };
}
