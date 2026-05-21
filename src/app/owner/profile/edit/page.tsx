import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'
import Link from 'next/link'

export default async function EditProfilePage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full mx-auto">
      <div className="flex items-center gap-4 px-2 mb-2">
        <Link href="/owner/profile"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-surface shrink-0 shadow-sm hover:scale-[1.05] active:scale-[0.95]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </Link>
        <div>
          <h1 className="text-[24px] font-extrabold text-text-primary tracking-tight">Profili Düzenle</h1>
          <p className="text-[12px] text-text-secondary font-medium">Bilgilerinizi güncelleyip aşağıdan kaydedin.</p>
        </div>
      </div>
      
      <div className="card-base p-6">
        <EditProfileForm profile={profile} />
      </div>
    </div>
  )
}
