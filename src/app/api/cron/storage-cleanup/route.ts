import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Authorization check (Cron secret or internal header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
