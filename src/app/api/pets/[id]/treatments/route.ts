import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

// FORENSIC DÜZELTME (schema-drift sweep): Bu route `title`/`description`
// kolonlarını kullanıyordu ve `health_treatments`'ın gerçek NOT NULL
// kolonu `disease_name`'i hiç sağlamıyordu.
//
// Kanıt — tam migration zinciri:
// `20240511000000_treatments_mvp.sql` tabloyu KOŞULSUZ `CREATE TABLE IF
// NOT EXISTS` ile ilk kez oluşturdu (tablo daha önce yoktu, bu yüzden
// gerçekten uygulandı): kolonlar `disease_name TEXT NOT NULL, category,
// status, start_date DATE NOT NULL DEFAULT CURRENT_DATE, end_date,
// clinic_name, treatment_methods, cost, payment_status, expense_items,
// documents`. Daha sonraki `20260626122506_health_module_tables.sql`
// AYNI tabloyu `title text NOT NULL, description text` kolonlarıyla
// yeniden `CREATE TABLE IF NOT EXISTS` ile tanımlamaya çalıştı — ama
// tablo zaten var olduğu için bu no-op oldu (yalnızca o migration'ın
// RLS policy'leri gerçekten uygulandı, kolonlar asla eklenmedi). Bu
// route'un zod şeması ve insert'i yanlışlıkla no-op olan ikinci
// tanıma göre yazılmıştı.
//
// Gerçek çağıranlar zaten doğru (gerçek) şemayı kullanıyordu:
// `PetDetailClient.tsx` (SmartScanner onSave, 2 çağrı) ve
// `ScannerClient.tsx`, ikisi de `{ disease_name, category, status,
// start_date, clinic_name?, notes? }` gönderiyor — `title`/`description`
// hiç göndermiyorlar. Yani önceki zod şeması bu isteklerde zorunlu
// `title` alanı eksik olduğu için 400 ile, olası bir `title` gönderen
// istek ise DB'de var olmayan kolon nedeniyle 500 ile başarısız
// oluyordu — GET etkilenmedi (`select('*')` şema-agnostik).
const treatmentSchema = z.object({
  disease_name: z.string().min(1, 'disease_name is required'),
  category: z.string().optional(),
  status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  clinic_name: z.string().optional(),
  treatment_methods: z.string().optional(),
  cost: z.number().optional(),
  payment_status: z.string().optional(),
  expense_items: z.string().optional(),
  documents: z.array(z.string()).optional(),
  plan_id: z.string().uuid().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('health_treatments')
    .select('*')
    .eq('pet_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = treatmentSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: treatment, error } = await supabase
    .from('health_treatments')
    .insert({
      pet_id: id,
      disease_name: result.data.disease_name,
      category: result.data.category,
      status: result.data.status,
      start_date: result.data.start_date || new Date().toISOString().split('T')[0],
      end_date: result.data.end_date,
      clinic_name: result.data.clinic_name,
      treatment_methods: result.data.treatment_methods,
      cost: result.data.cost,
      payment_status: result.data.payment_status,
      expense_items: result.data.expense_items,
      documents: result.data.documents,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (result.data.plan_id) {
    // Update the associated care plan
    const { data: plan } = await supabase
      .from('care_plans')
      .select('extra_data')
      .eq('id', result.data.plan_id)
      .single()

    const newExtraData = {
      ...(plan?.extra_data && typeof plan.extra_data === 'object' ? plan.extra_data : {}),
      treatment_id: treatment.id
    }

    await supabase
      .from('care_plans')
      .update({ status: 'completed', extra_data: newExtraData })
      .eq('id', result.data.plan_id)
  }

  return NextResponse.json({ success: true, treatment })
}
