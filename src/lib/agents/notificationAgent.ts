import webpush from 'web-push';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// VAPID ayarlarını yapılandırıyoruz.
// .env.local içerisinde NEXT_PUBLIC_VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY bulunmalıdır.
webpush.setVapidDetails(
  'mailto:destek@odi.pet',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Belirli bir PWA aboneliğine Web Push bildirimi gönderir
 */
export async function sendWebPush(subscription: webpush.PushSubscription, payload: PushPayload) {
  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true, result };
  } catch (error) {
    console.error('Error sending web push:', error);
    return { success: false, error };
  }
}

/**
 * event_stream tablosundaki okunmamış churn risk eventlerini process edip bildirim atar
 */
export async function processHealthEvents() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  );

  // process edilmemiş (metadata->>'processed' is null) churn_risk_detected eventlerini al
  // Şimdilik sadece örnek mock yapı kuruyoruz çünkü Supabase tarafında JSONB query yapılacak
  const { data: events, error } = await supabase
    .from('event_stream')
    .select('*')
    .eq('event_type', 'churn_risk_detected')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Event okuma hatası:', error);
    return { success: false, processed: 0 };
  }

  let processedCount = 0;

  for (const ev of events || []) {
    // Sadece henüz process edilmemiş olanları yakalamak için JSONB check'i:
    if (ev.metadata?.processed) continue;

    // Burada normalde 'push_subscriptions' tablosundan kullanıcının PWA aboneliğini çekeriz.
    // Örnek: const { data: subs } = await supabase.from('push_subscriptions').eq('profile_id', ev.profile_id);

    // Biz şu an sadece Event'i logluyoruz ve 'processed' flag'ini koyuyoruz
    const riskLevel = ev.metadata?.risk_segment || 'medium';
    const payload: PushPayload = {
      title: riskLevel === 'high' ? 'Odi.Pet Seni Özledi 🐾' : 'Neler Yapıyorsun?',
      body: riskLevel === 'high' 
        ? 'Dostunun eksik bilgilerini tamamlamak için uygulamamıza dön!' 
        : 'Patili dostunun profiline yeni bilgiler eklemek ister misin?',
      url: '/owner/pets'
    };

    // BURADA subs varsa döngüyle sendWebPush(...) çalıştırılır
    // Örn: await sendWebPush(sub.subscription_object, payload);

    // Event'in metadata'sını update edip işlendi (processed: true) işaretliyoruz
    const updatedMetadata = { ...ev.metadata, processed: true, sent_payload: payload };
    await supabase
      .from('event_stream')
      .update({ metadata: updatedMetadata })
      .eq('id', ev.id);

    processedCount++;
  }

  return { success: true, processed: processedCount };
}
