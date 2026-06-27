import { ReactNode } from 'react'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import FloatingLostPets from '@/components/FloatingLostPets'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SpotlightTour from '@/components/onboarding/SpotlightTour'
import DashboardPendingReferral from '@/components/DashboardPendingReferral'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['owner', 'admin', 'founder'])
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()

  const [{ data: pets }, { data: onboardingData }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('pets')
      .select('id, name, vet_phone, vet_name, sos_contacts, city')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false }),
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

  const petCount = pets?.length ?? 0
  const primaryPet = pets && pets.length > 0 ? pets[0] : null

  const showNav = petCount > 0 || onboardingData?.wizard_completed === false

  const userCities = Array.from(new Set((pets || []).map(p => p.city).filter(Boolean))) as string[]

  const { data: navItems } = await supabase
    .from('navigation_items')
    .select('*')
    .eq('is_active', true)
    .order('order_index')

  const bottomNavItems = navItems?.filter(
    i => i.slot === 'bottom_nav'
  ) ?? []

  const actionMenuItems = navItems?.filter(
    i => i.slot === 'action_menu'
  ) ?? []

  const menuDrawerItems = navItems?.filter(
    i => i.slot === 'menu_drawer'
  ) ?? []

  return (
    <div className="flex min-h-dvh flex-col font-sans">

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <Link href="/owner/dashboard" className="flex items-center gap-2.5 hover:scale-[1.02] transition-transform">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-primary/20 border border-border-main bg-white p-0.5">
            <Image 
              src="/logo.webp" 
              alt="Odi Logo" 
              width={40} 
              height={40}
              className="w-full h-full object-cover rounded-lg"
              priority
            />
          </div>
          <span className="text-[18px] font-black text-text-primary tracking-tighter hidden sm:block">Odi.Pet</span>
        </Link>

        <div className="flex items-center gap-3">

          <FloatingLostPets userCities={userCities} />
          
          {/* Notifications */}
          <NotificationBell initialCount={unreadCount ?? 0} />
        </div>
      </header>

      {/* Desktop Sidebar + Mobile Scroll Content */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Desktop Sidebar Nav */}
        {showNav && <SideNav />}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-10 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Glass Bottom Nav */}
      {showNav && (
        <BottomNav
          bottomNavItems={bottomNavItems}
          actionMenuItems={actionMenuItems}
          menuDrawerItems={menuDrawerItems}
        />
      )}

      <SpotlightTour />
      <DashboardPendingReferral />
    </div>
  )
}
