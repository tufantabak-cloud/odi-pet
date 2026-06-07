import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  // Vercel Cron doğrulama (Gerekirse Authorization header'ı kontrol edilebilir)
  // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  try {
    const supabase = createAdminSupabaseClient()

    // Süresi dolmuş ve hala aktif olan kartları bul ve is_active = false yap
    const { data, error } = await supabase
      .from('shared_pet_cards')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select('id')

    if (error) {
      console.error('[CRON/Expire-Cards] Update error:', error)
      return NextResponse.json({ error: 'Güncelleme hatası.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${data?.length || 0} kart süresi dolduğu için pasife alındı.`,
      expired_cards: data?.map(c => c.id) || []
    })

  } catch (error: unknown) {
    console.error('[CRON/Expire-Cards] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
