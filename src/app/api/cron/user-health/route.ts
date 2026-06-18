import { NextResponse } from 'next/server';
import { calculateChurnRisk, emitHealthEvent } from '@/lib/agents/userHealthAgent';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Sadece Vercel Cron veya secret yetkisi ile tetiklenmesi için
export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      new URL(request.url).searchParams.get('token') !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = cookies()
    // Hizmet rolü (Service Role) key'i gerekir çünkü admin işlemleri
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {} // Read-only in this context
        },
      }
    )

    // Data Quality sisteminin tamamlandığı farz edilerek, mock veya genel profil datası alınır.
    // Şimdilik test amaçlı aktif profilleri çekelim.
    // Gerçekte: select id, completeness_score, updated_at from profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, updated_at');

    if (error) throw error;
    
    let processed = 0;
    let highRisks = 0;

    for (const profile of profiles || []) {
      // Mock Completeness Score (Data Quality Agent'dan gelecektir)
      const mockCompleteness = Math.floor(Math.random() * 100); 

      // Risk Hesapla
      const { segment, days_inactive } = calculateChurnRisk(mockCompleteness, profile.updated_at);

      // Sadece Orta ve Yüksek riskte event at
      if (segment === 'high' || segment === 'medium') {
        const success = await emitHealthEvent(profile.id, segment, {
          completeness_score: mockCompleteness,
          days_inactive,
          action_required: 'trigger_notification'
        });

        if (success && segment === 'high') highRisks++;
      }
      processed++;
    }

    return NextResponse.json({
      success: true,
      message: 'User Health Analysis completed',
      stats: {
        total_processed: processed,
        high_risk_detected: highRisks
      }
    });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
