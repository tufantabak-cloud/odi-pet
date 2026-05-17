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
