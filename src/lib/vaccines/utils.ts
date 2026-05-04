export const COMMON_ALIASES: Record<string, string[]> = {
  // Dog Vaccines
  'PUPPY_DP': ['DP', 'Puppy DP'],
  'DHPPI': ['DHPPi', 'DHPPi2', 'Vanguard', 'Nobivac', 'Eurican', 'Karma'],
  'DHPPI_Y': ['DHPPi', 'DHPPi2', 'Vanguard', 'Nobivac', 'Eurican', 'Karma', 'Yıllık'],
  'LEPTO': ['L', 'L4', 'L5', 'Lepto', 'Leptospira'],
  'LEPTO_Y': ['L', 'L4', 'L5', 'Lepto', 'Leptospira', 'Yıllık'],
  'RABIES': ['R', 'Rabies', 'Defensor', 'Kuduz'],
  'BORDET': ['Bb/Pi2 - KC', 'Bb', 'Pi2', 'KC', 'Nobivac KC', 'Pneumodog', 'Boğmaca', 'Bordetella'],
  'BORDET_Y': ['Bb/Pi2 - KC', 'Bb', 'Pi2', 'KC', 'Nobivac KC', 'Pneumodog', 'Boğmaca', 'Bordetella', 'Yıllık'],
  'CCV': ['CCV', 'Corona', 'C'],
  'CCV_Y': ['CCV', 'Corona', 'C', 'Yıllık'],
  'LYME': ['B', 'Lyme', 'Borrelia', 'Biocan B'],
  'RINGW': ['Mantar', 'Biocan M', 'Ringworm'],
  'RINGW_CAT': ['Mantar', 'Biocan M', 'Ringworm'],
  
  // Cat Vaccines
  'FVRCP': ['FVRCP', 'RCP', 'Tricat', 'Felocell', 'Karma'],
  'FVRCP_Y': ['FVRCP', 'RCP', 'Tricat', 'Felocell', 'Karma', 'Yıllık'],
  'FELV': ['FeLV', 'Leukemia', 'Leukocell', 'Lösemi'],
  'FELV_Y': ['FeLV', 'Leukemia', 'Leukocell', 'Lösemi', 'Yıllık'],
  'RABIES_CAT': ['R', 'Rabies', 'Kuduz'],
  
  // Parasites
  'EXTERNAL_PARASITE_CAT': ['Dış Parazit', 'Pire/Kene', 'Dış'],
  'INTERNAL_PARASITE_CAT': ['İç Parazit', 'İç', 'Tenya'],
  'EXTERNAL_PARASITE_DOG': ['Dış Parazit', 'Pire/Kene', 'Dış'],
  'INTERNAL_PARASITE_DOG': ['İç Parazit', 'İç', 'Kıl Kurdu'],
}

export function getDisplayName(name: string, code: string) {
  const alias = COMMON_ALIASES[code]?.[0] || ''
  
  // 1. Precise cleaning: Only remove dose and year repetitions, keep original parentheses like (Bordetella)
  let cleanName = name
    .replace(/\(\d+\.?\s?(Doz|Yıl|Yıllık).*?\)/gi, '') // Removes (1. Doz), (2. Yıl Tekrarı)
    .replace(/\d+\.?\s?(Doz|Yıl|Yıllık).*$/gi, '')    // Removes suffixes like 1. Doz at end
    .trim()

  // 2. Format: Clean Name + Alias
  if (!alias) return cleanName
  
  // If alias is already part of the clean name as a distinct word/code, don't repeat
  // We use word boundaries to avoid false positives (e.g., 'L' in 'Leptospira')
  const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape for regex
  const hasAliasAsWord = new RegExp(`\\b${escapedAlias}\\b`, 'i').test(cleanName);
  
  if (hasAliasAsWord) return cleanName;
  
  return `${cleanName} ${alias}`
}
