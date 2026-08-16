import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

// GÜVENLİK DÜZELTMESİ: Bu endpoint önceden hiçbir kimlik/rol kontrolü
// yapmıyordu ("MOCK"). `vet_reviews` RLS'i (`profile_id = auth.uid()`)
// SELECT'i teknik olarak yalnızca çağıranın KENDİ inceleme kayıtlarıyla
// sınırlıyordu (bu yüzden veri sızıntısı yoktu), ama bu da "veteriner görev
// havuzu" özelliğinin işlevsel olarak hiç çalışmadığı, sadece pet owner'ın
// kendi (genelde boş) kayıtlarını gördüğü anlamına geliyordu. claim/complete
// ile tutarlılık için aynı 'vet' rol zorunluluğu eklendi.
export async function GET(req: NextRequest) {
  const vetProfile = await requireRole(['vet', 'admin', 'founder'])
  if (!vetProfile) {
    return NextResponse.json({ error: 'Forbidden: vet role required' }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  
  // 3. GÖREV HAVUZU (CORE ENGINE) - Fetch pending
  const { data: reviews, error } = await supabase
    .from('vet_reviews')
    .select('*, predictive_insights(*, pets(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true }) // FIFO
    .limit(10)

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  return NextResponse.json({ success: true, queue: reviews })
}
