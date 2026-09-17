"use client";

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const petIdQuery = searchParams.get('petId') || searchParams.get('pet_id');
  const { id } = use(params);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function redirectPlan() {
      if (!id) {
        setError('Geçersiz plan kimliği.');
        return;
      }

      try {
        // 1. Doğrudan plans tablosunda maybeSingle ile ara (406 hatası vermez)
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('id, category, pet_id')
          .eq('id', id)
          .maybeSingle();

        if (!planError && planData?.category) {
          const petParam = petIdQuery || planData.pet_id ? `&pet_id=${petIdQuery || planData.pet_id}` : '';
          router.replace(`/owner/plan-yap/${planData.category}?editId=${planData.id}${petParam}`);
          return;
        }

        // 2. vaccine_records_v2 tablosunda ara (Tamamlanmış veya geçmiş aşı kaydı)
        const { data: vaccineData } = await supabase
          .from('vaccine_records_v2')
          .select('id, pet_id, plan_id')
          .eq('id', id)
          .maybeSingle();

        if (vaccineData) {
          const targetPetId = petIdQuery || vaccineData.pet_id;
          if (vaccineData.plan_id) {
            const { data: linkedPlan } = await supabase
              .from('plans')
              .select('category, id')
              .eq('id', vaccineData.plan_id)
              .maybeSingle();

            if (linkedPlan?.category) {
              router.replace(`/owner/plan-yap/${linkedPlan.category}?editId=${linkedPlan.id}${targetPetId ? `&pet_id=${targetPetId}` : ''}`);
              return;
            }
          }
          router.replace(`/owner/pets/${targetPetId}?tab=saglik&highlight_vaccine=${vaccineData.id}`);
          return;
        }

        // 3. parasite_records tablosunda ara (Parazit kaydı)
        const { data: parasiteData } = await supabase
          .from('parasite_records')
          .select('id, pet_id, plan_id')
          .eq('id', id)
          .maybeSingle();

        if (parasiteData) {
          const targetPetId = petIdQuery || parasiteData.pet_id;
          if (parasiteData.plan_id) {
            const { data: linkedPlan } = await supabase
              .from('plans')
              .select('category, id')
              .eq('id', parasiteData.plan_id)
              .maybeSingle();

            if (linkedPlan?.category) {
              router.replace(`/owner/plan-yap/${linkedPlan.category}?editId=${linkedPlan.id}${targetPetId ? `&pet_id=${targetPetId}` : ''}`);
              return;
            }
          }
          router.replace(`/owner/pets/${targetPetId}?tab=saglik&highlight_parasite=${parasiteData.id}`);
          return;
        }

        // 4. health_schedules tablosunda ara (Eski veya rutin sağlık takvimi)
        const { data: scheduleData } = await supabase
          .from('health_schedules')
          .select('id, pet_id, schedule_type, category')
          .eq('id', id)
          .maybeSingle();

        if (scheduleData) {
          const targetPetId = petIdQuery || scheduleData.pet_id;
          const cat = scheduleData.category || scheduleData.schedule_type || 'saglik';
          router.replace(`/owner/plan-yap/${cat}?scheduleId=${scheduleData.id}${targetPetId ? `&pet_id=${targetPetId}` : ''}`);
          return;
        }

        // 5. Hiçbir yerde bulunamadıysa
        setError('Kayıt bulunamadı veya silinmiş.');
      } catch (err: any) {
        console.warn('Plan redirect resolution error:', err);
        setError('Kayıt yüklenirken bir sorun oluştu.');
      }
    }

    redirectPlan();
  }, [id, petIdQuery, router, supabase]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-4 text-slate-800">{error}</h2>
        <Link 
          href={petIdQuery ? `/owner/pets/${petIdQuery}` : "/owner/dashboard"} 
          className="px-6 py-3 bg-white rounded-xl shadow-sm font-bold text-indigo-600 hover:bg-slate-50 transition-colors"
        >
          {petIdQuery ? "Pet Detayına Dön" : "Panoya Dön"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
      <p className="text-sm text-slate-500 font-medium animate-pulse">Düzenleyici hazırlanıyor...</p>
    </div>
  );
}
