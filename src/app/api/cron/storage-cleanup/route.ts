import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { authorizeCronRequest } from '@/lib/security/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // GÜVENLİK DÜZELTMESİ: Bu route daha önce kendi auth kontrolünü yapıyordu
  // (`if (cronSecret && authHeader !== ...)`), ve CRON_SECRET ortam
  // değişkeni tanımsız olduğunda kontrol tamamen atlanıyordu (fail-open) —
  // bu da bu route'u (storage bucket'larından dosya SİLME işlemi yapan bir
  // endpoint'i) yetkisiz herkese açık hale getirebilirdi. Ayrıca karşılaştırma
  // timing-safe değildi. Diğer 12 cron route'unun tamamının kullandığı
  // ortak, fail-closed `authorizeCronRequest()` yardımcı fonksiyonuna
  // geçirildi (bkz. src/lib/security/cron-auth.ts) — davranış artık
  // repodaki yerleşik güvenli desenle birebir tutarlı.
  const authorizationError = authorizeCronRequest(req);
  if (authorizationError) {
    return authorizationError;
  }

  const supabase = createAdminSupabaseClient();
  const buckets = ['pet-avatars', 'pet-gallery', 'pet_gallery_bucket', 'vaccine-documents', 'pet-documents'];
  let totalDeleted = 0;
  const log: string[] = [];

  for (const bucket of buckets) {
    try {
      // List top-level folders (pet_ids or user_ids)
      const { data: folders, error: listError } = await supabase.storage
        .from(bucket)
        .list();

      if (listError || !folders) continue;

      for (const folder of folders) {
        if (!folder.id && folder.name) {
          const petId = folder.name;
          // UUID format check
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId)) {
            continue;
          }

          // Check if pet exists in DB
          const { data: pet } = await supabase
            .from('pets')
            .select('id')
            .eq('id', petId)
            .maybeSingle();

          if (!pet) {
            // Orphan folder found! List files inside folder and delete
            const { data: files } = await supabase.storage.from(bucket).list(petId);
            if (files && files.length > 0) {
              const paths = files.map((f) => `${petId}/${f.name}`);
              const { error: delErr } = await supabase.storage.from(bucket).remove(paths);
              if (!delErr) {
                totalDeleted += paths.length;
                log.push(`Cleaned ${paths.length} orphan files in bucket '${bucket}' for deleted pet ${petId}`);
              }
            }
          }
        }
      }
    } catch (err: any) {
      log.push(`Error processing bucket ${bucket}: ${err?.message || err}`);
    }
  }

  return NextResponse.json({
    success: true,
    totalDeleted,
    log
  });
}
