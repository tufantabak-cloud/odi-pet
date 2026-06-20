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

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id);

    if (subsErr || !subs || subs.length === 0) {
      return NextResponse.json({ error: 'Bu kullanıcı için aktif push aboneliği bulunamadı.' }, { status: 404 });
    }
    
    const payload: PushPayload = {
      title,
      body: message,
      url: '/'
    };

    let sentCount = 0;
    const errors = [];

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key
        }
      };

      const result = await sendWebPush(pushSub as any, payload);
      if (result.success) {
        sentCount++;
      } else {
        errors.push(result.error);
        const errStatusCode = (result.error as any)?.statusCode;
        // Eğer cihaz abonelikten çıkmışsa veya silinmişse veritabanından temizle
        if (errStatusCode === 410 || errStatusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      message: sentCount > 0 ? `${sentCount} cihaza bildirim gönderildi.` : 'Bildirim gönderilemedi.',
      payload,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Manual Push Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
