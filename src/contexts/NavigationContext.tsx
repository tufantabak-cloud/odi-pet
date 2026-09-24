'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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

  // Initialize from URL params (?viewport=mobile, ?mobile=true) and window size
  useEffect(() => {
    const checkViewport = () => {
      const isMobileWidth = typeof window !== 'undefined' && window.innerWidth < 1024
      let isForcedMobile = false

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('viewport') === 'mobile' || params.get('mobile') === 'true' || params.get('mobile') === '1') {
          isForcedMobile = true
        }
        if (document.cookie.includes('odi_viewport=mobile')) {
          isForcedMobile = true
        }
      }

      setIsMobileViewport(isMobileWidth || isForcedMobile)
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
