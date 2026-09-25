import { ReactNode } from 'react'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import OwnerHeader from '@/components/OwnerHeader'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SpotlightTour from '@/components/onboarding/SpotlightTour'
import DashboardPendingReferral from '@/components/DashboardPendingReferral'
import { filterNavItems, resolveNavItems } from '@/lib/modules/registry'
import { GeolocationProvider } from '@/contexts/GeolocationContext'
import { ActivePetProvider } from '@/contexts/ActivePetContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { cookies } from 'next/headers'
import { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['owner', 'admin', 'founder'])
  if (!profile) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const cookieStore = await cookies()
  const initialActivePetId = cookieStore.get('active_pet_id')?.value || null
  const initialActivePetName = cookieStore.get('active_pet_name')?.value || null

  const [
    { data: pets },
    { data: onboardingData },
    { count: unreadCount },
    { data: navItems }
  ] = await Promise.all([
    supabase
      .from('pets')
      .select('*')
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
    supabase
      .from('navigation_items')
      .select('*')
      .eq('is_active', true)
      .order('order_index'),
  ])

  const activePets = ((pets || []) as any[]).filter(p => !p.is_archived)
  const petCount = activePets.length
  const primaryPet = activePets.length > 0 ? activePets[0] : null

  // Owner sayfalarında navigasyon her zaman görünür olmalıdır
  const showNav = true

  const userCities = Array.from(new Set(activePets.map(p => p.city).filter(Boolean))) as string[]

  // Modül kaydı (src/lib/modules/registry.ts) tek yetkili kaynaktır:
  // kapalı modüle işaret eden navigation_items satırları düşürülür, DB'de
  // karşılığı olmayan canlı modüller (ör. Takvim) eklenir.
  const bottomNavItems = resolveNavItems(
    navItems?.filter(i => i.slot === 'bottom_nav'),
    'bottom_nav'
  )

  const menuDrawerItems = resolveNavItems(
    navItems?.filter(i => i.slot === 'menu_drawer'),
    'side_shortcut'
  )

  const sidePrimaryItems = resolveNavItems(
    navItems?.filter(i => i.slot === 'side_primary'),
    'side_primary'
  )

  // Hızlı ekle menüsü modül kaydında tanımlı değil; yalnızca süzülür.
  const actionMenuItems = filterNavItems(
    navItems?.filter(i => i.slot === 'action_menu')
  )

  return (
    <GeolocationProvider>
      <ActivePetProvider 
        initialPets={activePets} 
        initialActivePetId={initialActivePetId}
        initialActivePetName={initialActivePetName}
      >
        <NavigationProvider>
          <div className="flex min-h-dvh flex-col font-sans">

            {/* Minimal Responsive Header */}
            <OwnerHeader userCities={userCities} unreadCount={unreadCount ?? 0} />

            {/* Desktop Sidebar + Mobile Scroll Content */}
            <div className="flex flex-1 w-full max-w-full lg:max-w-[1440px] mx-auto min-w-0">

              {/* Desktop / Collapsible Sidebar Nav */}
              {showNav && (
                <SideNav 
                  actionMenuItems={actionMenuItems} 
                  bottomNavItems={bottomNavItems} 
                  menuDrawerItems={menuDrawerItems}
                  sidePrimaryItems={sidePrimaryItems}
                />
              )}

              {/* Main Content */}
              <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 pb-28 lg:pb-10 transition-all">
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
        </NavigationProvider>
      </ActivePetProvider>
    </GeolocationProvider>
  )
}
