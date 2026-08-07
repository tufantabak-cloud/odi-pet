import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function IndexPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  if (params.code) {
    redirect(`/api/auth/callback?code=${params.code}`)
  }

  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (profile?.role === 'owner') {
    redirect('/owner/dashboard')
  } else if (profile?.role === 'vet') {
    redirect('/clinic/dashboard')
  } else if (profile?.role === 'admin') {
    redirect('/admin')
  } else if (profile?.role === 'founder') {
    redirect('/admin')
  }

  // Fallback (profil rolü db'de hatalı veya beklenen rollerden değilse)
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card-base p-6 text-center">
         <h1 className="text-xl font-bold text-error">Yetkisiz Rol</h1>
         <p className="text-text-secondary mt-2">Hesabınızın uyguniyet statüsü belirsiz. Yöneticinize başvurun.</p>
      </div>
    </div>
  )
}

