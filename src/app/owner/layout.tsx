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
import { Gift } from 'lucide-react'
import { filterNavItems, resolveNavItems } from '@/lib/modules/registry'

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
    <div className="flex min-h-dvh flex-col font-sans">

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <Link href="/owner/dashboard" className="flex items-center gap-2.5 hover:scale-[1.02] transition-transform">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-[var(--color-primary)]">
            <Image
              src="/brand/app-icons/odi-icon-512.png"
              alt="Odi Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="text-[18px] font-black text-text-primary tracking-tighter">Odi</span>
          <span className="text-[12px] font-bold text-[var(--color-primary)] tracking-tight">
            Can Dost Yaşam Platformu
          </span>
        </Link>

        <div className="flex items-center gap-3">

          <FloatingLostPets userCities={userCities} />

          {/* Arkadaşını Davet Et — sade hediye ikonu (alarm rozetsiz, zille yarışmaz) */}
          <Link
            href="/owner/referral"
            aria-label="Arkadaşını davet et"
            className="w-11 h-11 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main text-text-secondary transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Gift className="w-5 h-5 text-text-secondary" />
          </Link>

          {/* Notifications */}
          <NotificationBell initialCount={unreadCount ?? 0} />
        </div>
      </header>

      {/* Desktop Sidebar + Mobile Scroll Content */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Desktop Sidebar Nav */}
        {showNav && (
          <SideNav 
            actionMenuItems={actionMenuItems} 
            bottomNavItems={bottomNavItems} 
            menuDrawerItems={menuDrawerItems}
            sidePrimaryItems={sidePrimaryItems}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-0 min-w-0">
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
