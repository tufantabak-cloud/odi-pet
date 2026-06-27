import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendWebPush, PushPayload } from '@/lib/agents/notificationAgent';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // ADIM 1 — Güvenlik kontrolü
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.PLAN_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  let processingIds: string[] = [];

  try {
    const now = new Date().toISOString();

    // ADIM 1.5 — Kızgınlık Dönemi (Estrus) bildirimleri için Job oluşturma
    const todayStr = now.split('T')[0];
    const { data: estrusListings } = await supabase
      .from('breeding_listings')
      .select('id, pet_id, user_id, pets(name)')
      .eq('estrus_notification_enabled', true)
      .eq('status', 'active');

    if (estrusListings && estrusListings.length > 0) {
      const petIds = estrusListings.map((l: any) => l.pet_id);
      const { data: activeCycles } = await supabase
        .from('pet_estrus_cycles')
        .select('pet_id')
        .in('pet_id', petIds)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);
        
      const activeCyclePetIds = new Set(activeCycles?.map((c: any) => c.pet_id) || []);
      const validListings = estrusListings.filter((l: any) => activeCyclePetIds.has(l.pet_id));

      if (validListings.length > 0) {
        const { data: existingEstrusJobs } = await supabase
          .from('notification_jobs')
          .select('user_id')
          .eq('job_type', 'estrus_alert')
          .gte('scheduled_for', `${todayStr}T00:00:00Z`)
          .lte('scheduled_for', `${todayStr}T23:59:59Z`);
        
        const existingUserIds = new Set(existingEstrusJobs?.map((j: any) => j.user_id) || []);
        
        const newJobs = validListings
          .filter((listing: any) => !existingUserIds.has(listing.user_id))
          .map((listing: any) => {
            const petName = (listing.pets as any)?.name || 'Dostunuz';
            return {
              user_id: listing.user_id,
              job_type: 'estrus_alert',
              payload: {
                title: '🌸 Kızgınlık Dönemi Başladı',
                body: `${petName} için kızgınlık dönemi başladı. Eşleşme tekliflerini kontrol edin!`,
                action_url: `/owner/pets/${listing.pet_id}/match`
              },
              scheduled_for: now,
              status: 'pending'
            };
          });

        if (newJobs.length > 0) {
          await supabase.from('notification_jobs').insert(newJobs);
        }
      }
    }

    // ADIM 2 — Concurrency control (önce kilitle)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(20);

    if (fetchError) throw fetchError;
    
    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, failed: 0, skipped: 0 });
    }

    processingIds = pendingJobs.map(j => j.id);
    
    // Status processing
    const { error: updateError } = await supabase
      .from('notification_jobs')
      .update({ status: 'processing' })
      .in('id', processingIds);

    if (updateError) throw updateError;

    // ADIM 3 — Tekilleştirme (deduplication)
    const uniqueMap = new Map<string, any>();
    const skippedIds: string[] = [];
    const validJobs: any[] = [];

    for (const job of pendingJobs) {
      const datePart = job.scheduled_for.split('T')[0];
      const key = `${job.user_id}_${job.job_type}_${datePart}`;
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, job);
        validJobs.push(job);
      } else {
        skippedIds.push(job.id);
      }
    }

    if (skippedIds.length > 0) {
      await supabase
        .from('notification_jobs')
        .update({ status: 'skipped' })
        .in('id', skippedIds);
    }

    let sent = 0;
    let failed = 0;

    // ADIM 4 — Push subscription'ları çek
    const userIds = validJobs.map(j => j.user_id);
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('profile_id', userIds);

    // ADIM 5 — Push gönder (her job için)
    for (const job of validJobs) {
      const payloadObj = (typeof job.payload === 'object' && job.payload !== null) ? job.payload : {};
      
      const pushPayload: PushPayload = {
        title: (payloadObj as any).title || 'Odi.Pet',
        body: (payloadObj as any).body || 'Yeni bir bildiriminiz var.',
        url: (payloadObj as any).action_url ?? '/owner/dashboard'
      };

      const userSubs = subscriptions?.filter(s => s.profile_id === job.user_id) || [];
      
      if (userSubs.length === 0) {
        await supabase
          .from('notification_jobs')
          .update({ 
            status: 'failed', 
            payload: { ...payloadObj, error: 'No active push subscriptions' } 
          })
          .eq('id', job.id);
        failed++;
        continue;
      }

      const results = await Promise.all(userSubs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key
            }
          };
          const res = await sendWebPush(pushSubscription as any, pushPayload);
          if (!res.success) throw res.error;
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            return { success: false, reason: 'gone', endpoint: sub.endpoint };
          }
          return { success: false, reason: statusCode === 429 ? 'ratelimit' : 'error', error };
        }
      }));

      const allSuccess = results.every(r => r.success);
      const someSuccess = results.some(r => r.success);

      if (allSuccess || someSuccess) {
        const finalStatus = allSuccess ? 'sent' : 'partial';
        await supabase
          .from('notification_jobs')
          .update({ 
            status: finalStatus,
            payload: { ...payloadObj, sent_at: new Date().toISOString() } 
          })
          .eq('id', job.id);
        sent++;
      } else {
        const retryCount = ((payloadObj as any).retry_count || 0) + 1;
        if (retryCount >= 3) {
          await supabase
            .from('notification_jobs')
            .update({ 
              status: 'abandoned',
              payload: { ...payloadObj, retry_count: retryCount } 
            })
            .eq('id', job.id);
        } else {
          const nextRun = new Date();
          nextRun.setHours(nextRun.getHours() + 1);
          await supabase
            .from('notification_jobs')
            .update({ 
              status: 'failed',
              scheduled_for: nextRun.toISOString(),
              payload: { ...payloadObj, retry_count: retryCount }
            })
            .eq('id', job.id);
        }
        failed++;
      }
    }

    // ADIM 6 — Sonuç logla ve dön
    return NextResponse.json({
      processed: pendingJobs.length,
      sent,
      failed,
      skipped: skippedIds.length
    });

  } catch (error: any) {
    console.error('[CRON/DispatchNotifications] Error:', error);
    if (processingIds.length > 0) {
      await supabase
        .from('notification_jobs')
        .update({ status: 'pending' })
        .in('id', processingIds);
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
