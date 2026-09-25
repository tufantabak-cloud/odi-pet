'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useActivePetStore, SimplePet } from '@/store/activePetStore'

interface ActivePetContextValue {
  activePetId: string | null
  activePetName: string | null
  setActivePetId: (idOrName: string | null) => void
  activePet: SimplePet | null
  pets: SimplePet[]
}

const ActivePetContext = createContext<ActivePetContextValue | undefined>(undefined)

export function ActivePetProvider({
  children,
  initialPets = [],
  initialActivePetId = null,
  initialActivePetName = null,
}: {
  children: React.ReactNode
  initialPets?: SimplePet[]
  initialActivePetId?: string | null
  initialActivePetName?: string | null
}) {
  const {
    activePetId,
    activePetName,
    setActivePetId,
    pets,
    setPets,
    initFromStorageAndUrl,
  } = useActivePetStore()

  // Initialize pets from server layout if available
  useEffect(() => {
    if (initialPets && initialPets.length > 0) {
      setPets(initialPets)
    }
  }, [initialPets, setPets])

  // Initialize active pet from SSR cookie or storage/URL
  useEffect(() => {
    if ((initialActivePetId || initialActivePetName) && !activePetId && !activePetName) {
      setActivePetId(initialActivePetId || initialActivePetName)
    }
    initFromStorageAndUrl()
  }, [initialActivePetId, initialActivePetName, activePetId, activePetName, setActivePetId, initFromStorageAndUrl])

  // Storage and cross-tab/window event listeners
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'active_pet_id' ||
        e.key === 'odi_active_pet_id' ||
        e.key === 'selected_pet_id' ||
        e.key === 'last_active_pet_id'
      ) {
        if (e.newValue && e.newValue !== activePetId) {
          setActivePetId(e.newValue)
        }
      }
    }

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.petId && detail.petId !== activePetId) {
        setActivePetId(detail.petId)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('odi:active_pet_changed', handleCustom)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('odi:active_pet_changed', handleCustom)
    }
  }, [activePetId, setActivePetId])

  const activePet = useMemo(() => {
    if (!pets || pets.length === 0) return null
    if (activePetId) {
      const found = pets.find(p => p.id === activePetId)
      if (found) return found
    }
    if (activePetName) {
      const trimmed = activePetName.trim().toLowerCase()
      const found = pets.find(p => (p.name || '').trim().toLowerCase() === trimmed)
      if (found) return found
    }
    return pets[0] || null
  }, [pets, activePetId, activePetName])

  const value = useMemo(
    () => ({
      activePetId: activePet?.id || activePetId,
      activePetName: activePet?.name || activePetName,
      setActivePetId,
      activePet,
      pets,
    }),
    [activePetId, activePetName, setActivePetId, activePet, pets]
  )

  return (
    <ActivePetContext.Provider value={value}>
      {children}
    </ActivePetContext.Provider>
  )
}

export function useActivePet<T extends SimplePet = SimplePet>(componentPets?: T[]) {
  const context = useContext(ActivePetContext)
  const store = useActivePetStore()

  const activePetId = context ? context.activePetId : store.activePetId
  const activePetName = context ? context.activePetName : store.activePetName
  const setActivePetId = context ? context.setActivePetId : store.setActivePetId
  const contextPets = context ? context.pets : store.pets

  // Register component pets with store if provided
  useEffect(() => {
    if (componentPets && componentPets.length > 0) {
      store.setPets(componentPets)
    }
  }, [componentPets, store])

  const effectivePets = (componentPets && componentPets.length > 0) ? componentPets : (contextPets as T[])

  const activePet = useMemo(() => {
    if (!effectivePets || effectivePets.length === 0) return null
    if (activePetId) {
      const found = effectivePets.find(p => p.id === activePetId)
      if (found) return found
    }
    if (activePetName) {
      const trimmed = activePetName.trim().toLowerCase()
      const found = effectivePets.find(p => (p.name || '').trim().toLowerCase() === trimmed)
      if (found) return found
    }
    return effectivePets[0] || null
  }, [effectivePets, activePetId, activePetName])

  return {
    activePetId: activePet?.id || activePetId,
    activePetName: activePet?.name || activePetName,
    setActivePetId,
    activePet,
    pets: effectivePets,
  }
}
