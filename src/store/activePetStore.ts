import { create } from 'zustand'

export interface SimplePet {
  id: string
  name?: string | null
  [key: string]: any
}

interface ActivePetState {
  activePetId: string | null
  activePetName: string | null
  pets: SimplePet[]
  setActivePetId: (idOrName: string | null) => void
  setPets: (pets: SimplePet[]) => void
  initFromStorageAndUrl: () => void
}

function normalizePetName(str: string): string {
  return str
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .toLowerCase()
}

export function matchPet(pets: SimplePet[], idOrName: string | null | undefined): SimplePet | null {
  if (!idOrName || !pets || pets.length === 0) return null
  const byId = pets.find(p => p.id === idOrName)
  if (byId) return byId

  const normTarget = normalizePetName(idOrName)
  const byExactName = pets.find(p => p.name && normalizePetName(p.name) === normTarget)
  if (byExactName) return byExactName

  const byPartial = pets.find(p => p.name && (normalizePetName(p.name).includes(normTarget) || normTarget.includes(normalizePetName(p.name))))
  if (byPartial) return byPartial

  return null
}

export const useActivePetStore = create<ActivePetState>((set, get) => ({
  activePetId: null,
  activePetName: null,
  pets: [],

  setPets: (newPets: SimplePet[]) => {
    const prevPets = get().pets
    // Only update if pets have changed
    if (JSON.stringify(prevPets.map(p => p.id)) !== JSON.stringify(newPets.map(p => p.id))) {
      set({ pets: newPets })
    }
    const { activePetId, activePetName } = get()
    if (!activePetId && !activePetName && newPets.length > 0) {
      get().initFromStorageAndUrl()
    } else if (newPets.length > 0 && (activePetId || activePetName)) {
      // Re-resolve against new pets to ensure both ID and Name are populated
      const matched = matchPet(newPets, activePetId) || matchPet(newPets, activePetName)
      if (matched && (matched.id !== activePetId || matched.name !== activePetName)) {
        set({ activePetId: matched.id, activePetName: matched.name || null })
      }
    }
  },

  setActivePetId: (idOrName: string | null) => {
    if (!idOrName) {
      set({ activePetId: null, activePetName: null })
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('active_pet_id')
          localStorage.removeItem('odi_active_pet_id')
          localStorage.removeItem('selected_pet_id')
          localStorage.removeItem('active_pet_name')
          document.cookie = 'active_pet_id=; path=/; max-age=0'
          document.cookie = 'active_pet_name=; path=/; max-age=0'
          window.dispatchEvent(
            new CustomEvent('odi:active_pet_changed', { detail: { petId: null, petName: null } })
          )
        } catch {
          // Ignore storage errors
        }
      }
      return
    }

    const { pets } = get()
    const matched = matchPet(pets, idOrName)
    const finalId = matched ? matched.id : idOrName
    const finalName = matched?.name || (idOrName !== finalId ? idOrName : null)

    set({ activePetId: finalId, activePetName: finalName })

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('active_pet_id', finalId)
        localStorage.setItem('odi_active_pet_id', finalId)
        localStorage.setItem('selected_pet_id', finalId)
        localStorage.setItem('last_active_pet_id', finalId)
        if (finalName) {
          localStorage.setItem('active_pet_name', finalName)
          localStorage.setItem('last_active_pet_name', finalName)
        }
        document.cookie = `active_pet_id=${encodeURIComponent(finalId)}; path=/; max-age=31536000; SameSite=Lax`
        if (finalName) {
          document.cookie = `active_pet_name=${encodeURIComponent(finalName)}; path=/; max-age=31536000; SameSite=Lax`
        }
        window.dispatchEvent(
          new CustomEvent('odi:active_pet_changed', { detail: { petId: finalId, petName: finalName } })
        )
      } catch {
        // Ignore storage errors
      }
    }
  },

  initFromStorageAndUrl: () => {
    if (typeof window === 'undefined') return
    const { pets, activePetId, activePetName } = get()

    // 1. Check URL query parameters
    let urlPet: string | null = null
    try {
      const params = new URLSearchParams(window.location.search)
      urlPet = params.get('pet') || params.get('petId') || params.get('pet_id')
    } catch {}

    // 2. Check localStorage
    let storedPet: string | null = null
    let storedPetName: string | null = null
    try {
      storedPet =
        localStorage.getItem('active_pet_id') ||
        localStorage.getItem('odi_active_pet_id') ||
        localStorage.getItem('selected_pet_id') ||
        localStorage.getItem('last_active_pet_id')

      storedPetName =
        localStorage.getItem('active_pet_name') ||
        localStorage.getItem('last_active_pet_name')
    } catch {}

    // 3. Check Cookie
    let cookiePet: string | null = null
    let cookiePetName: string | null = null
    try {
      const matchId = document.cookie.match(/(?:^|;\s*)active_pet_id=([^;]+)/)
      if (matchId) cookiePet = decodeURIComponent(matchId[1])
      const matchName = document.cookie.match(/(?:^|;\s*)active_pet_name=([^;]+)/)
      if (matchName) cookiePetName = decodeURIComponent(matchName[1])
    } catch {}

    const candidate = urlPet || storedPet || storedPetName || cookiePet || cookiePetName || activePetId || activePetName

    if (candidate) {
      const matched = matchPet(pets, candidate)
      const finalId = matched ? matched.id : candidate
      const finalName = matched?.name || (candidate !== finalId ? candidate : null)
      set({ activePetId: finalId, activePetName: finalName })
    } else if (pets.length > 0) {
      set({ activePetId: pets[0].id, activePetName: pets[0].name || null })
    }
  },
}))
