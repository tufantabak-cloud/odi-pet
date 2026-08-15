/**
 * Behavioral Bot Score Mock Function (Module 2)
 * Returns a score between 0 and 100. Lower is more likely a bot.
 */
export async function calculateBotScore(clientId: string, behaviorData: any): Promise<number> {
  // Mock logic: randomly generate a score, but mostly return safe scores.
  return new Promise((resolve) => {
    setTimeout(() => {
      // 90% chance of high score, 10% chance of low score
      const isBot = Math.random() > 0.9;
      resolve(isBot ? Math.floor(Math.random() * 30) : 70 + Math.floor(Math.random() * 30));
    }, 100);
  });
}
