import webpush from 'web-push';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { writeEvent } from '@/lib/agents/orchestrator/eventContract'

// Lazy VAPID init — modül yüklenirken değil, ilk kullanımda çağrılır.
// Bu sayede Vercel build sırasında env key eksikse crash olmaz.
let vapidInitialized = false;
function ensureVapidInitialized() {
  if (vapidInitialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID anahtarları tanımlı değil. NEXT_PUBLIC_VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY env değişkenlerini kontrol edin.');
  }
  webpush.setVapidDetails('mailto:support@odi.pet', publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendWebPush(subscription: webpush.PushSubscription, payload: PushPayload) {
  try {
    ensureVapidInitialized();
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

export async function processHealthEvents() {
  const cookieStore = await cookies()
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
    if (ev.metadata?.processed) continue;

    const riskLevel = ev.metadata?.risk_level || 'medium';
    const payload: PushPayload = {
      title: riskLevel === 'high' ? 'Odi.Pet Seni Özledi 🐾' : 'Neler Yapıyorsun?',
      body: riskLevel === 'high' 
        ? 'Dostunun eksik bilgilerini tamamlamak için uygulamamıza dön!' 
        : 'Patili dostunun profiline yeni bilgiler eklemek ister misin?',
      url: '/owner/pets'
    };

    // sendWebPush success mock
    await writeEvent(supabase, ev.profile_id, 'notification_sent', {
      channel: 'web_push',
      trigger_event: 'churn_risk_detected'
    });

    const updatedMetadata = { ...ev.metadata, processed: true, sent_payload: payload };
    await supabase
      .from('event_stream')
      .update({ metadata: updatedMetadata })
      .eq('id', ev.id);

    processedCount++;
  }

  return { success: true, processed: processedCount };
}
