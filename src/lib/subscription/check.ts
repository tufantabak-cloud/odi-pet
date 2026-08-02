import { cache } from 'react'
import { getEntitlement } from './entitlement'

export const checkSubscription = cache(async (userId: string): Promise<boolean> => {
  const entitlement = await getEntitlement(userId)
  return entitlement.isPremium
})
