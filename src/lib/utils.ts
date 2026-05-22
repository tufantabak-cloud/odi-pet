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
