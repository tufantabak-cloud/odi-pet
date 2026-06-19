/**
 * Content Scanning Interface (Module 5)
 * Used to scan text for prohibited content or PII during lost pet reporting.
 */
export interface ScanResult {
  isClean: boolean;
  flaggedWords: string[];
}

export async function scanContentText(text: string): Promise<ScanResult> {
  console.log(`[Content Scanner] Scanning text: ${text.substring(0, 20)}...`);
  // Mock logic
  const forbiddenWords = ['scam', 'reward scam', 'fake'];
  const lowerText = text.toLowerCase();
  
  const flagged = forbiddenWords.filter(word => lowerText.includes(word));
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        isClean: flagged.length === 0,
        flaggedWords: flagged
      });
    }, 150);
  });
}
