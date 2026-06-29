export type SpeciesValue = 
  'cat' | 'dog' | 'kedi' | 'köpek' | 
  'Kedi' | 'Köpek' | string

export function normalizeSpecies(
  species: SpeciesValue | null | undefined
): 'cat' | 'dog' | 'other' {
  if (!species) return 'other'
  const s = species.toLowerCase().trim()
  if (s === 'cat' || s === 'kedi') 
    return 'cat'
  if (s === 'dog' || s === 'köpek' || 
      s === 'kopek') 
    return 'dog'
  return 'other'
}

export function getSpeciesLabel(
  species: SpeciesValue | null | undefined
): string {
  const normalized = normalizeSpecies(species)
  if (normalized === 'cat') return 'Kedi'
  if (normalized === 'dog') return 'Köpek'
  return 'Diğer'
}

export function getSpeciesEmoji(
  species: SpeciesValue | null | undefined
): string {
  const normalized = normalizeSpecies(species)
  if (normalized === 'cat') return '🐱'
  if (normalized === 'dog') return '🐶'
  return '🐾'
}

export function getSpeciesIcon(
  species: SpeciesValue | null | undefined
): string {
  const normalized = normalizeSpecies(species)
  if (normalized === 'cat') return 'ti-cat'
  if (normalized === 'dog') return 'ti-dog'
  return 'ti-paw'
}
