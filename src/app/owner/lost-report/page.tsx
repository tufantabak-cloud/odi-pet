import { redirect } from 'next/navigation'

import { WizardForm } from '@/components/lost-report/WizardForm'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function LostReportPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?reason=session_expired')

  const supabase = await createServerSupabaseClient()
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species')
    .eq('owner_id', user.id)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Kayıp İhbarı Oluştur</h1>
        <p className="mt-2 text-gray-600">Lütfen adımları takip ederek kayıp evcil hayvanınızın bilgilerini girin.</p>
      </div>
      
      <WizardForm pets={pets ?? []} />
    </div>
  );
}
