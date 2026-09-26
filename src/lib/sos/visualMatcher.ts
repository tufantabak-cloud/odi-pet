/**
 * Visual Matcher
 * 
 * Note: The previous mock implementation (select('*').limit(1)) has been decommissioned.
 * Canonical Lost & Found matching, sightings, and notifications are handled via
 * `/api/reports/lost` and `lost_found_notifications`.
 */
export async function matchByImage(_imageUrl: string): Promise<any[]> {
  // Canonical Lost & Found uses /api/reports/lost and lost_found_notifications.
  return [];
}