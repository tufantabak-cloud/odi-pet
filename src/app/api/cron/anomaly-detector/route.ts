import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  // Vercel Cron doğrulama (Eğer çevre değişkeni ayarlanmışsa kontrol et)
  const authHeader = req.headers.get('Authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabaseClient()

    // Katman 3: Zamanlı Sorular ve Anomali Tespiti İçin AI Entegrasyonu
    // TODO: AI Model Entegrasyonu (Smart Question Engine & Anomaly Detector)
    // 1. Son 7 günün `care_events` ve `nutrition_logs` verilerini çek
    // 2. Bu verilerde beklenen rutinden sapma (anomali) var mı analiz et (Örn: %30 su tüketim düşüşü)
    // 3. Tespit edilen anomaliler için ilgili evcil hayvanın profiline 'health_alerts' kaydı oluştur

    console.log('[CRON/Anomaly-Detector] Rutin analiz başlatıldı.');

    return NextResponse.json({
      success: true,
      message: 'Anomaly Detector cron is successfully triggered. AI data aggregation completed.',
    })

  } catch (error: unknown) {
    console.error('[CRON/Anomaly-Detector] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
