import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditProfilePage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full mx-auto font-sans">
      <div className="flex items-center gap-4 px-1 mb-2">
        <Link
          href="/owner/profile"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-white shrink-0 shadow-sm hover:scale-[1.05] active:scale-[0.95]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Profili Düzenle</h1>
          <p className="text-xs text-text-secondary font-medium">Bilgilerinizi güncelleyip aşağıdan kaydedin.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
        <EditProfileForm profile={profile} />
      </div>
    </div>
  )
}
