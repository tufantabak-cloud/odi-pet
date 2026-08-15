import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// FORENSIC DÜZELTME: Bu route, `care_plans` tablosunun GERÇEK production
// şemasıyla uyuşmayan kolonlar kullanıyordu (`plan_data`, `updated_at`,
// `onConflict: 'pet_id'`). Kanıt: `care_plans` tablosu ilk olarak
// `20240420000000_init_schema.sql`'de KOŞULSUZ `CREATE TABLE` ile
// `(id, pet_id, clinic_id, title, description, due_date, created_at)`
// kolonlarıyla oluşturuldu. Daha sonra `20240518000000_care_plans.sql`
// `CREATE TABLE IF NOT EXISTS public.care_plans (id, pet_id, plan_data
// jsonb, created_at, updated_at, UNIQUE(pet_id))` çalıştırdı — ama tablo
// ZATEN var olduğu için bu ifade no-op oldu; `plan_data`, `updated_at` ve
// `UNIQUE(pet_id)` gerçek tabloya HİÇBİR ZAMAN eklenmedi (yalnızca o
// migration'ın CREATE POLICY ifadeleri, guard'a tabi olmadığı için
// gerçekten uygulandı). Sonuç: bu route hem GET'te (var olmayan
// `plan_data` kolonunu select etmeye çalışıyordu) hem POST'ta (var
// olmayan `plan_data`/`updated_at` kolonları + var olmayan bir unique
// constraint'e dayanan `onConflict: 'pet_id'`) her zaman veritabanı
// hatasıyla başarısız oluyordu — istisnasız 500.
//
// `UNIQUE(pet_id)` eklemek bilinçli olarak YAPILMADI: gerçek tablo,
// `/api/care-plans` (klinik tarafı, aynı pet için birden fazla planı
// randevu bazlı oluşturuyor) tarafından zaten pet başına ÇOKLU satır
// modeliyle kullanılıyor; bu route'u "tek JSON blob" varsayımına göre
// düzeltmek o çalışan akışı bozardı. Bunun yerine route, tabloyu zaten
// kullanan gerçek (title/description/due_date, pet başına çoklu satır)
// modeline uyarlandı. Bu endpoint'in repo genelinde hiçbir çağıranı
// bulunamadı (grep: sıfır sonuç) — yani bu düzeltme mevcut hiçbir
// kullanıcı akışını değiştirmiyor, yalnızca gerçek şemayla uyumlu hale
// getiriyor.

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Sahiplik veya aile üyesi kontrolü RLS tarafından yaptırılıyor
  // ("Users can view care_plans for their pets" — pet_owners/pet_members
  // tabanlı); bu route zaten yalnızca oturumlu kullanıcının erişebildiği
  // satırları görür.
  const { data: plans, error } = await supabase
    .from('care_plans')
    .select('id, title, description, due_date, clinic_id, created_at')
    .eq('pet_id', id)
    .order('due_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  return NextResponse.json({ care_plans: plans ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const title = body?.title
  const description = body?.description ?? null
  const dueDate = body?.due_date ?? null

  if (!title) {
    return NextResponse.json({ error: 'title zorunludur.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Sabit UNIQUE(pet_id) kısıtlaması gerçek tabloda yok (bkz. dosya başı
  // not), bu yüzden upsert/onConflict yerine düz insert kullanılıyor.
  // Sahiplik kontrolü RLS'nin INSERT WITH CHECK politikasınca yapılıyor;
  // sahip olmayan bir kullanıcının isteği RLS tarafından reddedilir.
  const { data, error } = await supabase
    .from('care_plans')
    .insert({
      pet_id: id,
      title,
      description,
      due_date: dueDate,
    })
    .select('id, title, description, due_date, clinic_id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
