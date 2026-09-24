'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { isTestOrPreviewEnvironment } from '@/lib/testing/is-test-or-preview'

interface NavigationContextValue {
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  isMobileViewport: boolean
  setIsMobileViewport: (isMobile: boolean) => void
}

const NavigationContext = createContext<NavigationContextValue>({
  isDrawerOpen: false,
  setIsDrawerOpen: () => {},
  toggleDrawer: () => {},
  isSidebarCollapsed: false,
  setIsSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  isMobileViewport: false,
  setIsMobileViewport: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  // Initialize from URL params, test environment, and window size
  useEffect(() => {
    const checkViewport = () => {
      const isMobileWidth = typeof window !== 'undefined' && window.innerWidth < 1024
      const isTestEnv = isTestOrPreviewEnvironment()
      let isForcedMobile = isTestEnv

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('viewport') === 'mobile' || params.get('mobile') === 'true' || params.get('mobile') === '1') {
          isForcedMobile = true
        } else if (params.get('viewport') === 'desktop' || params.get('desktop') === 'true') {
          isForcedMobile = false
        }
        if (document.cookie.includes('odi_viewport=mobile')) {
          isForcedMobile = true
        } else if (document.cookie.includes('odi_viewport=desktop')) {
          isForcedMobile = false
        }
      }

      const activeMobile = isMobileWidth || isForcedMobile
      setIsMobileViewport(activeMobile)
      if (activeMobile) {
        setIsSidebarCollapsed(true)
      }
    }

    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  return (
    <NavigationContext.Provider
      value={{
        isDrawerOpen,
        setIsDrawerOpen,
        toggleDrawer,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileViewport,
        setIsMobileViewport,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
