/**
 * Nutrition Refill Engine
 * Core business logic for stock tracking and refill risk prediction.
 * Used by UI banners, notification system, and future auto-refill triggers.
 */

export type RefillRisk = 'OK' | 'WARNING' | 'CRITICAL';

export function calculateRefillRisk({
  stockGrams,
  dailyUsage,
  thresholdDays = 5
}: {
  stockGrams: number;
  dailyUsage: number;
  thresholdDays?: number;
}) {
  const daysLeft = dailyUsage > 0 ? stockGrams / dailyUsage : 0;

  let risk: RefillRisk = 'OK';

  if (daysLeft <= 3) risk = 'CRITICAL';
  else if (daysLeft <= thresholdDays) risk = 'WARNING';

  return {
    daysLeft: Math.round(daysLeft * 10) / 10,
    risk,
    shouldNotify: daysLeft <= 7,
    shouldSuggestRefill: daysLeft <= 5,
    shouldUrgentRefill: daysLeft <= 3
  };
}

export function estimateNextRefillDate({
  stockGrams,
  dailyUsage
}: {
  stockGrams: number;
  dailyUsage: number;
}) {
  const daysLeft = dailyUsage > 0 ? stockGrams / dailyUsage : 0;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + Math.floor(daysLeft));

  return nextDate;
}

/**
 * Compute a simple linear weight trend (slope in kg/week) from an array
 * of weight log entries sorted by measured_at ascending.
 */
export function computeWeightTrend(
  entries: Array<{ measured_at: string; weight_kg: number }>
): number | null {
  if (entries.length < 2) return null

  const points = entries.map((e, i) => ({ x: i, y: Number(e.weight_kg) }))
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Convert "per-entry" slope to kg/week assuming roughly weekly measurements
  return Math.round(slope * 100) / 100
}

/**
 * Generate plain-text insights for the AI placeholder layer.
 */
export function generateInsights({
  avgAppetite7d,
  avgAppetite14d,
  weightTrend,
  daysLeft,
}: {
  avgAppetite7d: number | null
  avgAppetite14d: number | null
  weightTrend: number | null
  daysLeft: number | null
}): string[] {
  const insights: string[] = []

  // Appetite change
  if (avgAppetite7d !== null && avgAppetite14d !== null && avgAppetite14d > 0) {
    const pct = Math.round(((avgAppetite7d - avgAppetite14d) / avgAppetite14d) * 100)
    if (Math.abs(pct) >= 10) {
      insights.push(`Bu hafta iştah %${Math.abs(pct)} ${pct < 0 ? 'düşüş' : 'artış'}`)
    }
  }

  // Stock warning
  if (daysLeft !== null && daysLeft <= 7) {
    insights.push(`Stok yaklaşık ${daysLeft} gün içinde bitecek`)
  }

  // Weight trend
  if (weightTrend !== null && Math.abs(weightTrend) >= 0.05) {
    const dir = weightTrend > 0 ? '+' : ''
    insights.push(`Kilo ${dir}${weightTrend} kg haftalık trend`)
  }

  if (insights.length === 0) {
    insights.push('Geçen hafta beslenme düzeni normal görünüyor 🎉')
  }

  return insights
}
