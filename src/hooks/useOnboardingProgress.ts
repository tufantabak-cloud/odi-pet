import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface OnboardingStep {
  id: string;
  label: string;
  icon: string;
  done: boolean;
  route: string;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  isActivePeriod: boolean; // ilk 7 gün mü?
  isSnoozed: boolean;      // bugün ertelendi mi?
}

export function useOnboardingProgress(petId: string) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const supabase = createBrowserSupabaseClient();

  const fetchProgress = async () => {
    if (!petId) return;

    const { data, error } = await supabase
      .from('pets')
      .select('onboarding_progress, created_at')
      .eq('id', petId)
      .single();

    if (error || !data) return;

    const op = data.onboarding_progress as any;
    const createdAt = new Date(data.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isActivePeriod = daysSinceCreation <= 7;

    // Snooze kontrolü — bugün ertelendi mi?
    const snoozedUntil = op?.snoozed_until ? new Date(op.snoozed_until) : null;
    const isSnoozed = snoozedUntil ? snoozedUntil > now : false;

    const steps: OnboardingStep[] = [
      {
        id: 'pet_created',
        label: 'Pet kaydı oluşturuldu',
        icon: 'ti ti-paw',
        done: true, // her zaman true
        route: `/owner/pets/${petId}`,
      },
      {
        id: 'vaccine_plan',
        label: 'Aşı planı kuruldu',
        icon: 'ti ti-shield-check',
        done: op?.vaccine_plan ?? false,
        route: `/owner/plan-yap/asi?pet_id=${petId}`,
      },
      {
        id: 'parasite_first',
        label: 'Parazit koruması eklendi',
        icon: 'ti ti-bug',
        done: op?.parasite_first ?? false,
        route: `/owner/plan-yap/parazit?pet_id=${petId}`,
      },
      {
        id: 'emergency_contact',
        label: 'Acil durum kişisi eklendi',
        icon: 'ti ti-phone-call',
        done: op?.emergency_contact ?? false,
        route: `/owner/pets/${petId}`,
      },
      {
        id: 'documents',
        label: 'Aşı Karnesi ve Belgeleri',
        icon: 'ti ti-file',
        done: op?.documents ?? false,
        route: `/owner/pets/${petId}?tab=vaccines`,
      },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const totalCount = steps.length;

    setProgress({
      steps,
      completedCount,
      totalCount,
      percentage: Math.round((completedCount / totalCount) * 100),
      isComplete: completedCount === totalCount,
      isActivePeriod,
      isSnoozed,
    });
  };

  useEffect(() => {
    fetchProgress();
  }, [petId]);

  // Snooze fonksiyonu — bugünün sonuna kadar ertele
  async function snooze() {
    if (!petId) return;
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const { data: pet } = await supabase
      .from('pets')
      .select('onboarding_progress')
      .eq('id', petId)
      .single();

    const currentProgress = pet?.onboarding_progress ? { ...(pet.onboarding_progress as object) } : {};
    const updatedProgress = {
      ...currentProgress,
      snoozed_until: tomorrow.toISOString(),
    };

    const { error } = await supabase
      .from('pets')
      .update({
        onboarding_progress: updatedProgress,
      })
      .eq('id', petId);

    if (!error) {
      await fetchProgress();
    }
  }

  return { progress, snooze, refetch: fetchProgress };
}

// onboarding_progress adımını tamamlandı işaretlemek için yardımcı
export async function markOnboardingStep(
  petId: string,
  stepId: string,
  supabase: ReturnType<typeof createBrowserSupabaseClient>
): Promise<void> {
  await supabase.rpc('update_onboarding_step', {
    p_pet_id: petId,
    p_step: stepId,
    p_value: true,
  });
}
