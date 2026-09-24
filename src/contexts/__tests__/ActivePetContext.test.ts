import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useActivePetStore, matchPet } from '@/store/activePetStore'

describe('Active Pet Persistence & Shared State', () => {
  const mockPets = [
    { id: 'pet-1', name: 'Max', species: 'dog' },
    { id: 'pet-2', name: 'Luna', species: 'cat' },
    { id: 'pet-3', name: 'Bella', species: 'dog' },
  ]

  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'active_pet_id=; path=/; max-age=0'
    useActivePetStore.setState({
      activePetId: null,
      activePetName: null,
      pets: [],
    })
    // Reset window.location.search
    delete (window as any).location
    window.location = new URL('http://localhost:3000/owner/dashboard') as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Defaults to first pet when no persisted value exists', () => {
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    expect(useActivePetStore.getState().activePetId).toBe('pet-1')
  })

  it('2. Initializes active pet from localStorage (active_pet_id = Luna)', () => {
    localStorage.setItem('active_pet_id', 'pet-2')
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')
    expect(useActivePetStore.getState().activePetName).toBe('Luna')
  })

  it('3. Initializes active pet from localStorage by pet name (Luna)', () => {
    localStorage.setItem('active_pet_name', 'Luna')
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')
    expect(useActivePetStore.getState().activePetName).toBe('Luna')
  })

  it('4. Initializes active pet from URL query (?pet=Luna)', () => {
    window.location = new URL('http://localhost:3000/owner/dashboard?pet=Luna') as any
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')
    expect(useActivePetStore.getState().activePetName).toBe('Luna')
  })

  it('5. setActivePetId writes to localStorage and updates cookie', () => {
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    store.setActivePetId('pet-2')

    expect(useActivePetStore.getState().activePetId).toBe('pet-2')
    expect(useActivePetStore.getState().activePetName).toBe('Luna')
    expect(localStorage.getItem('active_pet_id')).toBe('pet-2')
    expect(localStorage.getItem('active_pet_name')).toBe('Luna')
    expect(document.cookie).toContain('active_pet_id=pet-2')
  })

  it('6. Preserves Luna across route transition (simulating Dashboard -> Takvim -> Dashboard)', () => {
    // On Dashboard: user selects Luna
    const store = useActivePetStore.getState()
    store.setPets(mockPets)
    store.setActivePetId('pet-2')
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')

    // Simulate navigating to Takvim: route changes, same store / localStorage
    window.location = new URL('http://localhost:3000/owner/takvim') as any
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')

    // Simulate navigating back to Dashboard (remount scenario)
    window.location = new URL('http://localhost:3000/owner/dashboard') as any
    // Remounting setPets on Dashboard
    useActivePetStore.getState().setPets(mockPets)
    expect(useActivePetStore.getState().activePetId).toBe('pet-2')
    expect(useActivePetStore.getState().activePetName).toBe('Luna')
  })
})
