export interface PushDeliveryOutcome {
  subscriptionCount: number
  deliveredCount: number
  invalidSubscriptionCount: number
  retryableFailureCount: number
}

export function shouldFinalizePushJob(
  outcome: PushDeliveryOutcome
): boolean {
  if (outcome.subscriptionCount === 0) return true
  if (outcome.deliveredCount > 0) return true
  if (outcome.retryableFailureCount > 0) return false

  return outcome.invalidSubscriptionCount >= outcome.subscriptionCount
}
