import { ReactNode } from 'react'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import FloatingSOS from '@/components/FloatingSOS'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['owner'])
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()

  const [{ count: petCount }, { data: onboardingData }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('pets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', profile.id),
    supabase
      .from('onboarding_progress')
      .select('wizard_completed')
      .eq('profile_id', profile.id)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('is_read', false),
  ])

  const showNav = (petCount ?? 0) > 0 && onboardingData?.wizard_completed === true

  const initial = profile.first_name?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-screen flex-col font-sans">

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <Link href="/owner/dashboard" className="flex items-center gap-2.5 hover:scale-[1.02] transition-transform">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-primary/20 border border-border-main bg-white p-0.5">
            <Image 
              src="/logo.jpg" 
              alt="Odi Logo" 
              width={40} 
              height={40}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <span className="text-[18px] font-black text-text-primary tracking-tighter hidden sm:block">Odi.Pet</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* SOS Button */}
          <FloatingSOS />
          
          {/* Notifications */}
          <NotificationBell initialCount={unreadCount ?? 0} />
          {/* Avatar */}
          <Link href="/owner/profile" className="w-11 h-11 rounded-full bg-primary-soft border-2 border-white shadow-sm flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all">
            <span className="text-primary font-extrabold text-[14px]">{initial}</span>
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar + Mobile Scroll Content */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Desktop Sidebar Nav */}
        {showNav && <SideNav />}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-32 md:pb-10 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Glass Bottom Nav */}
      {showNav && <BottomNav />}
    </div>
  )
}
