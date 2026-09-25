'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Gift, Smartphone, Monitor } from 'lucide-react'
import { useNavigation } from '@/contexts/NavigationContext'
import FloatingLostPets from '@/components/FloatingLostPets'
import NotificationBell from '@/components/NotificationBell'

interface OwnerHeaderProps {
  userCities: string[]
  unreadCount: number
}

export default function OwnerHeader({ userCities, unreadCount }: OwnerHeaderProps) {
  const { toggleDrawer, toggleSidebar, isMobileViewport, setIsMobileViewport } = useNavigation()

  const handleMenuClick = () => {
    // If on mobile viewport, open the full drawer
    // If on desktop viewport, toggle the sidebar collapse state or open drawer
    if (isMobileViewport) {
      toggleDrawer()
    } else {
      toggleSidebar()
    }
  }

  const toggleMobileSimulation = () => {
    setIsMobileViewport(!isMobileViewport)
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-4 sm:px-6 lg:px-10">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile / Responsive Hamburger Drawer Toggle */}
        <button
          type="button"
          onClick={handleMenuClick}
          data-testid="header-mobile-menu-btn"
          aria-label="Menüyü Aç"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-main bg-surface hover:bg-bg-main text-text-primary transition-all cursor-pointer shadow-sm active:scale-95 min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Menu className="w-5 h-5 text-text-primary" />
        </button>

        <Link
          href="/owner/dashboard"
          className="flex items-center gap-2.5 hover:scale-[1.02] transition-transform select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-[var(--color-primary)] shrink-0">
            <Image
              src="/brand/app-icons/odi-icon-512.png"
              alt="Odi Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
            <span className="text-[18px] font-black text-text-primary tracking-tighter leading-none">Odi</span>
            <span className="hidden sm:inline-block text-[12px] font-bold text-[var(--color-primary)] tracking-tight">
              Kedi ve Köpek Yaşam Platformu
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Viewport simulation toggle for QA and automated testing */}
        <button
          type="button"
          onClick={toggleMobileSimulation}
          data-testid="viewport-toggle-btn"
          title={isMobileViewport ? 'Masaüstü Görünüme Geç' : 'Mobil Görünüme Geç'}
          aria-label={isMobileViewport ? 'Masaüstü Görünüme Geç' : 'Mobil Görünüme Geç'}
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center border border-border-main bg-surface hover:bg-bg-main text-text-secondary transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {isMobileViewport ? (
            <Monitor className="w-4 h-4 text-primary" />
          ) : (
            <Smartphone className="w-4 h-4 text-text-secondary" />
          )}
        </button>

        <FloatingLostPets userCities={userCities} />

        {/* Arkadaşını Davet Et */}
        <Link
          href="/owner/referral"
          aria-label="Arkadaşını davet et"
          data-testid="referral-invite-link"
          className="w-11 h-11 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main text-text-secondary transition-all cursor-pointer shadow-sm active:scale-95 min-h-[44px] min-w-[44px]"
        >
          <Gift className="w-5 h-5 text-text-secondary" />
        </Link>

        {/* Notifications */}
        <NotificationBell initialCount={unreadCount} />
      </div>
    </header>
  )
}
