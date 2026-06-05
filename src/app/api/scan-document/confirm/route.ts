import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'



export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Auth kontrolü
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { pet_id, record_type, parsed_data } = body

    if (!pet_id || !record_type || !parsed_data) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    // Çağrılacak RPC fonksiyonu: process_smart_scan_results
    const { data, error } = await supabase.rpc('process_smart_scan_results', {
      p_pet_id: pet_id,
      p_record_type: record_type,
      p_parsed_data: parsed_data
    });

    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: 'Veritabanına kaydedilirken bir hata oluştu.' }, { status: 500 })
    }

    // İsteğe bağlı olarak taranmış sonucu logs tablosuna ekleyebiliriz veya silebiliriz.
    // Şimdilik sadece başarılı yanıt dönelim.

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error: any) {
    console.error('Confirm Scan Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
