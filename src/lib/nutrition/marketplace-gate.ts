export function qualifiesForMarketplaceBeta({
  reminderRequested,
  snoozed,
  escalated,
  dismissed
}: {
  reminderRequested: boolean;
  snoozed: boolean;
  escalated: boolean;
  dismissed: boolean;
}) {
  if (!reminderRequested) return false;
  if (dismissed) return false;

  return snoozed || escalated;
}
