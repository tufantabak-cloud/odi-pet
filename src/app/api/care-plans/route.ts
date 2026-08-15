import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

// GÜVENLİK DÜZELTMESİ (forensic bulgu): Bu route önceden `pet_id`'yi istekten
// alıp, yalnızca çağıranın BİR kliniğe üye olduğunu doğruladıktan sonra
// (`clinic_id`'yi kendi üyeliğinden alarak) doğrudan `care_plans`'a insert
// ediyordu — `pet_id` ile bu `clinic_id` arasında gerçek bir ilişki
// (randevu) hiç doğrulanmıyordu. `/clinic/pets/[id]/page.tsx` sayfasının
// zaten kullandığı kanıtlanmış desen burada da uygulandı: "pet_id
// clinic_id'ye ait bir appointments kaydına sahip mi?"
//
// `care_plans` tablosunun RLS geçmişi tam olarak okundu (init_schema,
// multi_owner, multi_owner_rls_fix, fix_vaccine_records_rls,
// care_plans migration'ları) — INSERT/UPDATE için tanımlı HİÇBİR RLS
// politikası klinik/appointments ilişkisini tanımıyor; hepsi yalnızca
// `pets.owner_id` / `pet_owners` / `user_has_pet_access()` (household)
// tabanlı. Yani bu endpoint, normal (RLS'e tabi) client ile klinik
// tarafından yapılan HER insert'i zaten reddediyordu (meşru kullanım da
// dahil) — dolayısıyla aşağıdaki uygulama-seviyesi randevu doğrulaması,
// zaten var olan bir tabloya sahiplik yetkisi eklemiyor; yalnızca gerçek
// yetkiyi (randevu ilişkisi) doğruladıktan SONRA, RLS'in yapısal olarak
// izin veremediği bu yazma işlemini `share/revoke` ve `logbook/create`
// route'larında zaten kullanılan "önce session client ile yetki
// doğrula, sonra admin client ile yaz" deseniyle mümkün kılıyor.
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const body = await req.json().catch(() => null)

  // FormData'dan da gelebilir
  let petId: string | null = null
  let title: string | null = null
  let dueDate: string | null = null
  let description: string | null = null

  if (body) {
    petId = body.pet_id
    title = body.title
    dueDate = body.due_date
    description = body.description
  } else {
    const fd = await req.formData()
    petId = fd.get('pet_id') as string
    title = fd.get('title') as string
    dueDate = fd.get('due_date') as string
    description = fd.get('description') as string | null
  }

  if (!petId || !title || !dueDate) {
    return NextResponse.json({ error: 'pet_id, title ve due_date zorunludur.' }, { status: 400 })
  }

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user.id)
  const clinicId = memberships?.[0]?.clinic_id

  if (!clinicId) return NextResponse.json({ error: 'No clinic membership' }, { status: 403 })

  // Yetkilendirme kontrolü: bu pet, bu klinikle gerçekten ilişkili mi?
  // (`/clinic/pets/[id]/page.tsx` ile aynı desen — appointments üzerinden
  // pet_id <-> clinic_id ilişkisi.) Session client kullanılıyor; RLS
  // ("Clinic staff can view their clinic's appointments") bu SELECT'i
  // zaten çağıranın kendi clinic_id'siyle sınırlıyor, bu da ekstra bir
  // savunma katmanı sağlıyor.
  const { data: relatedAppointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id')
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId)
    .limit(1)
    .maybeSingle()

  if (appointmentError) {
    return NextResponse.json({ error: (appointmentError instanceof Error ? appointmentError.message : String(appointmentError)) }, { status: 500 })
  }

  if (!relatedAppointment) {
    return NextResponse.json(
      { error: 'Bu hasta, kliniğinizle ilişkili bir randevuya sahip değil.' },
      { status: 403 }
    )
  }

  // Yetki doğrulandı → RLS'in yapısal olarak izin veremediği bu yazmayı
  // admin client ile gerçekleştir (bkz. dosya başı not).
  const adminClient = createAdminSupabaseClient()
  const { error } = await adminClient.from('care_plans').insert({
    pet_id: petId,
    clinic_id: clinicId,
    title,
    description: description || null,
    due_date: dueDate,
  })

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath('/clinic/care-plans')
  revalidatePath('/clinic/pets')

  const targetUrl = req.headers.get('referer') ?? new URL('/clinic/care-plans', req.url).toString()
  return NextResponse.redirect(targetUrl.startsWith('http') ? targetUrl : new URL(targetUrl, req.url), 303)
}
