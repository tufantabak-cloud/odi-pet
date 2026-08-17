/**
 * Standardizes text casing (Title Case) for Turkish language.
 */
export const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLocaleLowerCase('tr-TR').split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
  }).join(' ');
}

/**
 * Returns the current Date adjusted to Turkey Time (UTC+3)
 * Useful for server-side calculations where the server is in UTC.
 */
export const getNowTR = (): Date => {
  const now = new Date();
  const trString = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
  return new Date(trString);
}

/**
 * Formats a date string or Date object to Turkish locale format (DD.MM.YYYY).
 * @example formatTRDate('2024-05-21') → '21.05.2024'
 */
export const formatTRDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('tr-TR');
  } catch {
    return String(date);
  }
}

/**
 * Returns a human-readable relative time string in Turkish.
 * @example formatRelativeTR(new Date()) → 'Az önce'
 */
export const formatRelativeTR = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} gün önce`;
    return formatTRDate(d);
  } catch {
    return '';
  }
}

/**
 * Clamps a number between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Appends proper Turkish genitive suffix with apostrophe (e.g. Luna -> Luna'nın, Max -> Max'in, Pamuk -> Pamuk'un).
 */
export const getTurkishGenitive = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
  const lastChar = lower.slice(-1);

  let lastVowel = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      lastVowel = lower[i];
      break;
    }
  }

  const isEndsWithVowel = vowels.includes(lastChar);

  let suffix = '';
  if (['a', 'ı'].includes(lastVowel)) {
    suffix = isEndsWithVowel ? "'nın" : "'ın";
  } else if (['e', 'i'].includes(lastVowel)) {
    suffix = isEndsWithVowel ? "'nin" : "'in";
  } else if (['o', 'u'].includes(lastVowel)) {
    suffix = isEndsWithVowel ? "'nun" : "'un";
  } else if (['ö', 'ü'].includes(lastVowel)) {
    suffix = isEndsWithVowel ? "'nün" : "'ün";
  } else {
    suffix = "'in";
  }

  return `${trimmed}${suffix}`;
};
