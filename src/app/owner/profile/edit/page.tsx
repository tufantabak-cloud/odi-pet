import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'

export default async function EditProfilePage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full max-w-xl mx-auto">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-[24px] font-extrabold text-text-primary tracking-tight">Profili Düzenle</h1>
      </div>
      
      <div className="card-base p-6">
        <EditProfileForm profile={profile} />
      </div>
    </div>
  )
}
