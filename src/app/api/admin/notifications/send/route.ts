import { NextResponse } from 'next/server';
import { sendWebPush, PushPayload } from '@/lib/agents/notificationAgent';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
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

    // Oturum kontrolü (Admin mi?)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profile_id, title, message } = body;

    if (!profile_id || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalde kullanıcının push aboneliğini DB'den (örn push_subscriptions tablosu) çekeriz.
    // Şimdilik sistemin altyapısı kurulduğu için temsili success dönüyoruz.
    // İleride: const { data: sub } = await supabase.from('push_subscriptions').eq('profile_id', profile_id).single();
    
    // Test Mock'u
    const payload: PushPayload = {
      title,
      body: message,
      url: '/'
    };

    // İleride: await sendWebPush(sub.subscription_object, payload);

    return NextResponse.json({
      success: true,
      message: 'Manuel bildirim tetiklendi (Mock)',
      payload
    });

  } catch (error: any) {
    console.error('Manual Push Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
