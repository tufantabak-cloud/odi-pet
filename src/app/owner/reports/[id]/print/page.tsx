import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type RouteParams = {
  id: string
}

type SearchParams = {
  type?: string
  range?: string
  token?: string
}

export default async function PrintReportPage({ 
  params: paramsPromise,
  searchParams: searchParamsPromise
}: { 
  params: Promise<RouteParams>,
  searchParams: Promise<SearchParams>
}) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: pet } = await supabase.from('pets').select('*').eq('id', params.id).single()

  if (!pet) {
    return <div className="p-10 text-center font-bold text-lg">Pet bulunamadı.</div>
  }

  // Fetch completed vaccines from vaccine_records_v2
  const { data: v2Vaccines } = await supabase
    .from('vaccine_records_v2')
    .select('*')
    .eq('pet_id', params.id)
    .eq('status', 'completed')
    .order('administered_at', { ascending: false })
    .limit(5)

  let displayVaccines = (v2Vaccines || []).map((v: any) => ({
    id: v.id,
    vaccine_name: v.vaccine_name,
    administered_at: v.administered_at || v.due_at,
  }))

  // Fallback to legacy vaccine_records if v2 is empty
  if (displayVaccines.length === 0) {
    const { data: oldVaccines } = await supabase
      .from('vaccine_records')
      .select('*, vaccines(name)')
      .eq('pet_id', params.id)
      .order('applied_date', { ascending: false })
      .limit(5)
    
    if (oldVaccines) {
      displayVaccines = oldVaccines.map((v: any) => ({
        id: v.id,
        vaccine_name: v.vaccines?.name || 'Aşı',
        administered_at: v.applied_date,
      }))
    }
  }

  // Fetch illnesses/incidents from health_diseases
  const { data: incidents } = await supabase
    .from('health_diseases')
    .select('*')
    .eq('pet_id', params.id)
    .order('diagnosis_date', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-3xl mx-auto p-10 bg-white min-h-dvh text-black">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-6 mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Odi.Pet Sağlık Raporu</h1>
          <p className="text-gray-500 mt-1">
            Rapor Türü: {searchParams.type === 'summary' ? 'Hızlı Özet' : searchParams.type || 'Hızlı Özet'} • 
            Tarih Aralığı: {searchParams.range === 'last_12_months' ? 'Son 12 Ay' : 'Tüm Geçmiş'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl">{pet.name}</p>
          <p className="text-sm text-gray-500 capitalize">
            {pet.species === 'dog' || pet.species?.toLowerCase() === 'köpek' ? 'Köpek' : pet.species === 'cat' || pet.species?.toLowerCase() === 'kedi' ? 'Kedi' : pet.species} • {pet.breed || 'Irk Belirtilmemiş'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Son Aşılar</h2>
          {displayVaccines.length > 0 ? (
            <ul className="space-y-3">
              {displayVaccines.map((v: any) => (
                <li key={v.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0">
                  <span className="font-bold text-gray-700">{v.vaccine_name}</span>
                  <span className="text-gray-500">{new Date(v.administered_at).toLocaleDateString('tr-TR')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Kayıtlı aşı bulunmuyor.</p>
          )}
        </div>

        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Son Sağlık Vakaları</h2>
          {incidents && incidents.length > 0 ? (
            <ul className="space-y-3">
              {incidents.map((i: any) => (
                <li key={i.id} className="flex flex-col text-sm border-b border-gray-200 pb-2 last:border-0">
                  <span className="font-bold text-gray-700">{i.disease_name}</span>
                  <span className="text-gray-500">{new Date(i.diagnosis_date).toLocaleDateString('tr-TR')}</span>
                  {i.treatment && <span className="text-xs text-gray-400 mt-0.5">Tedavi: {i.treatment}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Kayıtlı vaka bulunmuyor.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 pt-6 mt-12 text-center text-sm text-gray-400">
        <p>Bu rapor Odi.Pet tarafından otomatik olarak oluşturulmuştur. Medikal tavsiye yerine geçmez.</p>
        <p className="mt-1">Tarih: {new Date().toLocaleDateString('tr-TR')} • Doğrulama Token: {searchParams.token || 'Geçici Rapor'}</p>
      </div>
      
      {/* Print Trigger */}
      <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { setTimeout(function() { window.print(); }, 800); }` }} />
    </div>
  )
}
